const db = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateToken } = require('../../utils/jwt');

async function registerUser({ email, password, role }) {
    const hashed = await hashPassword(password);
    const result = await db.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
        [email, hashed, role || 'USER']
    );
    return result.rows[0];
}

async function loginUser(email, password) {
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    const user = result.rows[0];
    if (!user || !(await comparePassword(password, user.password_hash))) {
        throw new Error('Invalid credentials');
    }
    return generateToken({ id: user.id, role: user.role });
}

module.exports = { registerUser, loginUser };
