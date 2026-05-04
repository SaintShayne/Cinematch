/**
 * TC-042 to TC-045  Search
 *
 * Covers Smart Search (semantic) and Title Search (BM25/fuzzy) modes.
 * Verifies that the correct backend endpoint is called for each mode,
 * and that error and empty states render correctly.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend, mockBackendError } = require('./helpers')

test.describe('Search', () => {
  test('TC-042: Smart Search submits a query to /semantic-search @smoke', async ({ page }) => {
    const hits = []
    page.on('request', (req) => {
      if (req.url().includes('/semantic-search')) hits.push(req.url())
    })

    await mockBackend(page)
    await page.goto('/')

    await page.getByPlaceholder(/movies like inception/i).fill('space movies')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page.getByText(/results for "space movies"/i)).toBeVisible()

    expect(hits.length).toBe(1)
    expect(hits[0]).toContain('/semantic-search')
  })

  test('TC-043: Switching to Title Search reruns the active query via /search', async ({ page }) => {
    const hits = { semantic: 0, title: 0 }
    page.on('request', (req) => {
      const url = req.url()
      // else-if required: /semantic-search contains /search as a substring
      if (url.includes('/semantic-search')) {
        hits.semantic++
      } else if (url.includes('/search')) {
        hits.title++
      }
    })

    await mockBackend(page)
    await page.goto('/')

    await page.getByPlaceholder(/movies like inception/i).fill('dark films')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByText(/results for "dark films"/i)).toBeVisible()

    await page.getByRole('button', { name: 'Title Search' }).click()
    await expect(page.getByText(/results for "dark films"/i)).toBeVisible()

    expect(hits.semantic).toBe(1)
    expect(hits.title).toBe(1)
  })

  test('TC-044: Empty search shows the default trending section, not an error', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')

    // The Search button is disabled when input is empty — press Enter instead.
    // The handler exits early for blank input so no navigation occurs.
    await page.getByPlaceholder(/movies like inception/i).press('Enter')

    // Trending section must remain visible — .last() handles SSR hydration where
    // two identical headings briefly coexist (server-rendered + client-rendered)
    await expect(page.getByText(/trending now/i).last()).toBeVisible()
  })

  test('TC-045: Backend error shows "Search unavailable" error state', async ({ page }) => {
    await mockBackend(page)
    await mockBackendError(page, '/semantic-search')
    await mockBackendError(page, '/search')

    await page.goto('/')
    await page.getByPlaceholder(/movies like inception/i).fill('broken query')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(page.getByText('Search unavailable')).toBeVisible()
    await expect(page.getByText(/could not reach the search service/i)).toBeVisible()
  })
})
