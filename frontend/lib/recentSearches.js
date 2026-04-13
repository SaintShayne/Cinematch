const RECENT_SEARCHES_KEY = 'cinematch_recent_searches'
const MAX_RECENT_SEARCHES = 8

export function getRecentSearches() {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveRecentSearch(query) {
  if (typeof window === 'undefined') return []

  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) return getRecentSearches()

  const existing = getRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  )

  const updated = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  return updated
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RECENT_SEARCHES_KEY)
}

export function deleteRecentSearch(query) {
  if (typeof window === 'undefined') return []

  const trimmed = query.trim()
  if (!trimmed) return getRecentSearches()

  const updated = getRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  )

  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  return updated
}
