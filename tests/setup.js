const { randomBytes, randomUUID } = require('node:crypto');
const { resolve } = require('node:path');

process.env.JWT_SECRET = randomBytes(32).toString('hex');

function useTestDatabase() {
    const { error } = require('dotenv').config({ path: resolve(__dirname, '../.env.test') });
    if (error && error.code !== 'ENOENT') throw error;

    const connectionString = process.env.TEST_DATABASE_URL;
    if (!connectionString) {
        throw new Error('Set TEST_DATABASE_URL in .env.test or the shell. See Tests and verification in README.md.');
    }

    const { Pool } = require('pg');
    const schema = `test_${randomUUID().replaceAll('-', '')}`;
    const admin = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
    const pool = new Pool({
        connectionString,
        options: `-c search_path=${schema}`,
        connectionTimeoutMillis: 5000
    });
    jest.doMock('../src/config/database', () => pool);
    const migrate = require('../src/config/migrate');
    let created = false;

    beforeAll(async () => {
        await admin.query(`CREATE SCHEMA "${schema}"`);
        created = true;
        await migrate();
    });

    afterAll(async () => {
        try {
            await pool.end();
            if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
        } finally {
            await admin.end();
        }
    });

    return pool;
}

module.exports = useTestDatabase;
