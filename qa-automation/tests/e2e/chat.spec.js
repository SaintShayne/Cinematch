/**
 * TC-055 to TC-059  Chat
 *
 * Covers the chat widget: opening, empty state, message send/reply,
 * clear button, and backend error handling.
 */
const { test, expect } = require('@playwright/test')
const { mockBackend, mockBackendError } = require('./helpers')

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')
  })

  test('TC-055: Chat FAB button is visible on the homepage @smoke', async ({ page }) => {
    const fab = page.getByRole('button', { name: /open cinematch chat/i })
    await expect(fab).toBeVisible()
  })

  test('TC-056: Opening chat shows the empty state with suggestion chips', async ({ page }) => {
    // dispatchEvent bypasses the hover overlay that intercepts pointer events on mobile
    await page.getByRole('button', { name: /open cinematch chat/i }).dispatchEvent('click')

    await expect(page.getByText(/ask me anything about movies/i)).toBeVisible()

    const chips = page.locator('button').filter({ hasText: /movies like/i })
    await expect(chips.first()).toBeVisible()
  })

  test('TC-057: Sending a message shows a typing indicator then the reply', async ({ page }) => {
    // dispatchEvent bypasses the hover overlay that intercepts pointer events on mobile
    await page.getByRole('button', { name: /open cinematch chat/i }).dispatchEvent('click')

    const input = page.getByPlaceholder(/ask about movies/i)
    await input.fill('What should I watch tonight?')
    await input.press('Enter')

    // The user message must appear immediately
    await expect(page.getByText('What should I watch tonight?')).toBeVisible()

    // The mocked reply must appear
    await expect(page.getByText('Try Interstellar!')).toBeVisible({ timeout: 8_000 })
  })

  test('TC-058: Clear button resets chat to the empty state', async ({ page }) => {
    // dispatchEvent bypasses the hover overlay that intercepts pointer events on mobile
    await page.getByRole('button', { name: /open cinematch chat/i }).dispatchEvent('click')

    // Clear button must not exist before sending any messages
    const clearBtn = page.getByTitle('Clear chat')
    await expect(clearBtn).not.toBeVisible()

    const input = page.getByPlaceholder(/ask about movies/i)
    await input.fill('Suggest something')
    await input.press('Enter')
    await expect(page.getByText('Try Interstellar!')).toBeVisible({ timeout: 8_000 })

    // Clear button must appear after messages exist
    await expect(clearBtn).toBeVisible()
    await clearBtn.click()

    // Back to empty state
    await expect(page.getByText(/ask me anything about movies/i)).toBeVisible()
    await expect(page.getByText('Suggest something')).not.toBeVisible()
  })

  test('TC-059: Backend error shows a friendly fallback message', async ({ page }) => {
    await mockBackendError(page, '/chat')

    // dispatchEvent bypasses the hover overlay that intercepts pointer events on mobile
    await page.getByRole('button', { name: /open cinematch chat/i }).dispatchEvent('click')

    const input = page.getByPlaceholder(/ask about movies/i)
    await input.fill('This will fail')
    await input.press('Enter')

    await expect(
      page.getByText(/sorry, i'm having trouble connecting/i)
    ).toBeVisible({ timeout: 8_000 })
  })
})
