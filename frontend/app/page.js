'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../lib/api'
import SearchBar from '../components/search/SearchBar'
import MoodFilters from '../components/search/MoodFilters'
import MovieGrid from '../components/movie/MovieGrid'
import SectionHeader from '../components/ui/SectionHeader'
import Badge from '../components/ui/Badge'
import { TECH_STACK } from '../lib/constants'
import {
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  deleteRecentSearch,
} from '../lib/recentSearches'

function StatsBar({ stats }) {
  if (!stats) return null

  const items = [
    { label: 'Films', value: stats.total_movies?.toLocaleString() },
    { label: 'Genres', value: stats.total_genres },
    { label: 'Search modes', value: stats.search_types ?? 2 },
    { label: 'Engine', value: 'Hybrid AI' },
  ]

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-text-primary">{item.value}</span>
          <span className="text-xs text-text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(urlQuery)
  const [mode, setMode] = useState('smart')
  const [results, setResults] = useState([])
  const [trending, setTrending] = useState([])
  const [stats, setStats] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [activeQuery, setActiveQuery] = useState(urlQuery)
  const [recentSearches, setRecentSearches] = useState([])

  const runSearch = useCallback(
    async (q, selectedMode) => {
      const trimmed = q.trim()
      if (!trimmed) return

      setSearching(true)
      setSearchError(false)
      setActiveQuery(trimmed)

      try {
        const data =
          selectedMode === 'smart'
            ? await api.semanticSearch(trimmed, 20)
            : await api.search(trimmed, 20)

        setResults(data.results || [])
      } catch {
        setResults([])
        setSearchError(true)
      } finally {
        setSearching(false)
      }
    },
    [] // stable reference — selectedMode is always passed explicitly at every call site
  )

  useEffect(() => {
    Promise.all([
      api.trending(20).then((d) => setTrending(d.data?.movies || [])),
      api.stats().then((d) => setStats(d.stats)),
    ]).finally(() => setLoadingTrending(false))
  }, [])

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  useEffect(() => {
    const trimmed = urlQuery.trim()

    setQuery(urlQuery)

    if (!trimmed) {
      setActiveQuery('')
      setResults([])
      setSearchError(false)
      setSearching(false)
      return
    }

    const updated = saveRecentSearch(trimmed)
    setRecentSearches(updated)

    setMode('smart')
    runSearch(trimmed, 'smart')
  }, [urlQuery, runSearch])

  // Re-run the search when the user switches between Smart / Title mode
  // (activeQuery is intentionally omitted from deps — handled by the URL effect above)
  useEffect(() => {
    if (!activeQuery) return
    runSearch(activeQuery, mode)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Both the search bar submit and mood-chip clicks navigate to the same URL shape
  const navigateToQuery = (q) => {
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/?q=${encodeURIComponent(trimmed)}`)
  }

  const handleRecentSelect = (q) => {
    const updated = saveRecentSearch(q)
    setRecentSearches(updated)
    router.push(`/?q=${encodeURIComponent(q)}`)
  }

  const handleClearRecent = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const handleRemoveRecent = (q) => {
    const updated = deleteRecentSearch(q)
    setRecentSearches(updated)
  }

  const handleMovieSelect = (movie) => {
    router.push(`/recommendations?movie=${encodeURIComponent(movie.title)}`)
  }

  const showResults = !!activeQuery && !searching

  return (
    <div className="space-y-8">
      <div className="relative pt-4">
        <div
          aria-hidden
          className="absolute -top-12 left-1/3 w-80 h-48 bg-red/8 blur-3xl rounded-full pointer-events-none"
        />
        <div className="relative">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-3">
            5,000+ films · AI-powered
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary tracking-tight leading-none mb-2">
            Find your next film.
          </h1>
          <p className="text-base text-text-secondary max-w-lg">
            Describe a vibe, a feeling, or just a title — CineMatch finds the right match.
          </p>
          <StatsBar stats={stats} />
        </div>
      </div>

      <div className="space-y-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={navigateToQuery}
          mode={mode}
          onModeChange={setMode}
          loading={searching}
          autoFocus
          recentSearches={recentSearches}
          onRecentSelect={handleRecentSelect}
          onRecentClear={handleClearRecent}
          onRecentRemove={handleRemoveRecent}
          onViewHistory={() => router.push('/history')}
        />
        <MoodFilters onSelect={navigateToQuery} activeQuery={activeQuery} />
      </div>

      {showResults ? (
        <div>
          <SectionHeader
            title={`Results for "${activeQuery}"`}
            subtitle={
              searchError
                ? 'Search failed — check your connection and try again'
                : `${results.length} film${results.length !== 1 ? 's' : ''} found`
            }
          />
          <MovieGrid
            movies={results}
            loading={searching}
            onSelect={handleMovieSelect}
            emptyTitle={searchError ? 'Search unavailable' : 'No results found'}
            emptyDescription={
              searchError
                ? 'Could not reach the search service. Try again in a moment.'
                : 'Try different keywords or switch to Title Search.'
            }
          />
        </div>
      ) : (
        <div>
          <SectionHeader
            title="Trending now"
            subtitle="Highest-rated films from our library"
          />
          <MovieGrid
            movies={trending}
            loading={loadingTrending}
            onSelect={handleMovieSelect}
          />
        </div>
      )}

      <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <p className="text-2xs text-text-muted mb-3 uppercase tracking-widest font-medium">
          Powered by
        </p>
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((tech) => (
            <Badge key={tech} variant="tech">
              {tech}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  )
}