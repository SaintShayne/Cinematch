'use client'

import Image from 'next/image'
import { useState } from 'react'
import { formatRating, formatYear } from '../../lib/utils'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

export default function FeaturedMovieCard({ movie, onGetRecs, onSave }) {
  const [imgError, setImgError] = useState(false)

  if (!movie) return null

  return (
    <div className="relative rounded-2xl overflow-hidden bg-surface-elevated border border-[rgba(255,255,255,0.08)] min-h-[260px] flex">
      {/* Poster column */}
      {movie.poster_url && !imgError && (
        <div className="relative w-40 flex-shrink-0">
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-elevated" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {movie.genres?.slice(0, 3).map((g) => (
              <Badge key={g} variant="red">{g}</Badge>
            ))}
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-tight">
            {movie.title}
          </h2>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
            <span>{formatYear(movie.release_year)}</span>
            {movie.vote_average != null && (
              <span className="text-yellow-400 font-medium">★ {formatRating(movie.vote_average)}</span>
            )}
          </div>
          {movie.overview && (
            <p className="mt-3 text-sm text-text-secondary leading-relaxed line-clamp-3">
              {movie.overview}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <Button size="md" onClick={() => onGetRecs?.(movie.title)}>
            Get Recommendations
          </Button>
          <Button size="md" variant="secondary" onClick={() => onSave?.(movie)}>
            Save to Watchlist
          </Button>
        </div>
      </div>
    </div>
  )
}
