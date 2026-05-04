/**
 * Shared helpers for Cinematch Playwright tests.
 *
 * mockBackend() intercepts all API calls at the network layer and returns
 * deterministic fixture data. Tests that use it do NOT require a running
 * Python backend and are fully deterministic.
 *
 * Tests in health.spec.js are the only exception — they hit the real backend
 * via APIRequestContext to verify the server is genuinely alive.
 */

const API = process.env.BACKEND_URL || 'http://localhost:8000'

// ── Fixture data ──────────────────────────────────────────────────────────────

const MOVIES = [
  {
    title: 'Inception',
    release_year: 2010,
    vote_average: 8.8,
    overview: 'A thief enters the minds of others to steal secrets.',
    poster_url: null,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
  },
  {
    title: 'The Dark Knight',
    release_year: 2008,
    vote_average: 9.0,
    overview: 'Batman faces the Joker in a battle for Gotham.',
    poster_url: null,
    genres: ['Action', 'Crime', 'Drama'],
  },
]

const RECS = [
  { title: 'Interstellar', score: 0.92, explanations: ['Shared director', 'Sci-fi genre'] },
  { title: 'The Prestige',  score: 0.88, explanations: ['Same director', 'Thriller']     },
]

const MOVIE_DETAIL = {
  title: 'Inception',
  release_year: 2010,
  vote_average: 8.8,
  overview: 'A thief enters the minds of others to steal secrets.',
  genres: ['Action', 'Sci-Fi'],
  // Cast must be an array of strings — the movie detail page maps over it as strings
  cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
  director: 'Christopher Nolan',
  poster_url: null,
}

const PERSON = {
  name: 'Christopher Nolan',
  known_for_department: 'Directing',
  // known_for renders KnownForCard components — each entry needs at least { title }
  known_for: MOVIES.map((m) => ({ title: m.title, poster_url: null })),
  cast_credits: [],
  crew_credits: [],
}

// ── Core mock helper ──────────────────────────────────────────────────────────

/**
 * Intercept all backend API calls and return fixture data.
 * Pass `overrides` to replace specific endpoint responses for a single test.
 *
 * Response shapes match exactly what the FastAPI backend returns so that
 * frontend code (d.data?.movies, d.genres, etc.) works unchanged.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, object>} [overrides]  '/path' → response body
 */
async function mockBackend(page, overrides = {}) {
  // Patterns use **/ prefix so they match regardless of whether the frontend
  // uses localhost or 127.0.0.1 — both resolve to the same backend.
  const defaults = {
    '**/health*':              { status: 'healthy' },
    '**/stats*':               { total_movies: 5000, total_genres: 20, search_types: 2 },
    '**/trending*':            { data: { movies: MOVIES, count: MOVIES.length } },
    '**/genres*':              { genres: ['Action', 'Comedy', 'Drama', 'Thriller', 'Horror'], count: 5 },
    '**/movies*':              { data: { movies: MOVIES, total: MOVIES.length } },
    '**/movie/*':              { movie: MOVIE_DETAIL },
    '**/semantic-search*':     { results: MOVIES, count: MOVIES.length, query: '' },
    '**/search*':              { results: MOVIES, count: MOVIES.length, query: '' },
    // Pin to :8000 so these patterns do NOT match the frontend's /recommendations
    // page URL at localhost:3000 — **/recommend* alone is too broad.
    '**:8000/recommend/watchlist*': { recommendations: RECS, posters: {} },
    '**:8000/recommend*':           { recommendations: RECS, posters: {}, movie: 'Inception', count: RECS.length },
    '**/chat*':                { reply: 'Try Interstellar!', suggested_movies: ['Interstellar'], messages: [] },
    // Wrap in { person: ... } — the people page accesses data.person, not the root
    '**/person/*':             { person: PERSON },
    '**/admin/feature-flags*': { enable_chat: true, enable_recommendations: true },
  }

  const routes = { ...defaults, ...overrides }

  for (const [pattern, body] of Object.entries(routes)) {
    const responseBody = body
    await page.route(pattern, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      })
    })
  }
}

/**
 * Force a path to fail with a network error (simulates the backend being down).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} path  e.g. '/chat' or '/recommend'
 */
async function mockBackendError(page, path) {
  await page.route(`**${path}*`, (route) => route.abort('failed'))
}

/**
 * Force a path to return a specific HTTP status code.
 * Useful for testing rate limits (429) or disabled features (503).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {number} status  e.g. 429, 503
 * @param {object} [body]
 */
async function mockBackendStatus(page, path, status, body = {}) {
  await page.route(`**${path}*`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

module.exports = { mockBackend, mockBackendError, mockBackendStatus, MOVIES, RECS, MOVIE_DETAIL, PERSON, API }
