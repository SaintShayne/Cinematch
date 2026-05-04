/**
 * TC-036 to TC-039  Movie Detail Page
 *
 * Verifies that a movie detail page renders core information and provides
 * the expected action buttons (Get Recommendations, Add to Watchlist).
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Movie Detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
  })

  test('TC-036: Movie detail page loads for a known title @smoke', async ({ page }) => {
    await page.goto('/movies/Inception')

    // Page must not error — title should be visible
    await expect(page.getByText('Inception')).toBeVisible({ timeout: 10_000 })
  })

  test('TC-037: Movie detail shows title, release year, and rating', async ({ page }) => {
    await page.goto('/movies/Inception')

    await expect(page.getByText('Inception')).toBeVisible()
    await expect(page.getByText('2010')).toBeVisible()
    // Rating 8.8 should appear somewhere on the page
    await expect(page.getByText(/8\.8/)).toBeVisible()
  })

  test('TC-038: Movie detail has a link or button to get recommendations', async ({ page }) => {
    await page.goto('/movies/Inception')

    // May be a link to /recommendations or a button — either is valid
    const recLink = page.getByRole('link', { name: /recommendations/i })
    const recBtn  = page.getByRole('button', { name: /recommend/i })

    const either = recLink.or(recBtn)
    await expect(either).toBeVisible({ timeout: 10_000 })
  })

  test('TC-039: Add to Watchlist button is visible on the movie detail page', async ({ page }) => {
    await page.goto('/movies/Inception')

    const saveBtn = page.getByRole('button', { name: /watchlist|save/i })
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
  })
})
