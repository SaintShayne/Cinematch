import Link from 'next/link'
import { cn } from '../../lib/utils'

export default function SupportCTA({ variant = 'banner', className }) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-4 p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.07)]', className)}>
        <span className="text-xl flex-shrink-0">♥</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">Support the project</p>
          <p className="text-xs text-text-secondary mt-0.5">Help shape what comes next.</p>
        </div>
        <Link
          href="/support"
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red border border-red/30 hover:bg-red/10 transition-colors"
        >
          Learn more
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-surface-elevated p-8 text-center', className)}>
      <div
        aria-hidden
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-red/8 blur-3xl rounded-full"
      />
      <div className="relative">
        <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Open Source Project
        </p>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Support the project
        </h2>
        <p className="text-sm text-text-secondary max-w-sm mx-auto mb-6">
          Help shape what comes next — every contribution helps keep CineMatch free and improving.
        </p>
        <Link
          href="/support"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red hover:bg-red-bright transition-colors"
        >
          <span>♥</span>
          Support CineMatch
        </Link>
      </div>
    </div>
  )
}
