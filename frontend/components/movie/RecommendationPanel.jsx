'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatRating, formatYear, matchPercent, matchColor } from '../../lib/utils'
import { useAuth } from '../../lib/context/AuthContext'
import { useWatchlist } from '../../lib/hooks/useWatchlist'
import { useRecentlyViewed } from '../../lib/hooks/useRecentlyViewed'

function RecommendationCard({ rec, poster, onSelect }) {
  const router = useRouter()
  const { user } = useAuth()
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { trackView } = useRecentlyViewed()
  const [imgError, setImgError] = useState(false)
  const [saving, setSaving] = useState(false)

  const pct = matchPercent(rec.score ?? 0)
  const colorClass = matchColor(pct)
  const inWatchlist = isInWatchlist(rec.title)

  const handleSelect = () => {
    trackView({ title: rec.title, poster_url: poster })
    onSelect?.(rec.title)
  }

  const handleSave = async (e) => {
    e.stopPropagation()
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    setSaving(true)
    const movie = { title: rec.title, poster_url: poster }
    if (inWatchlist) {
      await removeFromWatchlist(rec.title)
    } else {
      await addToWatchlist(movie)
    }
    setSaving(false)
  }

  return (
    <div
      onClick={handleSelect}
      className={cn(
        'group relative rounded-xl overflow-hidden cursor-pointer',
        'bg-surface-elevated border border-[rgba(255,255,255,0.06)]',
        'transition-all duration-250 hover:border-[rgba(255,255,255,0.15)] hover:-translate-y-0.5 hover:shadow-elevated'
      )}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-surface">
        {poster && !imgError ? (
          <Image
            src={poster}
            alt={rec.title}
            fill
            sizes="180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted opacity-30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
        )}

        {/* Match pill */}
        <div className="absolute top-2 left-2">
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-black/70 backdrop-blur-sm', colorClass)}>
            {pct}% match
          </span>
        </div>

        {/* Save button — visible to all; guests redirected to login */}
        <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150',
              inWatchlist
                ? 'bg-red text-white opacity-100'
                : 'bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red/80'
            )}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M6.75 2.75A2.75 2.75 0 004 5.5v11.75a.75.75 0 001.26.55L10 13.06l4.74 4.74A.75.75 0 0016 17.25V5.5A2.75 2.75 0 0013.25 2.75h-6.5z" />
            </svg>
          </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-semibold text-text-primary truncate">{rec.title}</p>

        {/* Explanation tags */}
        {rec.explanations && rec.explanations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {rec.explanations.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs text-text-muted bg-surface border border-[rgba(255,255,255,0.06)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RecommendationPanel({ recommendations, posters, onSelect, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <div className="skeleton aspect-[2/3]" />
            <div className="p-3 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-2.5 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!recommendations || recommendations.length === 0) return null

  return (
    <div
      className="grid gap-4 animate-slide-up"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
    >
      {recommendations.map((rec, i) => (
        <RecommendationCard
          key={`${rec.title}-${i}`}
          rec={rec}
          poster={posters?.[rec.title]}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
