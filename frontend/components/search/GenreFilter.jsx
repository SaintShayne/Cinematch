'use client'

import { cn } from '../../lib/utils'

export default function GenreFilter({ genres, selected, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-7 w-20 rounded-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onSelect?.(genre)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border',
            selected === genre
              ? 'bg-red text-white border-red'
              : 'bg-surface-elevated text-text-secondary border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] hover:text-text-primary'
          )}
        >
          {genre}
        </button>
      ))}
    </div>
  )
}
