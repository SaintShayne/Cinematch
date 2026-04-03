import { cn } from '../../lib/utils'

export default function SectionHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-6', className)}>
      <div>
        <h2 className="text-xl font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
