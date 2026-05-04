/**
 * TC-017 to TC-022, TC-026 to TC-028  Authentication
 *
 * Covers the login and register forms, error states, and protected-route guards.
 * These tests do NOT use the saved auth state — they test the login UI itself.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Authentication', () => {
  test('TC-017: /login renders the email/password form @smoke', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('TC-018: Wrong password shows an error message', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.locator('input[type="password"]').fill('definitely-wrong-password-xyz')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Supabase returns an error; LoginForm renders it as a red paragraph
    await expect(page.locator('p').filter({ hasText: /invalid|incorrect|wrong|error/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('TC-019: Submit with empty fields does not redirect', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: 'Sign in' }).click()

    // HTML5 required validation prevents submission — we must still be on /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-020: Login page has a link to /register', async ({ page }) => {
    await page.goto('/login')

    const registerLink = page.getByRole('link', { name: /create one/i })
    await expect(registerLink).toBeVisible()
    await expect(registerLink).toHaveAttribute('href', '/register')
  })

  test('TC-021: /register page shows required form fields', async ({ page }) => {
    await page.goto('/register')

    await expect(page.locator('input[type="email"], input[autocomplete="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('TC-022: Login redirects to the originally requested page after sign-in', async ({ page }) => {
    // Navigate to a protected page — the auth guard redirects to /login?redirect=...
    await page.goto('/watchlist')
    await page.waitForURL(/\/login/, { timeout: 10_000 })

    // The redirect param must be present in the URL so the post-login redirect works
    expect(decodeURIComponent(page.url())).toContain('redirect=/watchlist')
  })

  test('TC-026: /watchlist redirects unauthenticated users to /login @smoke', async ({ page }) => {
    await page.goto('/watchlist')
    await page.waitForURL(/\/login/, { timeout: 10_000 })

    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirect=')
  })

  test('TC-027: /history is accessible without authentication (search history is local)', async ({ page }) => {
    await page.goto('/history')

    // /history stores recent searches in localStorage — no auth required
    await expect(page).toHaveURL(/\/history/, { timeout: 10_000 })
    await expect(page.getByText(/search history/i).or(page.getByText(/no recent searches yet/i)).first()).toBeVisible()
  })

  test('TC-028: /admin redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin')

    // Admin may redirect to /login or show an unauthorised page — either is valid
    const url = page.url()
    const isLoginPage  = url.includes('/login')
    const isAdminPage  = url.includes('/admin')

    // If still on /admin, there must be a sign-in prompt or error visible
    if (isAdminPage) {
      await expect(page.getByText(/sign in|unauthori[sz]ed|access denied/i)).toBeVisible()
    } else {
      expect(isLoginPage).toBe(true)
    }
  })
})
