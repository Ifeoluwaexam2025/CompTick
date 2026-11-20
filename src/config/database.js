const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
    user: env.DB_USER,
    host: env.DB_HOST,
    database: env.DB_NAME,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    connectionTimeoutMillis: 5000
});

pool.on('error', error => {
    console.error('Idle database connection failed', { code: error.code, message: error.message });
});

module.exports = pool;
