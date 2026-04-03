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
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [mode, setMode] = useState('smart') // 'smart' | 'title'
  const [results, setResults] = useState([])
  const [trending, setTrending] = useState([])
  const [stats, setStats] = useState(null)
  const [searching, setSearching] = useState(false)
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [activeQuery, setActiveQuery] = useState(initialQuery)

  // Load initial data
  useEffect(() => {
    Promise.all([
      api.trending(20).then((d) => setTrending(d.movies || [])),
      api.stats().then(setStats),
    ]).finally(() => setLoadingTrending(false))
  }, [])

  // If URL has ?q= on mount, run that search
  useEffect(() => {
    if (initialQuery) runSearch(initialQuery)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback(
    async (q) => {
      if (!q.trim()) return
      setSearching(true)
      setActiveQuery(q)
      try {
        const data =
          mode === 'smart'
            ? await api.semanticSearch(q, 20)
            : await api.search(q, 20)
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    },
    [mode]
  )

  const handleSearch = (q) => {
    setQuery(q)
    runSearch(q)
  }

  const handleMoodSelect = (q) => {
    setQuery(q)
    runSearch(q)
  }

  const handleMovieSelect = (movie) => {
    router.push(`/recommendations?movie=${encodeURIComponent(movie.title)}`)
  }

  const showResults = activeQuery && !searching

  return (
    <div className="space-y-8">
      {/* Hero */}
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

      {/* Search */}
      <div className="space-y-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          mode={mode}
          onModeChange={setMode}
          loading={searching}
          autoFocus
        />
        <MoodFilters onSelect={handleMoodSelect} activeQuery={activeQuery} />
      </div>

      {/* Results or Trending */}
      {showResults ? (
        <div>
          <SectionHeader
            title={`Results for "${activeQuery}"`}
            subtitle={`${results.length} film${results.length !== 1 ? 's' : ''} found`}
          />
          <MovieGrid
            movies={results}
            loading={searching}
            onSelect={handleMovieSelect}
            emptyTitle="No results found"
            emptyDescription="Try different keywords or switch to Title Search."
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

      {/* Tech stack */}
      <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <p className="text-2xs text-text-muted mb-3 uppercase tracking-widest font-medium">
          Powered by
        </p>
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((tech) => (
            <Badge key={tech} variant="tech">{tech}</Badge>
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
