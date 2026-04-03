import { RECENTLY_VIEWED_KEY, MAX_RECENTLY_VIEWED } from './constants'

/**
 * Format a vote average (0–10) as a display string.
 */
export function formatRating(rating) {
  if (!rating && rating !== 0) return '—'
  return Number(rating).toFixed(1)
}

/**
 * Extract a 4-digit year from a date string or return the value as-is.
 */
export function formatYear(dateOrYear) {
  if (!dateOrYear) return ''
  const str = String(dateOrYear)
  if (str.length === 4) return str
  const match = str.match(/\d{4}/)
  return match ? match[0] : ''
}

/**
 * Clamp a match score (0–1) to a display percentage.
 */
export function matchPercent(score) {
  return Math.round(Math.min(Math.max(score * 100, 0), 99))
}

/**
 * Color class for match percentage badge.
 */
export function matchColor(percent) {
  if (percent >= 80) return 'text-green-400'
  if (percent >= 55) return 'text-yellow-400'
  return 'text-text-secondary'
}

/**
 * Truncate a string to maxLength, appending '…' if needed.
 */
export function truncate(str, maxLength = 120) {
  if (!str) return ''
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

/**
 * Persist a recently-viewed entry to localStorage (client only).
 */
export function addToRecentlyViewed(movie) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    const existing = raw ? JSON.parse(raw) : []
    const filtered = existing.filter((m) => m.title !== movie.title)
    const updated = [movie, ...filtered].slice(0, MAX_RECENTLY_VIEWED)
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
  } catch {}
}

/**
 * Read recently-viewed entries from localStorage (client only).
 */
export function getRecentlyViewed() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}


/**
 * Merge class names (simple utility, no clsx dependency needed).
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

