/**
 * Regression Guard — State Sync
 *
 * Guards against regressions in cross-component state synchronisation.
 * Each test targets a specific bug class that was previously fixed or is
 * a known fragile interaction between Next.js router and React state.
 *
 * Migrated from tests/e2e/state_sync.spec.js (original Playwright suite).
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Regression – State Sync', () => {
  test('Clicking a recommendation card syncs URL, hero title, and search input simultaneously', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/recommendations?movie=Inception')

    // All three initial sync points must show Inception
    await expect(page.getByText(/films similar to "inception"/i)).toBeVisible()
    await expect(page.getByPlaceholder(/type a movie title/i)).toHaveValue('Inception')

    // Wait for initial recommendation cards before overriding the mock
    const interstellarCard = page.locator('[data-testid="rec-card"]').filter({ hasText: 'Interstellar' })
    await expect(interstellarCard).toBeVisible({ timeout: 10_000 })

    // Override must use **/recommend* (glob prefix) to match the full URL
    await mockBackend(page, {
      '**/recommend*': {
        recommendations: [
          { title: 'Memento', score: 0.85, explanations: ['Same director'] },
        ],
        posters: {},
        movie: 'Interstellar',
        count: 1,
      },
    })

    await interstellarCard.click()

    // All three sync points must update together
    await expect(page.getByText(/films similar to "interstellar"/i)).toBeVisible()
    await expect(page.getByPlaceholder(/type a movie title/i)).toHaveValue('Interstellar')
    await expect(page).toHaveURL(/movie=Interstellar/, { timeout: 5_000 })
  })

  test('Watchlist redirect URL preserves the originating path for post-login return', async ({ page }) => {
    await page.goto('/watchlist')
    await page.waitForURL(/\/login/, { timeout: 10_000 })

    expect(decodeURIComponent(page.url())).toContain('redirect=/watchlist')
  })

  test('Switching genre in Browse resets pagination to page 1', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/browse')

    await page.getByRole('button', { name: 'Comedy' }).click()

    await expect(page.getByText(/page 1 of/i)).toBeVisible()
  })

  test('Search mode switch keeps the results section visible without blank-state regression', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')

    await page.getByPlaceholder(/movies like inception/i).fill('sci-fi drama')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page.getByText(/results for "sci-fi drama"/i)).toBeVisible()

    const subtitle = page.getByText(/film(s)? found/i)
    await expect(subtitle).toBeVisible()

    await page.getByRole('button', { name: 'Title Search' }).click()

    // Results section must still be intact after mode switch
    await expect(page.getByText(/results for "sci-fi drama"/i)).toBeVisible()
    await expect(subtitle).toBeVisible()
  })
})
