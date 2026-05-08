/**
 * Layer 3 — Unit tests for frontend/lib/utils.js
 *
 * WHAT THESE TEST
 *   All seven exported utility functions: formatRating, formatYear,
 *   matchPercent, matchColor, truncate, cn, addToRecentlyViewed,
 *   getRecentlyViewed.
 *
 * WHAT THEY PREVENT
 *   - A null-check removal making formatRating crash on missing data
 *   - matchPercent allowing scores > 99 into the badge
 *   - truncate changing the ellipsis character or default length
 *   - addToRecentlyViewed silently losing the deduplication logic
 *
 * HOW TO MAINTAIN
 *   - When a utility function changes, update the corresponding describe block.
 *   - localStorage is cleared before each test (see __tests__/setup.js).
 *   - Run with: npm test  (or npm run test:watch for live re-runs)
 */

import { describe, it, expect } from 'vitest'
import {
  formatRating,
  formatYear,
  matchPercent,
  matchColor,
  truncate,
  addToRecentlyViewed,
  getRecentlyViewed,
  cn,
} from '../lib/utils'


// ── formatRating ──────────────────────────────────────────────────────────────

describe('formatRating', () => {
  it('rounds a decimal to one decimal place', () => {
    expect(formatRating(7.456)).toBe('7.5')
  })

  it('returns an em-dash for null', () => {
    expect(formatRating(null)).toBe('—')
  })

  it('returns an em-dash for undefined', () => {
    expect(formatRating(undefined)).toBe('—')
  })

  it('handles zero without treating it as falsy', () => {
    // 0 is falsy in JS — the implementation must use `!rating && rating !== 0`
    expect(formatRating(0)).toBe('0.0')
  })

  it('coerces a string number', () => {
    expect(formatRating('8.2')).toBe('8.2')
  })

  it('formats a whole number with one decimal', () => {
    expect(formatRating(8)).toBe('8.0')
  })
})


// ── formatYear ────────────────────────────────────────────────────────────────

describe('formatYear', () => {
  it('extracts a year from a full ISO date string', () => {
    expect(formatYear('2010-07-16')).toBe('2010')
  })

  it('returns a 4-digit string unchanged', () => {
    expect(formatYear('2009')).toBe('2009')
  })

  it('handles a numeric year', () => {
    expect(formatYear(1999)).toBe('1999')
  })

  it('returns empty string for null', () => {
    expect(formatYear(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatYear(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatYear('')).toBe('')
  })
})


// ── matchPercent ──────────────────────────────────────────────────────────────

describe('matchPercent', () => {
  it('converts a mid-range score to a rounded percentage', () => {
    expect(matchPercent(0.5)).toBe(50)
  })

  it('rounds a fractional percent correctly', () => {
    expect(matchPercent(0.756)).toBe(76)
  })

  it('clamps a perfect score (1.0) to 99 — never 100', () => {
    expect(matchPercent(1.0)).toBe(99)
  })

  it('clamps values above 1.0 to 99', () => {
    expect(matchPercent(2.0)).toBe(99)
  })

  it('clamps negative values to 0', () => {
    expect(matchPercent(-0.5)).toBe(0)
  })

  it('handles zero', () => {
    expect(matchPercent(0)).toBe(0)
  })
})


// ── matchColor ────────────────────────────────────────────────────────────────

describe('matchColor', () => {
  it('returns green for 80 and above', () => {
    expect(matchColor(80)).toBe('text-green-400')
    expect(matchColor(95)).toBe('text-green-400')
    expect(matchColor(99)).toBe('text-green-400')
  })

  it('returns yellow for 55–79', () => {
    expect(matchColor(55)).toBe('text-yellow-400')
    expect(matchColor(70)).toBe('text-yellow-400')
    expect(matchColor(79)).toBe('text-yellow-400')
  })

  it('returns secondary colour for 54 and below', () => {
    expect(matchColor(54)).toBe('text-text-secondary')
    expect(matchColor(20)).toBe('text-text-secondary')
    expect(matchColor(0)).toBe('text-text-secondary')
  })
})


// ── truncate ──────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns the string unchanged when within the limit', () => {
    expect(truncate('Hello World', 20)).toBe('Hello World')
  })

  it('truncates and appends the ellipsis character when over the limit', () => {
    expect(truncate('Hello World', 5)).toBe('Hello…')
  })

  it('uses 120 as the default max length', () => {
    const long = 'a'.repeat(121)
    const result = truncate(long)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBe(121) // 120 chars + '…'
  })

  it('does not truncate a string that is exactly at the limit', () => {
    const exact = 'a'.repeat(10)
    expect(truncate(exact, 10)).toBe(exact)
  })

  it('returns empty string for null', () => {
    expect(truncate(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(truncate(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(truncate('')).toBe('')
  })
})


// ── cn ────────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('joins multiple truthy class names with spaces', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('filters out null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar')
  })

  it('filters out undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
  })

  it('filters out false values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar')
  })

  it('filters out empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar')
  })

  it('returns empty string when all args are falsy', () => {
    expect(cn(null, false, undefined, '')).toBe('')
  })

  it('returns empty string with no arguments', () => {
    expect(cn()).toBe('')
  })
})


// ── addToRecentlyViewed + getRecentlyViewed ────────────────────────────────────

describe('addToRecentlyViewed + getRecentlyViewed', () => {
  it('adds a movie entry and retrieves it', () => {
    addToRecentlyViewed({ title: 'Inception', year: '2010' })
    const items = getRecentlyViewed()
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Inception')
  })

  it('places the most recently viewed entry at index 0', () => {
    addToRecentlyViewed({ title: 'Avatar' })
    addToRecentlyViewed({ title: 'Inception' })
    expect(getRecentlyViewed()[0].title).toBe('Inception')
  })

  it('deduplicates by title — re-adding moves entry to front', () => {
    addToRecentlyViewed({ title: 'Avatar' })
    addToRecentlyViewed({ title: 'Inception' })
    addToRecentlyViewed({ title: 'Avatar' })
    const items = getRecentlyViewed()
    expect(items[0].title).toBe('Avatar')
    expect(items.filter((m) => m.title === 'Avatar')).toHaveLength(1)
  })

  it('caps the list at MAX_RECENTLY_VIEWED (10)', () => {
    for (let i = 0; i < 12; i++) {
      addToRecentlyViewed({ title: `Movie ${i}` })
    }
    expect(getRecentlyViewed()).toHaveLength(10)
  })

  it('returns empty array when localStorage is empty', () => {
    expect(getRecentlyViewed()).toEqual([])
  })

  it('preserves all fields of the movie object', () => {
    const movie = { title: 'Titanic', year: '1997', poster: '/img.jpg' }
    addToRecentlyViewed(movie)
    expect(getRecentlyViewed()[0]).toMatchObject(movie)
  })
})
