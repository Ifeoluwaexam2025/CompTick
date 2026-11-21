const { Pool } = require('pg');
const env = require('./env');

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const isNeon = databaseUrl?.hostname.endsWith('.neon.tech');
if (isNeon && databaseUrl.searchParams.get('sslmode') === 'require') {
    // Preserve hostname verification explicitly across pg SSL mode changes.
    databaseUrl.searchParams.set('sslmode', 'verify-full');
}
const connection = databaseUrl ? {
    connectionString: databaseUrl.toString(),
    enableChannelBinding: isNeon
} : {
    user: env.DB_USER,
    host: env.DB_HOST,
    database: env.DB_NAME,
    password: env.DB_PASSWORD,
    port: env.DB_PORT
};

const pool = new Pool({ ...connection, connectionTimeoutMillis: databaseUrl ? 15000 : 5000 });

pool.on('error', error => {
    console.error('Idle database connection failed', { code: error.code, message: error.message });
});

module.exports = pool;
