const db = require('../../config/database');

async function insertUser(email, passwordHash) {
    const { rows } = await db.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'USER')
         ON CONFLICT (email) DO NOTHING RETURNING id, email, role`,
        [email, passwordHash]
    );
    return rows[0];
}

async function findLoginAccount(email) {
    const { rows } = await db.query(
        'SELECT id, role, password_hash FROM users WHERE email = $1 AND is_active = TRUE',
        [email]
    );
    return rows[0];
}

async function findActiveActor(id) {
    const { rows } = await db.query(
        'SELECT id, role FROM users WHERE id = $1 AND is_active = TRUE',
        [id]
    );
    return rows[0];
}

module.exports = { insertUser, findLoginAccount, findActiveActor };
