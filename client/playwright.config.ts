import { defineConfig } from '@playwright/test';

const api = 'http://127.0.0.1:4310';
const app = 'http://127.0.0.1:4317';

export default defineConfig({
    testDir: './e2e',
    workers: 1,
    use: { baseURL: app, browserName: 'chromium', trace: 'retain-on-failure' },
    webServer: [
        {
            command: 'npm --prefix .. start',
            url: `${api}/api/health`,
            env: { PORT: '4310' }
        },
        {
            command: 'npm run dev -- --host 127.0.0.1 --port 4317 --strictPort',
            url: app,
            env: { VITE_API_PROXY_TARGET: api, VITE_API_BASE_URL: '' }
        }
    ]
});
