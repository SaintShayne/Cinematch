import { MOOD_CHIPS } from '../../lib/constants'
import { cn } from '../../lib/utils'

export default function MoodFilters({ onSelect, activeQuery }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MOOD_CHIPS.map((chip) => (
        <button
          key={chip.query}
          onClick={() => onSelect?.(chip.query)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border',
            activeQuery === chip.query
              ? 'bg-red/15 text-red border-red/35'
              : 'bg-surface-elevated text-text-secondary border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] hover:text-text-primary'
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
