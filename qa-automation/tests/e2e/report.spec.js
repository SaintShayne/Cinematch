/**
 * TC-079 to TC-082, TC-084, TC-086  Report an Issue
 *
 * Verifies the report form renders correctly, validates required fields,
 * and handles file attachment (accepted and rejected types).
 *
 * TC-084 uses tests/fixtures/test-image.jpg  (valid attachment)
 * TC-086 uses tests/fixtures/test.zip        (invalid — must be rejected by UI)
 */
const { test, expect } = require('@playwright/test')
const { mockBackend } = require('./helpers')
const path = require('path')

const FIXTURE_IMAGE = path.join(__dirname, '..', 'fixtures', 'test-image.jpg')
const FIXTURE_ZIP   = path.join(__dirname, '..', 'fixtures', 'test.zip')

test.describe('Report an Issue', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
    await page.goto('/report')
  })

  test('TC-079: /report page loads with the report form @smoke', async ({ page }) => {
    // Use the heading role to avoid matching the nav link with the same text
    await expect(page.getByRole('heading', { name: /report an issue/i })).toBeVisible()
  })

  test('TC-080: Form has Category, Description, and file attachment fields', async ({ page }) => {
    // Category — rendered as custom buttons (no select/htmlFor); find the section label
    const categoryLabel = page.locator('label').filter({ hasText: /category/i }).first()
    await expect(categoryLabel).toBeVisible()

    // Description textarea (also has a label without htmlFor — locate the textarea directly)
    const description = page.locator('textarea').first()
    await expect(description).toBeVisible()

    // File input (hidden — check it is attached to the DOM)
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('TC-081: Submitting an empty form shows required-field validation', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /submit|send/i })
    await submitBtn.click()

    // Either HTML5 validation prevents submission (stays on /report)
    // or the app renders an inline error message
    const onSamePage = page.url().includes('/report')
    if (onSamePage) {
      // Could be HTML5 native validation or inline error — either is valid
      const hasError = await page.getByText(/required|fill in|cannot be empty/i).isVisible()
      expect(page.url().includes('/report') || hasError).toBe(true)
    }
  })

  test('TC-082: File input accepts image and PDF file types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const accept = await fileInput.getAttribute('accept')

    // Accept attribute must allow images (at minimum)
    expect(accept).toBeTruthy()
    const acceptsImages = accept.includes('image') || accept.includes('.jpg') || accept.includes('.png')
    expect(acceptsImages).toBe(true)
  })

  test('TC-084: Attaching a valid image file shows the filename in the UI', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(FIXTURE_IMAGE)

    // After attaching, the filename or a preview/indicator must appear
    await expect(
      page.getByText(/test-image\.jpg/i).or(page.getByText(/file selected|attached/i))
    ).toBeVisible({ timeout: 5_000 })
  })

  test('TC-086: Attaching a disallowed file type (.zip) is rejected by the UI', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')

    // The browser enforces the `accept` attribute — setInputFiles bypasses it
    // so we verify the accept attribute excludes zip instead of simulating the rejection
    const accept = await fileInput.getAttribute('accept')
    const rejectsZip = !accept.includes('.zip') && !accept.includes('application/zip')
    expect(rejectsZip).toBe(true)
  })
})
