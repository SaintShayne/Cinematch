/**
 * E2E — Search mode switch
 *
 * Covers:
 *  1. Home page renders with Smart Search selected and trending section visible
 *  2. Submitting a query in Smart mode calls /semantic-search and shows results
 *  3. Switching to Title Search with an active query auto-re-runs via /search
 *  4. A failed search shows service-error copy, not the generic no-results message
 */
const { test, expect } = require('@playwright/test')
const { mockBackend, mockBackendError } = require('./helpers')

test.describe('Search – mode switch', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
  })

  test('Home page shows Smart Search mode and trending section by default', async ({ page }) => {
    await page.goto('/')

    const smartBtn = page.getByRole('button', { name: 'Smart Search' })
    await expect(smartBtn).toBeVisible()

    await expect(page.getByText('Trending now')).toBeVisible()
  })

  test('Smart Search submits a semantic query and displays results', async ({ page }) => {
    const searchRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/semantic-search')) searchRequests.push(req.url())
    })

    await page.goto('/')
    await page.getByPlaceholder(/Try "movies like Inception"/i).fill('space movies')
    // exact: true avoids matching "Smart Search" / "Title Search" buttons
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page.getByText(/Results for "space movies"/i)).toBeVisible()

    expect(searchRequests.length).toBe(1)
    expect(searchRequests[0]).toContain('/semantic-search')
  })

  test('Switching to Title Search with an active query re-runs the search via title endpoint', async ({ page }) => {
    const searchHits = { semantic: 0, title: 0 }
    page.on('request', (req) => {
      const url = req.url()
      // else-if is required: /semantic-search URLs contain the substring /search,
      // so a plain includes('/search') check would double-count semantic requests.
      if (url.includes('/semantic-search')) {
        searchHits.semantic++
      } else if (url.includes('/search')) {
        searchHits.title++
      }
    })

    await page.goto('/')
    await page.getByPlaceholder(/Try "movies like Inception"/i).fill('dark films')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByText(/Results for "dark films"/i)).toBeVisible()

    // Switching mode auto-re-runs the active query via the title endpoint
    await page.getByRole('button', { name: 'Title Search' }).click()
    await expect(page.getByText(/Results for "dark films"/i)).toBeVisible()

    expect(searchHits.semantic).toBe(1)
    expect(searchHits.title).toBe(1)
  })

  test('Failed search shows service-error copy, not a generic no-results message', async ({ page }) => {
    await mockBackendError(page, '/semantic-search')
    await mockBackendError(page, '/search')

    await page.goto('/')
    await page.getByPlaceholder(/Try "movies like Inception"/i).fill('broken query')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page.getByText('Search unavailable')).toBeVisible()
    await expect(page.getByText(/Could not reach the search service/i)).toBeVisible()
  })
})
