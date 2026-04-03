import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-surface-high text-text-secondary border border-[rgba(255,255,255,0.08)]',
  red: 'bg-red/15 text-red border border-red/25',
  green: 'bg-green-500/10 text-green-400 border border-green-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  tech: 'bg-surface text-text-muted border border-[rgba(255,255,255,0.06)]',
}

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
