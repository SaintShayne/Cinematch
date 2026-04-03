'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'
import PageHero from '../../components/layout/PageHero'
import GenreFilter from '../../components/search/GenreFilter'
import MovieGrid from '../../components/movie/MovieGrid'
import SectionHeader from '../../components/ui/SectionHeader'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'

export default function BrowsePage() {
  const router = useRouter()
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [movies, setMovies] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalMovies, setTotalMovies] = useState(0)
  const [loadingGenres, setLoadingGenres] = useState(true)
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [genreError, setGenreError] = useState(false)

  // Load genres on mount
  useEffect(() => {
    api
      .genres()
      .then((d) => {
        const list = d.genres || []
        setGenres(list)
        if (list.length > 0) setSelectedGenre(list[0])
      })
      .catch(() => setGenreError(true))
      .finally(() => setLoadingGenres(false))
  }, [])

  // Load movies when genre or page changes
  useEffect(() => {
    if (!selectedGenre) return
    setLoadingMovies(true)
    api
      .movies(selectedGenre, page, 20)
      .then((d) => {
        // Response shape: { success, data: { movies, total, page, page_size } }
        setMovies(d.data?.movies || [])
        const total = d.data?.total || 0
        setTotalMovies(total)
        setTotalPages(Math.max(1, Math.ceil(total / 20)))
      })
      .catch(() => setMovies([]))
      .finally(() => setLoadingMovies(false))
  }, [selectedGenre, page])

  const handleGenreSelect = (genre) => {
    setSelectedGenre(genre)
    setPage(1)
  }

  const handleMovieSelect = (movie) => {
    router.push(`/recommendations?movie=${encodeURIComponent(movie.title)}`)
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Browse"
        subtitle="Explore films by genre"
      />

      {/* Genre filter */}
      {genreError ? (
        <EmptyState
          icon="⚠️"
          title="Couldn't load genres"
          description="Failed to reach the server. Refresh the page to try again."
          action={
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          }
        />
      ) : (
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-widest mb-3">
            Genre
          </p>
          <GenreFilter
            genres={genres}
            selected={selectedGenre}
            onSelect={handleGenreSelect}
            loading={loadingGenres}
          />
        </div>
      )}

      {/* Movies */}
      {selectedGenre && !genreError && (
        <div>
          <SectionHeader
            title={selectedGenre}
            subtitle={
              loadingMovies
                ? `Page ${page} of ${totalPages}`
                : `${totalMovies} film${totalMovies !== 1 ? 's' : ''} · page ${page} of ${totalPages}`
            }
          />
          <MovieGrid
            movies={movies}
            loading={loadingMovies}
            onSelect={handleMovieSelect}
            emptyTitle="No movies in this genre"
            emptyDescription="Try another genre."
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loadingMovies}
              >
                ← Previous
              </Button>
              <span className="text-xs text-text-muted">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loadingMovies}
              >
                Next →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
