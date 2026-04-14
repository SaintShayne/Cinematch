// @ts-check
const { defineConfig, devices } = require('@playwright/test')

/**
 * Cinematch Playwright configuration.
 * - Tests live in tests/e2e/
 * - All backend calls (localhost:8000) are mocked per-test via page.route()
 * - Assumes Next.js dev server is running on :3000; starts it automatically
 *   when CI is not set (reuseExistingServer: !CI).
 * - All suites run headless by default.
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'cd frontend && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !!process.env.CI,
    timeout: 120_000,
  },
})
