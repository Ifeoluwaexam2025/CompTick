const request = require('supertest');
const db = require('../setup')();
const app = require('../../src/app');

const user = { email: 'account@example.com', password: 'example-password' };

test('registers USER, keeps the hash private and rejects duplicate accounts', async () => {
    const registration = await request(app).post('/api/auth/register').send({ ...user, role: 'USER' });
    expect(registration.status).toBe(201);
    expect(registration.body).toEqual({ id: expect.any(String), email: user.email, role: 'USER' });
    await request(app).post('/api/auth/register').send(user).expect(409);
});

test.each([
    { ...user, role: 'ADMIN' },
    { ...user, role: null },
    {},
    { ...user, email: 'bad-email' },
    { ...user, password: { value: 'example-password' } },
    { ...user, password: 'short' },
    { ...user, password: 'é'.repeat(37) }
])('rejects malformed or disallowed registration %#', async function (input) {
    await request(app).post('/api/auth/register').send(input).expect(400);
});

test('public registration cannot create an administrator', async () => {
    const email = 'blocked-admin@example.com';
    await request(app).post('/api/auth/register').send({ ...user, email, role: 'ADMIN' }).expect(400);
    expect((await db.query('SELECT id FROM users WHERE email = $1', [email])).rowCount).toBe(0);
});

test('logs in a registered account and rejects incorrect credentials', async () => {
    const account = { ...user, email: 'login@example.com' };
    await request(app).post('/api/auth/register').send(account).expect(201);
    const login = await request(app).post('/api/auth/login').send(account).expect(200);
    expect(login.body).toEqual({ token: expect.any(String) });
    await request(app).post('/api/auth/login').send({ ...account, password: 'wrong-password' })
        .expect(401, { message: 'Invalid credentials' });
    await request(app).post('/api/auth/login').send({ ...account, password: 'x'.repeat(73) })
        .expect(400);
});

test('rejects malformed JSON with a sanitized response', async () => {
    await request(app).post('/api/auth/register').type('json').send('{"password":')
        .expect(400, { message: 'Malformed JSON' });
});
