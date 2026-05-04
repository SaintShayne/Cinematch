/**
 * TC-094 to TC-097  Feature Flags
 *
 * These tests call the REAL backend (no browser mocking) to verify that the
 * enable_chat and enable_recommendations flags actually gate their endpoints.
 *
 * They are skipped automatically when the backend is not reachable so that
 * running test:e2e without a local backend does not produce false failures.
 *
 * To run these in isolation with a live backend:
 *   npx playwright test tests/e2e/feature-flags.spec.js --project=chromium
 */
const { test, expect } = require('@playwright/test')

const API = process.env.BACKEND_URL || 'http://localhost:8000'

// ── Check backend availability once for the whole suite ───────────────────────
let backendUp = false

test.describe('Feature Flags', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${API}/health`, { timeout: 5_000 })
      backendUp = res.status() === 200
    } catch {
      backendUp = false
    }
  })

  test.beforeEach(async () => {
    if (!backendUp) {
      test.skip(true, 'Backend not reachable — skipping feature flag tests')
    }
  })

  test('TC-094: /admin/feature-flags API returns enable_chat and enable_recommendations', async ({ request }) => {
    const res = await request.get(`${API}/admin/feature-flags`)

    expect(res.status()).toBe(200)

    const body = await res.json()
    // API returns { ok: true, flags: { enable_chat, enable_recommendations } }
    expect(typeof body.flags.enable_chat).toBe('boolean')
    expect(typeof body.flags.enable_recommendations).toBe('boolean')
  })

  test('TC-095: When recommendations are disabled the /recommend endpoint returns 503', async ({ request }) => {
    // Disable recommendations via the admin API
    // Backend expects { flag: "...", enabled: bool } — not { flagName: bool }
    await request.post(`${API}/admin/feature-flags`, {
      data: { flag: 'enable_recommendations', enabled: false },
      headers: { Cookie: 'cinematch_dev_admin=dev-token' },
    })

    const res = await request.get(`${API}/recommend?movie=Inception&n=5`)
    expect(res.status()).toBe(503)

    // Re-enable so this test does not affect others
    await request.post(`${API}/admin/feature-flags`, {
      data: { flag: 'enable_recommendations', enabled: true },
      headers: { Cookie: 'cinematch_dev_admin=dev-token' },
    })
  })

  test('TC-096: When chat is disabled the /chat endpoint returns 503', async ({ request }) => {
    await request.post(`${API}/admin/feature-flags`, {
      data: { flag: 'enable_chat', enabled: false },
      headers: { Cookie: 'cinematch_dev_admin=dev-token' },
    })

    const res = await request.post(`${API}/chat`, {
      data: { messages: [], message: 'hello', context_titles: [] },
    })
    expect(res.status()).toBe(503)

    await request.post(`${API}/admin/feature-flags`, {
      data: { flag: 'enable_chat', enabled: true },
      headers: { Cookie: 'cinematch_dev_admin=dev-token' },
    })
  })

  test('TC-097: Re-enabling a feature flag restores 200 responses', async ({ request }) => {
    // Ensure recommendations are enabled (reset state)
    await request.post(`${API}/admin/feature-flags`, {
      data: { flag: 'enable_recommendations', enabled: true },
      headers: { Cookie: 'cinematch_dev_admin=dev-token' },
    })

    const res = await request.get(`${API}/recommend?movie=Inception&n=5`)
    expect([200, 400]).toContain(res.status()) // 400 if "Inception" is not in the dataset
  })
})
