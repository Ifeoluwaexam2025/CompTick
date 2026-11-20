const db = require('./database');

async function withTransaction(work) {
    const client = await db.connect();
    let releaseError;
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            releaseError = rollbackError;
            console.error('Database rollback failed', { code: rollbackError.code });
        }
        throw error;
    } finally {
        client.release(releaseError);
    }
}

module.exports = withTransaction;
