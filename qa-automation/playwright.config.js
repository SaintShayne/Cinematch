// @ts-check
const { defineConfig, devices } = require('@playwright/test')
require('dotenv').config()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:8000'

module.exports = defineConfig({
  testDir: './tests',

  // Never run tests in parallel — avoids race conditions on shared state
  fullyParallel: false,
  workers: 1,

  // Retry flaky tests twice in CI; zero retries locally so failures are obvious
  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['html', { open: 'never' }],  // saved to playwright-report/ — open with: npm run report
    ['list'],                      // real-time output in terminal
  ],

  use: {
    baseURL: FRONTEND_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout:     10_000,   // max time for a single action (click, fill, etc.)
    navigationTimeout: 30_000,   // max time for page.goto() and waitForURL()
  },

  projects: [
    // ── Step 1: Save login session ─────────────────────────────────────────────
    // Runs once before anything that depends on it. Saves session to
    // tests/.auth/user.json which authenticated spec files load via test.use().
    {
      name: 'setup',
      testMatch: '**/auth.setup.js',
    },

    // ── Step 2a: Backend API health checks ─────────────────────────────────────
    // Uses APIRequestContext — no browser launched, very fast (~3 s).
    // Requires the backend to be running (BACKEND_URL).
    {
      name: 'api',
      testMatch: '**/health.spec.js',
    },

    // ── Step 2b: Full E2E — Desktop Chrome (primary) ───────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: '**/e2e/**/*.spec.js',
      testIgnore: '**/health.spec.js',
    },

    // ── Step 2c: Mobile viewport regression check ──────────────────────────────
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      testMatch: '**/e2e/**/*.spec.js',
      testIgnore: '**/health.spec.js',
    },
  ],

  // Start the Next.js dev server automatically if one isn't already running.
  // reuseExistingServer:true means: if port 3000 is already up, skip the start
  // command. This works locally (reuses your npm run dev) and in CI (reuses the
  // server the workflow started before invoking Playwright).
  webServer: {
    command: 'cd ../frontend && npm run dev',
    url: FRONTEND_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})

module.exports.BACKEND_URL = BACKEND_URL
