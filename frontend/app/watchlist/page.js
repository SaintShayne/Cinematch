'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '../../components/auth/AuthGuard'
import PageHero from '../../components/layout/PageHero'
import SectionHeader from '../../components/ui/SectionHeader'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import RecommendationPanel from '../../components/movie/RecommendationPanel'
import { useWatchlist } from '../../lib/hooks/useWatchlist'
import { api } from '../../lib/api'

function WatchlistCard({ item, onGetRecs, onRemove, onNavigate }) {
  const [imgError, setImgError] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    setRemoving(true)
    await onRemove(item.movie_id)
    setRemoving(false)
  }

  return (
    <div
      onClick={onNavigate}
      className="flex items-center gap-4 p-3 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-colors group cursor-pointer"
    >
      {/* Poster thumbnail */}
      <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden bg-surface">
        {item.poster_url && !imgError ? (
          <Image
            src={item.poster_url}
            alt={item.movie_title}
            fill
            sizes="48px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted opacity-30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {item.movie_title}
        </p>
        <p className="text-2xs text-text-muted mt-0.5">
          Added {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Actions — always visible on mobile, hover-reveal on desktop */}
      {/* stopPropagation prevents card onClick from firing when buttons are clicked */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onGetRecs(item.movie_title)}
        >
          Get Recs
        </Button>
        <Button
          size="sm"
          variant="danger"
          loading={removing}
          onClick={handleRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}

function WatchlistContent() {
  const router = useRouter()
  const { watchlist, loading, removeFromWatchlist } = useWatchlist()

  const [recs, setRecs] = useState([])
  const [recPosters, setRecPosters] = useState({})
  const [recsLoading, setRecsLoading] = useState(false)

  // Fetch personalised recs once the watchlist is loaded and non-empty.
  // Re-runs whenever the watchlist changes (add/remove).
  useEffect(() => {
    if (loading || watchlist.length === 0) return
    setRecsLoading(true)
    const titles = watchlist.map((item) => item.movie_title)
    api.watchlistRecs(titles, 12)
      .then((data) => {
        setRecs(data.recommendations || [])
        setRecPosters(data.posters || {})
      })
      .catch(() => setRecs([]))
      .finally(() => setRecsLoading(false))
  }, [watchlist, loading])

  const handleRecSelect = (recTitle) => {
    router.push(`/movies/${encodeURIComponent(recTitle)}`)
  }

  const handleGetRecs = (title) => {
    router.push(`/recommendations?movie=${encodeURIComponent(title)}`)
  }

  if (loading) {
    return <LoadingState message="Loading your watchlist…" />
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Your Watchlist"
        subtitle={
          watchlist.length > 0
            ? `${watchlist.length} film${watchlist.length !== 1 ? 's' : ''} saved`
            : 'Films you want to watch'
        }
      />

      {watchlist.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="Your watchlist is empty"
          description="Browse films and click the bookmark icon to save them here."
          action={
            <Button onClick={() => router.push('/browse')}>
              Browse Films
            </Button>
          }
        />
      ) : (
        <>
          <div>
            <SectionHeader
              title="Saved films"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push('/browse')}
                >
                  Add more
                </Button>
              }
            />
            <div className="space-y-2">
              {watchlist.map((item) => (
                <WatchlistCard
                  key={item.id}
                  item={item}
                  onGetRecs={handleGetRecs}
                  onRemove={removeFromWatchlist}
                  onNavigate={() => router.push(`/movies/${encodeURIComponent(item.movie_title)}`)}
                />
              ))}
            </div>
          </div>

          {/* Only render when loading or when we actually have results */}
          {(recsLoading || recs.length > 0) && (
            <div>
              <SectionHeader
                title="Recommended for you"
                subtitle="Based on your watchlist"
              />
              <RecommendationPanel
                recommendations={recs}
                posters={recPosters}
                loading={recsLoading}
                onSelect={handleRecSelect}
                count={12}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <WatchlistContent />
    </AuthGuard>
  )
}
