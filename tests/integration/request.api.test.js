const { randomUUID } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../setup')();
const app = require('../../src/app');
const migrate = require('../../src/config/migrate');
const service = require('../../src/requests/request.service');
const { generateToken } = require('../../src/utils/jwt');

const data = { title: 'Portal access', description: 'Cannot sign in', category: 'ACCESS', priority: 'HIGH' };
let owner;
let other;
let admin;

async function createActor(role) {
    const { rows: [actor] } = await db.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, role',
        [`${randomUUID()}@example.com`, 'unused-test-fixture', role]
    );
    return { ...actor, token: generateToken(actor) };
}

function bearer(actor) {
    return `Bearer ${actor.token}`;
}

async function createRequest(actor = owner) {
    const response = await request(app).post('/api/requests')
        .set('Authorization', bearer(actor)).send(data).expect(201);
    return response.body;
}

function setStatus(id, status, actor = admin, note) {
    return request(app).patch(`/api/requests/${id}/status`)
        .set('Authorization', bearer(actor)).send({ status, note });
}

beforeAll(async () => {
    [owner, other, admin] = await Promise.all([createActor('USER'), createActor('USER'), createActor('ADMIN')]);
});

test('applies migrations repeatedly without losing existing data', async () => {
    await migrate();
    expect((await db.query('SELECT filename FROM schema_migrations')).rows)
        .toEqual([{ filename: '001_create_schema.sql' }]);
    expect((await db.query('SELECT id FROM users')).rowCount).toBe(3);
});

test('requires a valid, unexpired Bearer token', async () => {
    const expired = jwt.sign({ id: owner.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    await request(app).get('/api/requests').expect(401);
    for (const header of ['Bearer invalid', `Basic ${owner.token}`, `Bearer ${expired}`]) {
        await request(app).get('/api/requests').set('Authorization', header).expect(401);
    }
});

test('honors the current database role and active status', async () => {
    const actor = await createActor('ADMIN');
    const item = await createRequest();
    await db.query("UPDATE users SET role = 'USER' WHERE id = $1", [actor.id]);
    await setStatus(item.id, 'IN_PROGRESS', actor).expect(403);
    await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [actor.id]);
    await request(app).get('/api/requests').set('Authorization', bearer(actor)).expect(401);
});

test('creates OPEN requests and only lets their owner edit them', async () => {
    const item = await createRequest();
    expect(item).toMatchObject({ ...data, created_by: owner.id, status: 'OPEN' });
    const edited = { ...data, title: 'Updated title', status: 'RESOLVED', created_by: other.id };
    const url = `/api/requests/${item.id}`;
    await request(app).put(url).set('Authorization', bearer(other)).send(edited).expect(404);
    await request(app).put(url).set('Authorization', bearer(admin)).send(edited).expect(404);
    const response = await request(app).put(url).set('Authorization', bearer(owner)).send(edited).expect(200);
    expect(response.body).toMatchObject({ title: edited.title, status: 'OPEN', created_by: owner.id });
    await setStatus(item.id, 'IN_PROGRESS', owner).expect(403);
    await expect(service.changeStatus(item.id, { status: 'IN_PROGRESS' }, owner))
        .rejects.toMatchObject({ status: 403 });
});

test('validates bodies and request identifiers', async () => {
    for (const body of [{}, { ...data, title: 42 }, { ...data, priority: 'URGENT' }]) {
        await request(app).post('/api/requests').set('Authorization', bearer(owner)).send(body).expect(400);
    }
    await request(app).put('/api/requests/bad-id').set('Authorization', bearer(owner)).send(data).expect(400);
    await setStatus('bad-id', 'IN_PROGRESS').expect(400);
    const id = randomUUID();
    await setStatus(id, 'CLOSED').expect(400);
    await setStatus(id, 'IN_PROGRESS', admin, 42).expect(400);
    await setStatus(id, 'IN_PROGRESS').expect(404);
});

test('paginates deterministically for administrators and limits ordinary users to their own requests', async () => {
    const user = await createActor('USER');
    const first = await createRequest(user);
    const second = await createRequest(user);
    const third = await createRequest(other);
    const sortedIds = [first.id, second.id, third.id].sort().reverse();
    await db.query(
        "UPDATE service_requests SET created_at = '2099-01-01' WHERE id = ANY($1::uuid[])",
        [sortedIds]
    );
    const everyone = await request(app).get('/api/requests?limit=2&page=1')
        .set('Authorization', bearer(admin)).expect(200);
    expect(everyone.body.map(row => row.id)).toEqual(sortedIds.slice(0, 2));
    const next = await request(app).get('/api/requests?limit=1&page=3')
        .set('Authorization', bearer(admin)).expect(200);
    expect(next.body.map(row => row.id)).toEqual(sortedIds.slice(2));
    const mine = await request(app).get('/api/requests?limit=10')
        .set('Authorization', bearer(user)).expect(200);
    expect(mine.body.map(row => row.id)).toEqual(sortedIds.filter(id => id !== third.id));
    for (const query of ['page=0', 'page=1.5', 'limit=-1', 'limit=101', 'limit=1&limit=2', 'page=999999999999999999']) {
        await request(app).get(`/api/requests?${query}`).set('Authorization', bearer(user)).expect(400);
    }
});

test('audits each supported transition and rejects skipped or reversed transitions', async () => {
    const item = await createRequest();
    await setStatus(item.id, 'RESOLVED').expect(409);
    await setStatus(item.id, 'IN_PROGRESS', admin, 'Investigation started').expect(200);
    await setStatus(item.id, 'RESOLVED').expect(200);
    await setStatus(item.id, 'OPEN').expect(409);

    const { rows } = await db.query(
        'SELECT * FROM request_audits WHERE request_id = $1 ORDER BY changed_at, id', [item.id]
    );
    expect(rows).toHaveLength(2);
    expect(rows).toEqual([
        expect.objectContaining({
            request_id: item.id, changed_by: admin.id, old_status: 'OPEN',
            new_status: 'IN_PROGRESS', note: 'Investigation started', changed_at: expect.any(Date)
        }),
        expect.objectContaining({
            request_id: item.id, changed_by: admin.id, old_status: 'IN_PROGRESS',
            new_status: 'RESOLVED', note: '', changed_at: expect.any(Date)
        })
    ]);
});

test('rolls back the status when PostgreSQL rejects the audit insert', async () => {
    const item = await createRequest();
    await db.query("ALTER TABLE request_audits ADD CHECK (note <> 'reject audit')");
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        await setStatus(item.id, 'IN_PROGRESS', admin, 'reject audit')
            .expect(500, { message: 'Internal server error' });
        expect(log).toHaveBeenCalledWith('Unhandled API error', expect.objectContaining({ code: '23514' }));
    } finally {
        log.mockRestore();
    }
    const { rows: [saved] } = await db.query('SELECT status FROM service_requests WHERE id = $1', [item.id]);
    expect(saved.status).toBe('OPEN');
    expect((await db.query('SELECT id FROM request_audits WHERE request_id = $1', [item.id])).rowCount).toBe(0);
    await setStatus(item.id, 'IN_PROGRESS').expect(200);
});

test('allows a single winning transition when two administrators submit the same change', async () => {
    const item = await createRequest();
    const secondAdmin = await createActor('ADMIN');
    const responses = await Promise.all([
        setStatus(item.id, 'IN_PROGRESS'),
        setStatus(item.id, 'IN_PROGRESS', secondAdmin)
    ]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await db.query('SELECT id FROM request_audits WHERE request_id = $1', [item.id])).rowCount).toBe(1);
});

function getAudits(id, actor = admin, query = {}) {
    return request(app).get(`/api/requests/${id}/audits`)
        .set('Authorization', bearer(actor)).query(query);
}

test('returns only the requested audit fields and only for the requested service request', async () => {
    const item = await createRequest();
    const unrelated = await createRequest(other);
    const secondAdmin = await createActor('ADMIN');
    await setStatus(unrelated.id, 'IN_PROGRESS').expect(200);
    await setStatus(item.id, 'IN_PROGRESS', admin, 'Investigation started').expect(200);
    await setStatus(item.id, 'RESOLVED', secondAdmin).expect(200);

    const { rows: [older, newer] } = await db.query(
        'SELECT id, changed_at FROM request_audits WHERE request_id = $1 ORDER BY changed_at, id',
        [item.id]
    );
    await getAudits(item.id).expect(200, [
        {
            id: newer.id,
            old_status: 'IN_PROGRESS',
            new_status: 'RESOLVED',
            changed_at: newer.changed_at.toISOString(),
            changed_by: secondAdmin.id,
            note: ''
        },
        {
            id: older.id,
            old_status: 'OPEN',
            new_status: 'IN_PROGRESS',
            changed_at: older.changed_at.toISOString(),
            changed_by: admin.id,
            note: 'Investigation started'
        }
    ]);
});

test('returns an empty array for an existing request without audit history', async () => {
    const item = await createRequest();
    await getAudits(item.id).expect(200, []);
});

test('rejects an invalid audit request UUID and reports a missing request', async () => {
    await getAudits('bad-id').expect(400, { message: 'Invalid request ID' });
    await getAudits(randomUUID()).expect(404, { message: 'Request not found' });
});

test('requires a valid token and a current administrator role to read audit history', async () => {
    const item = await createRequest();
    const path = `/api/requests/${item.id}/audits`;
    const expired = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    await request(app).get(path).expect(401);
    await request(app).get(path).set('Authorization', 'Bearer invalid').expect(401);
    await request(app).get(path).set('Authorization', `Bearer ${expired}`).expect(401);
    await getAudits(item.id, owner).expect(403);
    await getAudits(item.id, other).expect(403);

    const demoted = await createActor('ADMIN');
    await db.query("UPDATE users SET role = 'USER' WHERE id = $1", [demoted.id]);
    await getAudits(item.id, demoted).expect(403);
    await expect(service.listAudits(item.id, owner, { limit: 10, offset: 0 }))
        .rejects.toMatchObject({ status: 403 });
});

test('paginates audits newest first with descending UUID for equal timestamps', async () => {
    const item = await createRequest();
    const ids = [
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003'
    ];
    await db.query(
        `INSERT INTO request_audits (id, request_id, changed_by, old_status, new_status, changed_at)
         VALUES ($1, $4, $5, 'IN_PROGRESS', 'RESOLVED', '2025-01-02'),
                ($2, $4, $5, 'OPEN', 'IN_PROGRESS', '2025-01-02'),
                ($3, $4, $5, 'OPEN', 'IN_PROGRESS', '2025-01-01')`,
        [...ids, item.id, admin.id]
    );

    const first = await getAudits(item.id, admin, { page: 1, limit: 1 }).expect(200);
    const second = await getAudits(item.id, admin, { page: 2, limit: 1 }).expect(200);
    const third = await getAudits(item.id, admin, { page: 3, limit: 1 }).expect(200);
    expect(first.body.map(audit => audit.id)).toEqual([ids[1]]);
    expect(second.body.map(audit => audit.id)).toEqual([ids[0]]);
    expect(third.body.map(audit => audit.id)).toEqual([ids[2]]);
    expect(third.body[0].note).toBeNull();
    await getAudits(item.id, admin, { page: 4, limit: 1 }).expect(200, []);
});

test('rejects invalid audit pagination and accepts the maximum page size', async () => {
    const item = await createRequest();
    for (const query of [{ page: 0 }, { page: '1.5' }, { limit: 0 }, { limit: 101 }, { limit: [1, 2] }]) {
        await getAudits(item.id, admin, query).expect(400);
    }
    await getAudits(item.id, admin, { limit: 100 }).expect(200, []);
});
