/**
 * TC-053 to TC-054  History (Search History)
 *
 * The /history page shows the user's recent SEARCH history stored in localStorage.
 * It is NOT auth-protected — it is accessible without logging in.
 *
 * TC-053 verifies the page loads correctly for unauthenticated users.
 * TC-054 verifies a logged-in user can view the same page without being redirected.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

// ── Unauthenticated ───────────────────────────────────────────────────────────
test.describe('History – unauthenticated', () => {
  test('TC-053: /history loads without requiring authentication', async ({ page }) => {
    await page.goto('/history')

    // The page is public — must NOT redirect to login
    await expect(page).toHaveURL(/\/history/, { timeout: 10_000 })

    // Either recent searches or an empty-state must be visible
    const hasHeading = await page.getByText(/search history/i).isVisible()
    const hasEmpty   = await page.getByText(/no recent searches yet/i).isVisible()
    expect(hasHeading || hasEmpty).toBe(true)
  })
})

// ── Authenticated ─────────────────────────────────────────────────────────────
test.describe('History – authenticated', () => {
  test.use({ storageState: 'tests/.auth/user.json' })

  test('TC-054: Logged-in user can view the history page', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/history')

    // Must stay on /history — not redirect to login
    await expect(page).toHaveURL(/\/history/, { timeout: 10_000 })

    // Page header or empty state must be visible
    const hasHeading = await page.getByText(/search history/i).isVisible()
    const hasEmpty   = await page.getByText(/no recent searches yet/i).isVisible()
    expect(hasHeading || hasEmpty).toBe(true)
  })
})
