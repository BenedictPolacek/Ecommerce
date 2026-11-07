import { defineConfig, devices } from '@playwright/test';
import { ADMIN, API_PORT, APP_PORT, APP_URL } from './support/env';

/**
 * End-to-end tests run against their own copy of the app, so they never touch the
 * development database or the dev servers on ports 3000/5000:
 * - API on port 5100 with the database ecommerce_db_e2e, reset and seeded on every run
 * - production build of the client, served by `vite preview` on port 3100 (proxies /api)
 * - emails go to Mailpit (docker-compose locally, a service container in CI)
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  // One database for all tests: run them one after another
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    // Traces and screenshots only when something fails (see `npm run report`)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'API',
      cwd: '../Server',
      // Fresh database with the seed data, then the API
      command: 'npm run db:reset && npm start',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        PGDATABASE: 'ecommerce_db_e2e',
        APP_URL,
        JWT_SECRET: 'e2e_only_secret_at_least_32_characters_long',
        // The tests register and log in more often than the auth limiter allows
        RATE_LIMIT_ENABLED: 'false',
        SEED_ADMIN_EMAIL: ADMIN.email,
        SEED_ADMIN_PASSWORD: ADMIN.password,
        SMTP_HOST: 'localhost',
        SMTP_PORT: '1025',
      },
    },
    {
      name: 'Client',
      cwd: '../Client',
      command: `npm run build && npx vite preview --port ${APP_PORT} --strictPort`,
      url: APP_URL,
      reuseExistingServer: !isCI,
      // Includes the production build (tsc + vite), which can take a while on slow machines
      timeout: 300_000,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
