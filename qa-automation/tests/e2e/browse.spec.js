/**
 * TC-032 to TC-035  Browse
 *
 * Verifies genre filtering, movie grid rendering, and pagination controls.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Browse', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
  })

  test('TC-032: Browse page loads with genre filter visible @smoke', async ({ page }) => {
    await page.goto('/browse')

    await expect(page.getByText(/genre/i).first()).toBeVisible()
    // Genre buttons from mock: Action, Comedy, Drama, Thriller, Horror
    await expect(page.getByRole('button', { name: 'Action' })).toBeVisible()
  })

  test('TC-033: Genre filter shows genres returned from the API', async ({ page }) => {
    await page.goto('/browse')

    // All five genres from the mock fixture must render as buttons
    await expect(page.getByRole('button', { name: 'Action' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Comedy' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Drama' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Thriller' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Horror' })).toBeVisible()
  })

  test('TC-034: Selecting a genre triggers a movie fetch and shows results', async ({ page }) => {
    const movieRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/movies')) movieRequests.push(req.url())
    })

    await page.goto('/browse')

    await page.getByRole('button', { name: 'Comedy' }).click()

    // At least one /movies request must have fired
    await page.waitForTimeout(500)
    expect(movieRequests.some((url) => url.includes('/movies'))).toBe(true)

    // Movie cards from the mock fixture must appear
    await expect(page.getByText('Inception').first()).toBeVisible()
  })

  test('TC-035: Pagination controls appear when there are multiple pages', async ({ page }) => {
    // Override **/movies* (must use glob prefix to match the full URL)
    await mockBackend(page, {
      '**/movies*': { data: { movies: [], total: 100 } },
    })

    await page.goto('/browse')

    // Pagination needs a genre to be selected and movies to load first
    await page.getByRole('button', { name: 'Action' }).click()

    // Buttons render as "← Previous" and "Next →" — exact strings avoid matching Next.js Dev Tools
    await expect(page.getByRole('button', { name: 'Next →' })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: '← Previous' })).toBeVisible()
  })
})
