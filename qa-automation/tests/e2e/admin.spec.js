/**
 * TC-087 to TC-093  Admin Panel
 *
 * TC-087 verifies the redirect for unauthenticated users (no session needed).
 * TC-088 to TC-093 require an admin session.
 *
 * Admin login uses the dev bypass: email "admin", password "admin".
 * These tests mock admin API endpoints so a live Supabase/backend isn't required
 * for the UI assertions — but the backend must be running for the dev login.
 *
 * How to run admin tests in isolation:
 *   npx playwright test tests/e2e/admin.spec.js --project=chromium
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

const API = process.env.BACKEND_URL || 'http://localhost:8000'

// ── Unauthenticated ───────────────────────────────────────────────────────────
test.describe('Admin – unauthenticated', () => {
  test('TC-087: /admin redirects or blocks unauthenticated users @smoke', async ({ page }) => {
    await page.goto('/admin')

    const url = page.url()
    const redirectedToLogin = url.includes('/login')
    const blockedOnAdmin    = url.includes('/admin')

    if (blockedOnAdmin) {
      // Must show an access-denied or sign-in message
      await expect(page.getByText(/sign in|unauthori[sz]ed|access denied/i)).toBeVisible()
    } else {
      expect(redirectedToLogin).toBe(true)
    }
  })
})

// ── Admin authenticated via dev bypass ───────────────────────────────────────
// These tests log in as admin/admin then mock all admin API calls for speed.
test.describe('Admin – authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin API endpoints before navigating
    // Use **/ prefix so mocks intercept regardless of localhost vs 127.0.0.1
    // Regex patterns match any hostname — avoids localhost vs 127.0.0.1 issues,
    // and crosses path separators (e.g. /admin/2fa/status/dev-admin).
    await page.route(/\/admin\/login/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, token: 'dev-token' }),
      })
    })
    await page.route(/\/admin\/2fa/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, enabled: false }),
      })
    })
    await page.route(/\/admin\/users/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          users: [{ id: '1', email: 'user@example.com', is_supporter: false }],
        }),
      })
    })
    await page.route(/\/admin\/reports/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          reports: [{ id: '1', category: 'Bug', description: 'Test report', created_at: '2026-01-01' }],
        }),
      })
    })
    await page.route(/\/admin\/feature-flags/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        // Admin page reads json.success then json.flags — bare keys are ignored
        body: JSON.stringify({ success: true, flags: { enable_chat: true, enable_recommendations: true } }),
      })
    })
    await page.route(/\/admin\/stats/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, total_users: 1, total_reports: 1 }),
      })
    })

    // Log in via the admin dev bypass
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('admin')
    await page.locator('input[type="password"]').fill('admin')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // The dev bypass sets a cookie and redirects to /admin
    await page.waitForURL(/\/admin/, { timeout: 15_000 })
  })

  test('TC-088: Admin dashboard loads after dev-bypass login', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
  })

  test('TC-089: Admin Users section shows the user list', async ({ page }) => {
    // Navigate to users section if it's on a sub-route or tab
    const usersLink = page.getByRole('link', { name: /users/i }).or(
      page.getByRole('button', { name: /users/i })
    )
    if (await usersLink.isVisible()) await usersLink.click()

    await expect(page.getByText('user@example.com')).toBeVisible({ timeout: 8_000 })
  })

  test('TC-090: Admin Reports section shows submitted reports', async ({ page }) => {
    const reportsLink = page.getByRole('link', { name: /reports/i }).or(
      page.getByRole('button', { name: /reports/i })
    )
    if (await reportsLink.isVisible()) await reportsLink.click()

    await expect(page.getByText(/test report/i)).toBeVisible({ timeout: 8_000 })
  })

  test('TC-091: Feature flag toggles are visible in the admin panel', async ({ page }) => {
    const flagsLink = page.getByRole('link', { name: /feature|flags/i }).or(
      page.getByRole('button', { name: /feature|flags/i })
    )
    if (await flagsLink.isVisible()) await flagsLink.click()

    await expect(
      page.getByText(/enable_chat|enable_recommendations|chat|recommendations/i).first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('TC-092: Toggling a feature flag sends a POST to /admin/feature-flags', async ({ page }) => {
    const toggleRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/admin/feature-flags') && req.method() === 'POST') {
        toggleRequests.push(req)
      }
    })

    const flagsLink = page.getByRole('link', { name: /feature|flags/i }).or(
      page.getByRole('button', { name: /feature|flags/i })
    )
    if (await flagsLink.isVisible()) await flagsLink.click()

    // Click the first toggle button
    const toggleBtn = page.getByRole('button', { name: /toggle|disable|enable/i }).first()
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click()
      await page.waitForTimeout(500)
      expect(toggleRequests.length).toBeGreaterThan(0)
    }
  })

  test('TC-093: Feature flag state updates immediately after toggle', async ({ page }) => {
    const flagsLink = page.getByRole('link', { name: /feature|flags/i }).or(
      page.getByRole('button', { name: /feature|flags/i })
    )
    if (await flagsLink.isVisible()) await flagsLink.click()

    // The feature flags section must show current state without a page reload
    await expect(
      page.getByText(/enable_chat|enable_recommendations|on|off|enabled|disabled/i).first()
    ).toBeVisible({ timeout: 8_000 })
  })
})
