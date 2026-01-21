const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
    user: env.DB_USER,
    host: env.DB_HOST,
    database: env.DB_NAME,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
});

// If you see "relation 'users' does not exist", ensure:
// 1. You ran migrations on the correct database.
// 2. Your DB_NAME in .env matches the database you migrated.
// 3. Your app is connecting to the correct DB.

module.exports = pool;
