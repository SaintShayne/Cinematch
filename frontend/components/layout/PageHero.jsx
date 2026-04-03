import { cn } from '../../lib/utils'

export default function PageHero({ title, subtitle, children, className }) {
  return (
    <div className={cn('relative mb-8', className)}>
      {/* Ambient red glow */}
      <div
        aria-hidden
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-96 h-40 bg-red/10 blur-3xl rounded-full pointer-events-none"
      />
      <div className="relative">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-base text-text-secondary max-w-xl">{subtitle}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  )
}
