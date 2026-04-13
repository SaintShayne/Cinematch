'use client'

export default function RecentSearches({
  items = [],
  onSelect,
  onClear,
  onRemove,
  onViewHistory,
  className = '',
  compact = false,
  showWhenEmpty = false,
}) {
  if (!items.length && !showWhenEmpty) return null

  return (
    <div
      className={`rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.08)] shadow-elevated p-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-2xs uppercase tracking-widest text-text-muted font-medium">
          Recent searches
        </p>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-2xs text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-1">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-lg hover:bg-surface-high transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className={
                  compact
                    ? 'flex-1 text-left px-2.5 py-1.5 text-2xs text-text-secondary hover:text-text-primary transition-colors'
                    : 'flex-1 text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors'
                }
              >
                {item}
              </button>

              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="px-2 text-xs text-text-muted hover:text-red transition-colors"
                  aria-label={`Remove ${item} from recent searches`}
                >
                  ×
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="px-2 py-2 text-xs text-text-muted">
            No recent searches yet.
          </p>
        )}
      </div>

      {onViewHistory && (
        <div className="mt-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <button
            type="button"
            onClick={onViewHistory}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            View search history
          </button>
        </div>
      )}
    </div>
  )
}
