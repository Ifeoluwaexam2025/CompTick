require('../src/config/env');

if (process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const migrate = require('../src/config/migrate');
const db = require('../src/config/database');

migrate()
    .then(() => console.log('Database migrations are up to date'))
    .catch(error => {
        console.error('Migration failed', { code: error.code, message: error.message });
        process.exitCode = 1;
    })
    .finally(() => db.end());
