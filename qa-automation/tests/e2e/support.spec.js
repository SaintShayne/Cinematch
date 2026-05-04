/**
 * TC-060 to TC-062  Support / Pricing
 *
 * Verifies the support page renders tier cards and correctly guards
 * the checkout button behind a sign-in requirement.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')

test.describe('Support / Pricing', () => {
  test('TC-060: /support page loads and shows pricing tiers @smoke', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/support')

    // At minimum there must be a "Free" and a "Supporter" tier — exact match avoids
    // matching paragraphs that contain "free" or "supporter" as a substring
    await expect(page.getByText('Free', { exact: true })).toBeVisible()
    await expect(page.getByText('Supporter', { exact: true })).toBeVisible()
  })

  test('TC-061: Unauthenticated user sees a sign-in prompt instead of a checkout button', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/support')

    // The "Sign in to support" CTA is the specific sign-in guard for the payment flow
    await expect(page.getByRole('link', { name: 'Sign in to support' })).toBeVisible()
  })

  test('TC-062: Tier feature list items are visible on the support page', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/support')

    // At least one feature list item must be rendered
    const featureItems = page.locator('li, [class*="feature"]')
    await expect(featureItems.first()).toBeVisible()
  })
})
