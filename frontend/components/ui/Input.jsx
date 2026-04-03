import { cn } from '../../lib/utils'

export default function Input({
  label,
  error,
  icon,
  className,
  inputClassName,
  ...props
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 flex items-center">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={cn(
            'w-full bg-surface border border-[rgba(255,255,255,0.08)] rounded-lg',
            'px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted',
            'transition-colors duration-200',
            'focus:outline-none focus:border-red/60 focus:bg-surface-elevated',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            icon && 'pl-10',
            error && 'border-red/60',
            inputClassName
          )}
        />
      </div>
      {error && (
        <p className="text-xs text-red">{error}</p>
      )}
    </div>
  )
}
