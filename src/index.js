const app = require('./app');
const db = require('./config/database');
const { PORT } = require('./config/env');

async function start() {
    try {
        await db.query(
            'SELECT 1 FROM users CROSS JOIN service_requests CROSS JOIN request_audits LIMIT 0'
        );
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${server.address().port}`);
        });
        server.on('error', async error => {
            console.error('HTTP startup failed', error.message);
            process.exitCode = 1;
            await db.end();
        });
    } catch (error) {
        console.error('Database startup check failed', { code: error.code, message: error.message });
        process.exitCode = 1;
        await db.end();
    }
}

start();
