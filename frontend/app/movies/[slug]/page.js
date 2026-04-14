'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/context/AuthContext'
import { useWatchlist } from '../../../lib/hooks/useWatchlist'
import { useRecentlyViewed } from '../../../lib/hooks/useRecentlyViewed'
import RecommendationPanel from '../../../components/movie/RecommendationPanel'
import SectionHeader from '../../../components/ui/SectionHeader'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import { formatRating } from '../../../lib/utils'

function formatRuntime(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function BackLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
    >
      ← Back
    </button>
  )
}

function MovieDetailSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <BackLink onClick={() => router.back()} />
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="w-full sm:w-48 md:w-56 flex-shrink-0">
          <div className="aspect-[2/3] rounded-xl skeleton" />
        </div>
        <div className="flex-1 space-y-4 pt-2">
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-14 rounded-full" />
          </div>
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-4 w-2/5 rounded" />
          <div className="flex gap-3 pt-1">
            <div className="skeleton h-9 w-44 rounded-lg" />
            <div className="skeleton h-9 w-44 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="space-y-2 max-w-2xl">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-4/6 rounded" />
      </div>
    </div>
  )
}

export default function MovieDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const title = decodeURIComponent(slug)

  const { user } = useAuth()
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { trackView } = useRecentlyViewed()

  const [movie, setMovie] = useState(null)
  const [recs, setRecs] = useState([])
  const [recPosters, setRecPosters] = useState({})
  const [loading, setLoading] = useState(true)
  const [recsLoading, setRecsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [saving, setSaving] = useState(false)

  const inWatchlist = isInWatchlist(title)

  useEffect(() => {
    setLoading(true)
    setError(false)
    setImgError(false)
    api.movie(title)
      .then((data) => {
        setMovie(data.movie)
        trackView({ title: data.movie.title, poster_url: data.movie.poster_url })
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [title])

  useEffect(() => {
    setRecsLoading(true)
    api.recommend(title, 6)
      .then((data) => {
        setRecs(data.recommendations || [])
        setRecPosters(data.posters || {})
      })
      .catch(() => setRecs([]))
      .finally(() => setRecsLoading(false))
  }, [title])

  const handleSave = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/movies/${slug}`)}`)
      return
    }
    setSaving(true)
    if (inWatchlist) {
      await removeFromWatchlist(title)
    } else {
      await addToWatchlist({ title, poster_url: movie?.poster_url })
    }
    setSaving(false)
  }

  const handleRecSelect = (recTitle) => {
    router.push(`/movies/${encodeURIComponent(recTitle)}`)
  }

  if (loading) return <MovieDetailSkeleton />

  if (error || !movie) {
    return (
      <div className="space-y-6">
        <BackLink onClick={() => router.back()} />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-4xl">🎬</p>
          <p className="text-text-primary font-semibold">Film not found</p>
          <p className="text-sm text-text-muted">"{title}" isn't in the CineMatch library.</p>
          <Button variant="secondary" onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    )
  }

  const runtime = formatRuntime(movie.runtime)

  return (
    <div className="space-y-10">

      <BackLink onClick={() => router.back()} />

      {/* ── Hero ── */}
      <div className="flex flex-col sm:flex-row gap-8">

        {/* Poster */}
        <div className="w-full sm:w-48 md:w-56 flex-shrink-0">
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            {movie.poster_url && !imgError ? (
              <Image
                src={movie.poster_url}
                alt={movie.title}
                fill
                sizes="(max-width: 640px) 100vw, 224px"
                className="object-cover"
                onError={() => setImgError(true)}
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted opacity-20">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                  <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">

          {/* Title + tagline */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary leading-tight">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="mt-1.5 text-sm italic text-text-muted">{movie.tagline}</p>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
            {movie.release_year && <span>{movie.release_year}</span>}
            {runtime && <span>{runtime}</span>}
            {movie.vote_average > 0 && (
              <span className="text-yellow-400 font-medium">★ {formatRating(movie.vote_average)}</span>
            )}
            {movie.vote_count > 0 && (
              <span className="text-text-muted text-xs">{movie.vote_count.toLocaleString()} votes</span>
            )}
          </div>

          {/* Genres — click to browse that genre */}
          {movie.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((g) => (
                <button
                  key={g}
                  onClick={() => router.push(`/browse?genre=${encodeURIComponent(g)}&page=1`)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <Badge variant="default">{g}</Badge>
                </button>
              ))}
            </div>
          )}

          {/* Director + Cast */}
          <div className="space-y-1.5 text-sm">
            {movie.director && (
              <p>
                <span className="text-text-muted">Director</span>
                <span className="ml-2 text-text-secondary">{movie.director}</span>
              </p>
            )}
            {movie.cast?.length > 0 && (
              <p>
                <span className="text-text-muted">Cast</span>
                <span className="ml-2 text-text-secondary">{movie.cast.join(', ')}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              onClick={() => router.push(`/recommendations?movie=${encodeURIComponent(movie.title)}`)}
            >
              Get Recommendations
            </Button>
            <Button variant="secondary" loading={saving} onClick={handleSave}>
              {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </Button>
            {movie.trailer_url && (
              <a
                href={movie.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red text-white hover:bg-red/80 transition-colors"
              >
                ▶ Watch Trailer
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Overview ── */}
      {movie.overview && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
            Overview
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
            {movie.overview}
          </p>
        </section>
      )}

      {/* ── Similar Films ── */}
      <section>
        <SectionHeader
          title="Similar Films"
          subtitle="Click any film to explore it"
        />
        <RecommendationPanel
          recommendations={recs}
          posters={recPosters}
          loading={recsLoading}
          onSelect={handleRecSelect}
          count={6}
        />
      </section>

    </div>
  )
}
