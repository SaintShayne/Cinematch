/**
 * TC-008 to TC-010  Backend API Health Checks
 *
 * These tests hit the REAL backend — no mocking, no browser.
 * They prove the server is alive and serving correct data shapes.
 *
 * Run: npm run test:api
 * Requires: BACKEND_URL in .env (default: http://localhost:8000)
 *
 * How to verify this test is actually asserting:
 *   1. Stop the backend.
 *   2. Run: npm run test:api
 *   3. All three tests must FAIL with a connection error.
 *   4. Start the backend and rerun — all must pass.
 */
const { test, expect } = require('@playwright/test')

const API = process.env.BACKEND_URL || 'http://localhost:8000'

test.describe('Backend API Health @smoke', () => {
  test('TC-008: GET /health returns 200 with healthy status', async ({ request }) => {
    const res = await request.get(`${API}/health`)

    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('healthy')
  })

  test('TC-009: GET /stats returns total_movies and total_genres', async ({ request }) => {
    const res = await request.get(`${API}/stats`)

    expect(res.status()).toBe(200)

    const body = await res.json()
    // /stats returns { success: true, stats: { total_movies, total_genres, ... } }
    const stats = body.stats
    expect(typeof stats.total_movies).toBe('number')
    expect(stats.total_movies).toBeGreaterThan(0)
    expect(typeof stats.total_genres).toBe('number')
    expect(stats.total_genres).toBeGreaterThan(0)
  })

  test('TC-010: GET /genres returns a non-empty genre list', async ({ request }) => {
    const res = await request.get(`${API}/genres`)

    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.genres)).toBe(true)
    expect(body.genres.length).toBeGreaterThan(0)
    expect(typeof body.genres[0]).toBe('string')
  })
})
