const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const withTransaction = require('./with-transaction');

async function migrate() {
    const directory = path.join(__dirname, '../../migrations');
    const files = (await readdir(directory)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();

    await withTransaction(async client => {
        await client.query('SELECT pg_advisory_xact_lock(194832649)');
        await client.query(
            `CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )`
        );
        const { rows } = await client.query('SELECT filename FROM schema_migrations');
        const applied = new Set(rows.map(row => row.filename));
        for (const file of files) {
            if (applied.has(file)) continue;
            await client.query(await readFile(path.join(directory, file), 'utf8'));
            await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        }
    });
}

module.exports = migrate;
