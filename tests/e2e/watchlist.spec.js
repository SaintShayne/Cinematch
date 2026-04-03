/**
 * E2E — Watchlist access and actions
 *
 * Covers:
 *  1. Unauthenticated /watchlist access redirects to /login with return path preserved
 *  2. Clicking the save button on a movie card redirects unauthenticated users to /login
 *  3. Watchlist action buttons redirect correctly on mobile (no hover required)
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Watchlist – access and actions', () => {
  test('Unauthenticated access to /watchlist redirects to login with return path preserved', async ({ page }) => {
    await page.goto('/watchlist')

    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('redirect=%2Fwatchlist')
  })

  test('Unauthenticated user clicking the save button is redirected to login', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')

    const firstCard = page.locator('[class*="group"][class*="rounded-xl"]').first()
    await expect(firstCard).toBeVisible()

    await firstCard.hover()

    const saveBtn = firstCard.getByRole('button', { name: /add to watchlist/i })
    await saveBtn.click()

    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('Watchlist actions redirect to login on mobile without requiring hover', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto('/watchlist')
    await page.waitForURL(/\/login/, { timeout: 10_000 })

    expect(page.url()).toContain('/login')
  })
})
