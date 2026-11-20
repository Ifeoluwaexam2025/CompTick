import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const connectionString = process.env.E2E_DATABASE_URL;
if (!connectionString) {
    console.error('Set E2E_DATABASE_URL to a dedicated local PostgreSQL test database.');
    process.exit(1);
}

const backendRequire = createRequire(new URL('../../package.json', import.meta.url));
const { Pool } = backendRequire('pg');
const bcrypt = backendRequire('bcrypt');
const url = new URL(connectionString);
const schema = `e2e_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
const scoped = new Pool({ connectionString, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
const backend = fileURLToPath(new URL('../../', import.meta.url));
const frontend = fileURLToPath(new URL('../', import.meta.url));

const env = {
    ...process.env,
    DB_HOST: url.hostname,
    DB_PORT: url.port || '5432',
    DB_NAME: decodeURIComponent(url.pathname.slice(1)),
    DB_USER: decodeURIComponent(url.username),
    DB_PASSWORD: decodeURIComponent(url.password),
    PGOPTIONS: `-c search_path=${schema}`,
    PGSSLMODE: url.searchParams.get('sslmode') || process.env.PGSSLMODE,
    JWT_SECRET: randomBytes(32).toString('hex'),
    E2E_ADMIN_EMAIL: 'administrator@comptick.example',
    E2E_ADMIN_PASSWORD: randomBytes(24).toString('hex')
};

function runNpm(args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, env, stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} exited with ${code ?? signal}`)));
    });
}

let created = false;
try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await runNpm(['run', 'migrate'], backend);
    const hash = await bcrypt.hash(env.E2E_ADMIN_PASSWORD, 10);
    await scoped.query("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')",
        [env.E2E_ADMIN_EMAIL, hash]);
    await runNpm(['exec', '--', 'playwright', 'test', ...process.argv.slice(2)], frontend);
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    try {
        await scoped.end();
        if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
        await admin.end();
    }
}
