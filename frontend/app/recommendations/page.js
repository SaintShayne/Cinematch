'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'
import { useRecentlyViewed } from '../../lib/hooks/useRecentlyViewed'
import PageHero from '../../components/layout/PageHero'
import RecommendationPanel from '../../components/movie/RecommendationPanel'
import SectionHeader from '../../components/ui/SectionHeader'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import { cn, formatYear, formatRating } from '../../lib/utils'

/**
 * Inline autocomplete for movie title lookup.
 * Queries /search on each keystroke (≥2 chars), shows dropdown, calls onSelect when confirmed.
 */
function MovieSearchInput({ onSelect, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Sync if initialValue changes (e.g. from URL param)
  useEffect(() => {
    setQuery(initialValue)
  }, [initialValue])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setSearching(true)
    try {
      const data = await api.search(q.trim(), 8)
      setSuggestions(data.results || [])
      setOpen(true)
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 250)
  }

  const handleSelect = (movie) => {
    setQuery(movie.title)
    setSuggestions([])
    setOpen(false)
    onSelect(movie.title)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setOpen(false)
      if (query.trim()) onSelect(query.trim())
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          {searching ? (
            <span className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin block" />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          )}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Type a movie title… e.g. Inception, Avatar, Dark Knight"
          autoComplete="off"
          className={cn(
            'w-full bg-surface-elevated border border-[rgba(255,255,255,0.1)] rounded-xl',
            'pl-12 pr-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted',
            'transition-colors focus:outline-none focus:border-red/60 focus:bg-surface-high shadow-card'
          )}
        />
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-surface-elevated border border-[rgba(255,255,255,0.1)] rounded-xl shadow-elevated overflow-hidden animate-fade-in">
          {suggestions.map((movie, i) => (
            <button
              key={`${movie.title}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(movie) }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-surface-high transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{movie.title}</p>
                <p className="text-2xs text-text-muted">
                  {formatYear(movie.release_year)}{movie.vote_average ? ` · ★ ${formatRating(movie.vote_average)}` : ''}
                </p>
              </div>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-muted flex-shrink-0">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { trackView } = useRecentlyViewed()

  const initialMovie = searchParams.get('movie') || ''
  const [movieTitle, setMovieTitle] = useState(initialMovie)
  const [recs, setRecs] = useState([])
  const [posters, setPosters] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [count, setCount] = useState(10)

  const fetchRecs = useCallback(async (title, n = 10) => {
    if (!title.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await api.recommend(title, n)
      setRecs(data.recommendations || [])
      setPosters(data.posters || {})
    } catch {
      setError(`Could not find recommendations for "${title}". Check the title and try again.`)
      setRecs([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch if movie is in URL.
  // DEF-002: `count` is intentionally excluded from deps — this effect fires
  // once per unique initialMovie (URL param change). Count-change fetches are
  // handled exclusively by handleCountChange; including count here would fire
  // two API calls every time the user changes the result count.
  useEffect(() => {
    if (initialMovie) {
      setMovieTitle(initialMovie)
      fetchRecs(initialMovie, 10)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMovie, fetchRecs])

  const handleSelect = (title) => {
    setMovieTitle(title)
    router.replace(`/recommendations?movie=${encodeURIComponent(title)}`, { scroll: false })
    fetchRecs(title, count)
  }

  const handleRecSelect = (title) => {
    trackView({ title, poster_url: posters[title] })
    setMovieTitle(title)
    router.replace(`/recommendations?movie=${encodeURIComponent(title)}`, { scroll: false })
    fetchRecs(title, count)
  }

  const handleCountChange = (n) => {
    setCount(n)
    if (movieTitle) fetchRecs(movieTitle, n)
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Recommendations"
        subtitle={
          movieTitle
            ? `Films similar to "${movieTitle}"`
            : 'Find a film to get personalised recommendations'
        }
      />

      {/* Movie search with autocomplete */}
      <div>
        <p className="text-xs text-text-muted mb-3">
          Start typing a title — select from suggestions or press Enter
        </p>
        <MovieSearchInput
          onSelect={handleSelect}
          initialValue={movieTitle}
        />
      </div>

      {/* Count selector */}
      {movieTitle && !error && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">Show</span>
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              onClick={() => handleCountChange(n)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs transition-colors border',
                count === n
                  ? 'bg-red/15 text-red border-red/30'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              )}
            >
              {n}
            </button>
          ))}
          <span className="text-xs text-text-muted">results</span>
        </div>
      )}

      {/* Results */}
      {error ? (
        <EmptyState
          icon="🔍"
          title="No results"
          description={error}
          action={
            <Button variant="secondary" onClick={() => fetchRecs(movieTitle, count)}>
              Try again
            </Button>
          }
        />
      ) : movieTitle ? (
        <div>
          {!loading && recs.length > 0 && (
            <SectionHeader
              title={`${recs.length} recommendations`}
              subtitle="Click any film to get its recommendations"
            />
          )}
          <RecommendationPanel
            recommendations={recs}
            posters={posters}
            loading={loading}
            onSelect={handleRecSelect}
          />
        </div>
      ) : (
        <EmptyState
          icon="✨"
          title="Search for a film"
          description="Type a title above, pick from suggestions, and get AI-powered recommendations instantly."
        />
      )}
    </div>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense>
      <RecommendationsContent />
    </Suspense>
  )
}
