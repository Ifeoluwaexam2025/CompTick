import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    return {
        plugins: [react()],
        server: {
            proxy: { '/api': env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000' }
        },
        test: { environment: 'jsdom', include: ['tests/**/*.test.tsx'], setupFiles: ['tests/setup.ts'] }
    };
});
