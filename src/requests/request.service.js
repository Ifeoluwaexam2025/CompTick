const db = require('../config/database');

async function createRequest(data, userId) {
    const result = await db.query(
        `INSERT INTO service_requests (title, description, category, priority, status, created_by)
         VALUES ($1, $2, $3, $4, 'OPEN', $5) RETURNING *`,
        [data.title, data.description, data.category, data.priority, userId]
    );
    return result.rows[0];
}

async function updateRequest(id, data, user) {
    // Only owner can update
    const reqRes = await db.query('SELECT * FROM service_requests WHERE id = $1', [id]);
    const request = reqRes.rows[0];
    if (!request || request.created_by !== user.id) throw new Error('Forbidden');
    const result = await db.query(
        `UPDATE service_requests SET title=$1, description=$2, category=$3, priority=$4 WHERE id=$5 RETURNING *`,
        [data.title, data.description, data.category, data.priority, id]
    );
    return result.rows[0];
}

async function changeStatus(id, newStatus, adminId, note) {
    // Only ADMIN can change status, status flow enforced
    const reqRes = await db.query('SELECT * FROM service_requests WHERE id = $1', [id]);
    const request = reqRes.rows[0];
    if (!request) throw new Error('Request not found');
    const validFlow = {
        OPEN: 'IN_PROGRESS',
        IN_PROGRESS: 'RESOLVED'
    };
    if (request.status === 'RESOLVED' || validFlow[request.status] !== newStatus)
        throw new Error('Invalid status transition');
    await db.query(
        'UPDATE service_requests SET status=$1 WHERE id=$2',
        [newStatus, id]
    );
    await db.query(
        `INSERT INTO request_audits (request_id, changed_by, old_status, new_status, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, adminId, request.status, newStatus, note || '']
    );
    const updated = await db.query('SELECT * FROM service_requests WHERE id = $1', [id]);
    return updated.rows[0];
}

async function listRequests(user, page, limit) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM service_requests';
    let params = [];
    if (user.role === 'USER') {
        query += ' WHERE created_by = $1';
        params = [user.id];
    }
    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);
    const result = await db.query(query, params);
    return result.rows;
}

module.exports = { createRequest, updateRequest, changeStatus, listRequests };
