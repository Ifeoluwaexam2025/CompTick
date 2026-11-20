const db = require('../config/database');

async function createRequest({ title, description, category, priority }, userId) {
    const { rows } = await db.query(
        `INSERT INTO service_requests (title, description, category, priority, status, created_by)
         VALUES ($1, $2, $3, $4, 'OPEN', $5) RETURNING *`,
        [title, description, category, priority, userId]
    );
    return rows[0];
}

async function updateOwnedRequest(id, { title, description, category, priority }, userId) {
    const { rows } = await db.query(
        `UPDATE service_requests SET title = $1, description = $2, category = $3, priority = $4
         WHERE id = $5 AND created_by = $6 RETURNING *`,
        [title, description, category, priority, id, userId]
    );
    return rows[0];
}

async function findStatusForUpdate(client, id) {
    const { rows } = await client.query(
        'SELECT status FROM service_requests WHERE id = $1 FOR UPDATE', [id]
    );
    return rows[0];
}

async function updateStatus(client, id, status) {
    const { rows } = await client.query(
        'UPDATE service_requests SET status = $1 WHERE id = $2 RETURNING *', [status, id]
    );
    return rows[0];
}

async function insertAudit(client, id, actorId, oldStatus, status, note) {
    await client.query(
        `INSERT INTO request_audits (request_id, changed_by, old_status, new_status, note, changed_at)
         VALUES ($1, $2, $3, $4, $5, clock_timestamp())`,
        [id, actorId, oldStatus, status, note]
    );
}

async function listRequests({ limit, offset }, ownerId) {
    const orderAndPage = 'ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2';
    const { rows } = ownerId === undefined
        ? await db.query(`SELECT * FROM service_requests ${orderAndPage}`, [limit, offset])
        : await db.query(
            `SELECT * FROM service_requests WHERE created_by = $3 ${orderAndPage}`,
            [limit, offset, ownerId]
        );
    return rows;
}

module.exports = { createRequest, updateOwnedRequest, findStatusForUpdate, updateStatus, insertAudit, listRequests };
