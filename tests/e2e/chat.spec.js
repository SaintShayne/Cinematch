/**
 * E2E — Chat clear / reset behavior
 *
 * Covers:
 *  1. Chat panel opens when the FAB is clicked
 *  2. Empty state shows suggestion chips before any messages are sent
 *  3. Sending a message shows a typing indicator then displays the reply
 *  4. Clear button appears after the first message and resets chat to empty state
 *  5. Backend error shows a friendly fallback message instead of crashing
 */
const { test, expect } = require('@playwright/test')
const { mockBackend, mockBackendError } = require('./helpers')

test.describe('Chat – clear and reset behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')
  })

  test('Chat panel opens when user clicks the chat button', async ({ page }) => {
    const fab = page.getByRole('button', { name: /open cinematch chat/i })
    await expect(fab).toBeVisible()
    await fab.click()

    await expect(page.getByText('CineMatch').last()).toBeVisible()
  })

  test('Empty chat state shows suggestion chips before any messages are sent', async ({ page }) => {
    await page.getByRole('button', { name: /open cinematch chat/i }).click()

    await expect(page.getByText(/Ask me anything about movies/i)).toBeVisible()

    const chips = page.locator('button').filter({ hasText: /movies like/i })
    await expect(chips.first()).toBeVisible()
  })

  test('Sending a message shows a typing indicator and then displays the assistant reply', async ({ page }) => {
    await page.getByRole('button', { name: /open cinematch chat/i }).click()

    const chatInput = page.getByPlaceholder(/Ask about movies/i)
    await chatInput.fill('What should I watch tonight?')
    await chatInput.press('Enter')

    await expect(page.getByText('What should I watch tonight?')).toBeVisible()

    // Reply from mock backend
    await expect(page.getByText('Try Interstellar!')).toBeVisible({ timeout: 8_000 })
  })

  test('Clear button appears after the first message and resets chat to empty state', async ({ page }) => {
    await page.getByRole('button', { name: /open cinematch chat/i }).click()

    // Clear button must not exist before any messages
    const clearBtn = page.getByTitle('Clear chat')
    await expect(clearBtn).not.toBeVisible()

    const chatInput = page.getByPlaceholder(/Ask about movies/i)
    await chatInput.fill('Suggest something')
    await chatInput.press('Enter')
    await expect(page.getByText('Try Interstellar!')).toBeVisible({ timeout: 8_000 })

    // Clear button appears only after there are messages
    await expect(clearBtn).toBeVisible()
    await clearBtn.click()

    // Back to empty state
    await expect(page.getByText(/Ask me anything about movies/i)).toBeVisible()
    await expect(page.getByText('Suggest something')).not.toBeVisible()
  })

  test('Backend error shows a friendly fallback message instead of crashing', async ({ page }) => {
    await mockBackendError(page, '/chat')

    await page.getByRole('button', { name: /open cinematch chat/i }).click()

    const chatInput = page.getByPlaceholder(/Ask about movies/i)
    await chatInput.fill('This will fail')
    await chatInput.press('Enter')

    await expect(
      page.getByText(/Sorry, I'm having trouble connecting/i)
    ).toBeVisible({ timeout: 8_000 })
  })
})
