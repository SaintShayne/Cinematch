/**
 * Layer 3 — Unit tests for frontend/lib/recentSearches.js
 *
 * WHAT THESE TEST
 *   All four exported functions: getRecentSearches, saveRecentSearch,
 *   clearRecentSearches, deleteRecentSearch.
 *
 * WHAT THEY PREVENT
 *   - saveRecentSearch losing case-insensitive deduplication
 *   - Short/empty strings being saved to the list
 *   - The list growing past MAX_RECENT_SEARCHES (8)
 *   - deleteRecentSearch performing a case-sensitive match and missing entries
 *   - Invalid JSON in localStorage crashing the app (returns [] gracefully)
 *
 * HOW TO MAINTAIN
 *   - localStorage is cleared before each test (see __tests__/setup.js).
 *   - The MAX_RECENT_SEARCHES constant (8) is set in recentSearches.js — if
 *     it changes, update the cap test below.
 *   - Run with: npm test
 */

import { describe, it, expect } from 'vitest'
import {
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  deleteRecentSearch,
} from '../lib/recentSearches'


// ── getRecentSearches ─────────────────────────────────────────────────────────

describe('getRecentSearches', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(getRecentSearches()).toEqual([])
  })

  it('returns stored searches in order', () => {
    localStorage.setItem(
      'cinematch_recent_searches',
      JSON.stringify(['Inception', 'Avatar']),
    )
    expect(getRecentSearches()).toEqual(['Inception', 'Avatar'])
  })

  it('returns empty array when stored JSON is invalid', () => {
    localStorage.setItem('cinematch_recent_searches', 'not-valid-json')
    expect(getRecentSearches()).toEqual([])
  })

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem(
      'cinematch_recent_searches',
      JSON.stringify({ key: 'value' }),
    )
    expect(getRecentSearches()).toEqual([])
  })
})


// ── saveRecentSearch ──────────────────────────────────────────────────────────

describe('saveRecentSearch', () => {
  it('adds a query and returns the updated list', () => {
    const result = saveRecentSearch('Inception')
    expect(result).toContain('Inception')
  })

  it('places the newest query at index 0', () => {
    saveRecentSearch('Avatar')
    saveRecentSearch('Inception')
    expect(getRecentSearches()[0]).toBe('Inception')
  })

  it('deduplicates case-insensitively — matching entry is removed then re-added at front', () => {
    saveRecentSearch('inception')
    saveRecentSearch('Inception')
    const searches = getRecentSearches()
    const matches = searches.filter((q) => q.toLowerCase() === 'inception')
    expect(matches).toHaveLength(1)
    expect(searches[0]).toBe('Inception')
  })

  it('trims leading and trailing whitespace before saving', () => {
    saveRecentSearch('  Avatar  ')
    expect(getRecentSearches()).toContain('Avatar')
    expect(getRecentSearches()).not.toContain('  Avatar  ')
  })

  it('ignores queries shorter than 2 characters', () => {
    saveRecentSearch('a')
    expect(getRecentSearches()).toEqual([])
  })

  it('ignores empty strings', () => {
    saveRecentSearch('')
    expect(getRecentSearches()).toEqual([])
  })

  it('ignores whitespace-only strings (trim → < 2 chars)', () => {
    saveRecentSearch('  ')
    expect(getRecentSearches()).toEqual([])
  })

  it('caps the list at 8 entries', () => {
    for (let i = 0; i < 10; i++) {
      saveRecentSearch(`Unique Movie Title Number ${i}`)
    }
    expect(getRecentSearches()).toHaveLength(8)
  })

  it('most recent query stays at the front after cap is reached', () => {
    for (let i = 0; i < 10; i++) {
      saveRecentSearch(`Movie ${i}`)
    }
    expect(getRecentSearches()[0]).toBe('Movie 9')
  })
})


// ── clearRecentSearches ───────────────────────────────────────────────────────

describe('clearRecentSearches', () => {
  it('empties the list', () => {
    saveRecentSearch('Inception')
    saveRecentSearch('Avatar')
    clearRecentSearches()
    expect(getRecentSearches()).toEqual([])
  })

  it('does not throw when the list is already empty', () => {
    expect(() => clearRecentSearches()).not.toThrow()
  })
})


// ── deleteRecentSearch ────────────────────────────────────────────────────────

describe('deleteRecentSearch', () => {
  it('removes the specified entry from the list', () => {
    saveRecentSearch('Avatar')
    saveRecentSearch('Inception')
    deleteRecentSearch('Avatar')
    expect(getRecentSearches()).not.toContain('Avatar')
    expect(getRecentSearches()).toContain('Inception')
  })

  it('is case-insensitive — deletes regardless of capitalisation', () => {
    saveRecentSearch('Inception')
    deleteRecentSearch('inception')
    expect(getRecentSearches()).not.toContain('Inception')
  })

  it('leaves the list unchanged when the query does not exist', () => {
    saveRecentSearch('Avatar')
    deleteRecentSearch('ZZZNonExistent')
    expect(getRecentSearches()).toContain('Avatar')
    expect(getRecentSearches()).toHaveLength(1)
  })

  it('returns the updated list after deletion', () => {
    saveRecentSearch('Avatar')
    saveRecentSearch('Inception')
    const result = deleteRecentSearch('Avatar')
    expect(result).not.toContain('Avatar')
    expect(result).toContain('Inception')
  })

  it('does not throw when deleting from an empty list', () => {
    expect(() => deleteRecentSearch('Avatar')).not.toThrow()
  })
})
