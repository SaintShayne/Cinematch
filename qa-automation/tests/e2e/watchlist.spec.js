/**
 * TC-050 to TC-052  Watchlist
 *
 * TC-050 and TC-052 test unauthenticated behaviour — no saved session needed.
 * TC-051 requires the saved auth session (tests/.auth/user.json).
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

// ── Unauthenticated tests (no auth state) ─────────────────────────────────────
test.describe('Watchlist – unauthenticated', () => {
  test('TC-050: /watchlist redirects unauthenticated users to /login @smoke', async ({ page }) => {
    await page.goto('/watchlist')
    await page.waitForURL(/\/login/, { timeout: 10_000 })

    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirect=%2Fwatchlist')
  })

  test('TC-052: Save button on a movie card redirects unauthenticated users to /login', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')

    // Hover the first movie card to reveal the save button
    const firstCard = page.locator('[class*="group"][class*="rounded-xl"]').first()
    await expect(firstCard).toBeVisible()
    await firstCard.hover()

    const saveBtn = firstCard.getByRole('button', { name: /add to watchlist/i })
    await saveBtn.click()

    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})

// ── Authenticated tests ───────────────────────────────────────────────────────
test.describe('Watchlist – authenticated', () => {
  test.use({ storageState: 'tests/.auth/user.json' })

  test('TC-051: Logged-in user can view their watchlist page', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/watchlist')

    // Must not redirect — must stay on /watchlist
    await expect(page).toHaveURL(/\/watchlist/, { timeout: 10_000 })

    // Wait for the Supabase fetch to complete (spinner to disappear)
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    // Either a list of saved films or an empty-state prompt must be visible.
    // .first() avoids strict-mode error when the user has multiple watchlist items.
    const hasItems = await page.getByRole('button', { name: /remove/i }).first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/your watchlist is empty/i).isVisible().catch(() => false)
    expect(hasItems || hasEmpty).toBe(true)
  })
})
