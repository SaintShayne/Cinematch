/**
 * Auth Setup — runs once before any test that needs a logged-in session.
 *
 * Opens a real browser window and waits for you to sign in via Google OAuth.
 * Once you land on the home page, the session is saved automatically to
 * tests/.auth/user.json and reused by all authenticated tests.
 *
 * Google OAuth cannot be fully automated (Google blocks bots), so this step
 * requires one manual click. You only need to do it once — the saved session
 * lasts until Supabase expires it (typically several days/weeks).
 *
 * Run:
 *   npx playwright test tests/auth.setup.js --project=setup
 */
const { test: setup, expect } = require('@playwright/test')
const path = require('path')
const fs   = require('fs')

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json')

// Use the system's real Chrome (not Playwright's bundled Chromium).
// Google OAuth blocks Playwright's Chromium due to bot detection;
// real Chrome passes that check. --disable-blink-features hides the
// navigator.webdriver flag that Google reads to detect automation.
setup.use({
  headless: false,
  channel: 'chrome',
  launchOptions: {
    args: ['--disable-blink-features=AutomationControlled'],
  },
})

setup('save authenticated session via Google OAuth', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  // If a session file already exists and is non-empty, reuse it.
  // Re-run only when you explicitly want to refresh: delete user.json first.
  if (fs.existsSync(AUTH_FILE) && fs.statSync(AUTH_FILE).size > 100) {
    console.log('\nAuth state already saved — skipping OAuth. Delete tests/.auth/user.json to re-authenticate.\n')
    return
  }

  await page.goto('/login')

  console.log('\n──────────────────────────────────────────────────────')
  console.log('  ACTION REQUIRED')
  console.log('  A browser window has opened at the CineMatch login page.')
  console.log('  Click "Continue with Google" and complete the sign-in.')
  console.log('  This test will save your session automatically once you')
  console.log('  are redirected back to the home page.')
  console.log('──────────────────────────────────────────────────────\n')

  // Wait up to 2 minutes for you to complete the Google OAuth flow.
  // Once you land on "/", the session is captured and saved.
  await page.waitForURL('/', { timeout: 120_000 })
  await expect(page).toHaveURL('/')

  await page.context().storageState({ path: AUTH_FILE })
  console.log(`\nAuth state saved → ${AUTH_FILE}`)
  console.log('You will not need to log in again until the session expires.\n')
})
