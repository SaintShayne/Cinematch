/**
 * E2E — Regression Guard: state sync between watchlist, sidebar, and recommendations
 *
 * Covers:
 *  1. Clicking a rec card syncs URL, hero subtitle, and search input simultaneously
 *  2. Watchlist redirect preserves the originating path in the redirect param
 *  3. Browse genre switch resets pagination to page 1
 *  4. Search mode switch keeps the results section intact (no stale/blank state)
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Regression Guard – state sync', () => {
  test('Clicking a recommendation card syncs the URL, hero title, and search input to the new movie', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/recommendations?movie=Inception')

    // All three initial sync points should reflect Inception
    await expect(page.getByText(/Films similar to "Inception"/i)).toBeVisible()
    const searchInput = page.getByPlaceholder(/Type a movie title/i)
    await expect(searchInput).toHaveValue('Inception')

    // Wait for initial recommendation cards to finish loading BEFORE overriding
    // the mock — the initial /recommend fetch is async (fires after React hydration)
    // and must hit the default handler, not the override.
    const interstellarCard = page.locator('[data-testid="rec-card"]').filter({ hasText: 'Interstellar' })
    await expect(interstellarCard).toBeVisible({ timeout: 10_000 })

    // Now safe to install the override for the next fetch (clicking Interstellar)
    await mockBackend(page, {
      '/recommend': {
        recommendations: [
          { title: 'Memento', score: 0.85, explanations: ['Same director'] },
        ],
        posters: {},
        movie: 'Interstellar',
        count: 1,
      },
    })

    await interstellarCard.click()

    // All three sync points must update to Interstellar.
    // Use toHaveURL() (auto-waits) instead of synchronous page.url() —
    // Next.js router.replace() is async and the URL may lag React state.
    await expect(page.getByText(/Films similar to "Interstellar"/i)).toBeVisible()
    await expect(searchInput).toHaveValue('Interstellar')
    await expect(page).toHaveURL(/movie=Interstellar/, { timeout: 5_000 })
  })

  test('Watchlist redirect URL preserves the originating page path for post-login return', async ({ page }) => {
    await page.goto('/watchlist')
    await page.waitForURL(/\/login/, { timeout: 10_000 })

    expect(decodeURIComponent(page.url())).toContain('redirect=/watchlist')
  })

  test('Switching genre in Browse resets pagination to page 1', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/browse')

    const comedyBtn = page.getByRole('button', { name: 'Comedy' })
    await comedyBtn.click()

    // After a genre switch the subtitle must show page 1
    await expect(page.getByText(/page 1 of/i)).toBeVisible()
  })

  test('Search mode switch keeps the results section and count visible without regression', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')

    await page.getByPlaceholder(/Try "movies like Inception"/i).fill('sci-fi drama')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page.getByText(/Results for "sci-fi drama"/i)).toBeVisible()

    // Film count subtitle must be present in Smart mode
    const subtitle = page.getByText(/film(s)? found/i)
    await expect(subtitle).toBeVisible()

    // Switch mode — results section must remain intact
    await page.getByRole('button', { name: 'Title Search' }).click()

    await expect(page.getByText(/Results for "sci-fi drama"/i)).toBeVisible()
    await expect(subtitle).toBeVisible()
  })
})
