/**
 * TC-046 to TC-049  Recommendations
 *
 * Covers the movie search autocomplete, recommendation loading,
 * and the click-through flow where selecting a result re-runs the query.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Recommendations', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
  })

  test('TC-046: Recommendations page loads with the search input visible @smoke', async ({ page }) => {
    await page.goto('/recommendations')

    await expect(page.getByPlaceholder(/type a movie title/i)).toBeVisible()
  })

  test('TC-047: Typing 2+ characters shows autocomplete suggestions', async ({ page }) => {
    const searchRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/search')) searchRequests.push(req.url())
    })

    await page.goto('/recommendations')

    await page.getByPlaceholder(/type a movie title/i).fill('Inc')

    // Wait for the debounced /search call (250 ms + network)
    await page.waitForTimeout(600)
    expect(searchRequests.length).toBeGreaterThan(0)

    // Suggestions dropdown must appear
    await expect(page.getByText('Inception')).toBeVisible({ timeout: 5_000 })
  })

  test('TC-048: Selecting a movie from suggestions loads recommendations', async ({ page }) => {
    const recRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/recommend')) recRequests.push(req.url())
    })

    // Navigate with movie in URL — triggers auto-fetch
    await page.goto('/recommendations?movie=Inception')

    await page.waitForTimeout(1_000)
    expect(recRequests.length).toBeGreaterThan(0)

    // Recommendation cards from mock fixture must render
    await expect(page.getByText('Interstellar')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('The Prestige')).toBeVisible()
  })

  test('TC-049: Clicking a recommendation card re-runs the query for that film', async ({ page }) => {
    await page.goto('/recommendations?movie=Inception')

    const interstellarCard = page.locator('[data-testid="rec-card"]').filter({ hasText: 'Interstellar' })
    await expect(interstellarCard).toBeVisible({ timeout: 10_000 })

    // Override must use **/recommend* (glob prefix) to match the full URL
    await mockBackend(page, {
      '**/recommend*': {
        recommendations: [{ title: 'Memento', score: 0.85, explanations: ['Same director'] }],
        posters: {},
        movie: 'Interstellar',
        count: 1,
      },
    })

    await interstellarCard.click()

    // Hero subtitle and search input must update to Interstellar
    await expect(page.getByText(/films similar to "interstellar"/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByPlaceholder(/type a movie title/i)).toHaveValue('Interstellar')
    await expect(page).toHaveURL(/movie=Interstellar/, { timeout: 5_000 })
  })
})
