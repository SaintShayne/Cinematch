/**
 * Shared Playwright helpers for Cinematch E2E tests.
 *
 * All API calls go to http://localhost:8000 (NEXT_PUBLIC_API_URL default).
 * mockBackend() intercepts them and returns fixture data so tests are
 * deterministic and don't require a running Python backend.
 */

const API = 'http://localhost:8000'

const MOVIES = [
  {
    title: 'Inception',
    release_year: 2010,
    vote_average: 8.8,
    overview: 'A thief enters the minds of others.',
    poster_url: null,
  },
  {
    title: 'The Dark Knight',
    release_year: 2008,
    vote_average: 9.0,
    overview: 'Batman vs The Joker.',
    poster_url: null,
  },
]

const RECS = [
  { title: 'Interstellar', score: 0.92, explanations: ['Shared director', 'Sci-fi genre'] },
  { title: 'The Prestige',  score: 0.88, explanations: ['Same director', 'Thriller'] },
]

/**
 * Register route mocks for all backend API calls.
 * Pass overrides to replace specific endpoint responses.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [overrides] key: partial path e.g. '/recommend', value: response body
 */
async function mockBackend(page, overrides = {}) {
  const defaults = {
    '/trending':        { data: { movies: MOVIES, count: MOVIES.length } },
    '/stats':           { total_movies: 5000, total_genres: 20, search_types: 2 },
    '/genres':          { genres: ['Action', 'Comedy', 'Drama'], count: 3 },
    '/search':          { results: MOVIES, count: MOVIES.length, query: '' },
    '/semantic-search': { results: MOVIES, count: MOVIES.length, query: '' },
    '/recommend':       { recommendations: RECS, posters: {}, movie: 'Inception', count: RECS.length },
    '/chat':            { reply: 'Try Interstellar!', suggested_movies: ['Interstellar'], messages: [] },
    '/movies':          { movies: MOVIES, total: MOVIES.length, genre: 'Action', page: 1, page_size: 20 },
  }

  const routes = { ...defaults, ...overrides }

  for (const [path, body] of Object.entries(routes)) {
    const responseBody = body
    await page.route(`${API}${path}*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      })
    })
  }
}

/**
 * Force a specific path to fail (simulate network/server error).
 */
async function mockBackendError(page, path) {
  await page.route(`${API}${path}*`, (route) => route.abort('failed'))
}

module.exports = { mockBackend, mockBackendError, MOVIES, RECS, API }
