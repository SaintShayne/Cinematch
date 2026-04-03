export function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
      <div className="skeleton aspect-[2/3] w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 10, columns = 5 }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={`${sizes[size]} border-2 border-surface-high border-t-red rounded-full animate-spin ${className}`}
    />
  )
}

export default function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  )
}
