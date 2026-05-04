/**
 * TC-011 to TC-016  Homepage
 *
 * Verifies the homepage renders correctly: layout, search bar, trending section,
 * navigation links, and search mode toggle.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Homepage @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')
  })

  test('TC-011: Page title contains CineMatch', async ({ page }) => {
    await expect(page).toHaveTitle(/cinematch/i)
  })

  test('TC-012: Sidebar navigation links are present', async ({ page }) => {
    // Hamburger button uses aria-label="Open navigation" (not "menu")
    const hamburger = page.getByRole('button', { name: /open navigation/i })
    if (await hamburger.isVisible()) await hamburger.click()

    await expect(page.getByRole('link', { name: 'Browse' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Recommendations' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Watchlist' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'History' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible()
  })

  test('TC-013: Trending section shows movie cards', async ({ page }) => {
    await expect(page.getByText(/trending now/i).last()).toBeVisible()
    await expect(page.getByText('Inception').first()).toBeVisible()
    await expect(page.getByText('The Dark Knight').first()).toBeVisible()
  })

  test('TC-014: Search bar accepts input', async ({ page }) => {
    // .last() handles SSR hydration where two identical inputs briefly coexist;
    // the client-rendered one (last) has autofocus and is the visible element.
    const input = page.getByPlaceholder(/movies like inception/i).last()
    await expect(input).toBeVisible()
    await input.fill('dark thriller')
    await expect(input).toHaveValue('dark thriller')
  })

  test('TC-015: Smart Search and Title Search mode buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Smart Search' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Title Search' })).toBeVisible()
  })

  test('TC-016: CineMatch brand logo links to home', async ({ page }) => {
    const logo = page.getByRole('link', { name: /cinematch/i }).first()
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAttribute('href', '/')
  })
})
