/**
 * TC-040 to TC-041  People / Cast
 *
 * Verifies that searching for a director or actor returns their filmography.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('People / Cast', () => {
  test('TC-040: Person page loads and shows their movies', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/people/Christopher%20Nolan')

    // Page must render the person's name
    await expect(page.getByText('Christopher Nolan')).toBeVisible({ timeout: 10_000 })
  })

  test('TC-041: Person page lists their associated films', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/people/Christopher%20Nolan')

    // Mock returns Inception and The Dark Knight as their movies
    await expect(page.getByText('Inception')).toBeVisible({ timeout: 10_000 })
  })
})
