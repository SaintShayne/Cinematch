'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '../../components/auth/AuthGuard'
import PageHero from '../../components/layout/PageHero'
import SectionHeader from '../../components/ui/SectionHeader'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { useWatchlist } from '../../lib/hooks/useWatchlist'
import { formatYear } from '../../lib/utils'

function WatchlistCard({ item, onGetRecs, onRemove }) {
  const [imgError, setImgError] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    setRemoving(true)
    await onRemove(item.movie_id)
    setRemoving(false)
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-colors group">
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

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
              />
            ))}
          </div>
        </div>
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
