import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The API is reached through the same origin (/api) so the sameSite=strict auth cookies work.
// Locally Vite proxies /api to the Express server; in production a reverse proxy does the same.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Must match APP_URL in Server/.env (email links point here)
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Fail if a test file has no tests or a test was left with .only
    passWithNoTests: false,
    allowOnly: !process.env.CI,
  },
});
