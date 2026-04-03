import { cn } from '../../lib/utils'

export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-4 text-text-muted text-2xl">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-6">{description}</p>
      )}
      {action && action}
    </div>
  )
}
