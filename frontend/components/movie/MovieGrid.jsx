import MovieCard from './MovieCard'
import { SkeletonGrid } from '../ui/LoadingState'
import EmptyState from '../ui/EmptyState'

export default function MovieGrid({
  movies,
  loading,
  onSelect,
  columns = 5,
  emptyTitle = 'No movies found',
  emptyDescription = 'Try adjusting your search or filters.',
}) {
  if (loading) {
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
        }}
      >
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <div className="skeleton aspect-[2/3] w-full" />
            <div className="p-3 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-2.5 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!movies || movies.length === 0) {
    return (
      <EmptyState
        icon="🎬"
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div
      className="grid gap-4 animate-fade-in"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
      }}
    >
      {movies.map((movie, i) => (
        <MovieCard key={`${movie.title}-${i}`} movie={movie} onSelect={onSelect} />
      ))}
    </div>
  )
}
