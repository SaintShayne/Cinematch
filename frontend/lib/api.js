const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || path}`)
  }

  return res.json()
}

export const api = {
  // System
  health: () => apiFetch('/health'),
  stats: () => apiFetch('/stats'),

  // Genres
  genres: () => apiFetch('/genres'),

  // Movies
  movies: (genre, page = 1, pageSize = 20) =>
    apiFetch(
      `/movies?genre=${encodeURIComponent(genre)}&page=${page}&page_size=${pageSize}`
    ),

  movie: (title) =>
    apiFetch(`/movie/${encodeURIComponent(title)}`),

  person: (name) =>
    apiFetch(`/person/${encodeURIComponent(name)}`),

  // Search
  search: (query, limit = 20) =>
    apiFetch(
      `/search?query=${encodeURIComponent(query)}&limit=${limit}`
    ),

  semanticSearch: (query, limit = 10) =>
    apiFetch(
      `/semantic-search?query=${encodeURIComponent(query)}&limit=${limit}`
    ),

  // Recommendations
  recommend: (movie, n = 10) =>
    apiFetch(
      `/recommend?movie=${encodeURIComponent(movie)}&n=${n}`
    ),

  watchlistRecs: (titles, n = 12) =>
    apiFetch('/recommend/watchlist', {
      method: 'POST',
      body: JSON.stringify({ titles, n }),
    }),

  // Trending
  trending: (limit = 20) => apiFetch(`/trending?limit=${limit}`),

  // Chat — context_titles are the user's top watchlist/recently-viewed titles
  // used to ground vague recommendations to the CineMatch dataset
  chat: (messages, message, contextTitles = []) =>
    apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, message, context_titles: contextTitles }),
    }),
}
