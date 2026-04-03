'use client'

import { useState, useRef } from 'react'
import { cn } from '../../lib/utils'

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  mode,
  onModeChange,
  placeholder,
  loading,
  autoFocus,
}) {
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit?.(value.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e)
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Mode toggle */}
      {onModeChange && (
        <div className="flex gap-1 mb-3">
          {['smart', 'title'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all duration-150',
                mode === m
                  ? 'bg-red/15 text-red border border-red/30'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {m === 'smart' ? 'Smart Search' : 'Title Search'}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholder ||
              (mode === 'smart'
                ? 'Try "movies like Inception" or "feel-good 90s comedy"…'
                : 'Search by title…')
            }
            autoFocus={autoFocus}
            className={cn(
              'w-full bg-surface-elevated border border-[rgba(255,255,255,0.1)] rounded-xl',
              'pl-12 pr-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted',
              'transition-colors duration-200',
              'focus:outline-none focus:border-red/60 focus:bg-surface-high',
              'shadow-card'
            )}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={cn(
            'flex-shrink-0 h-12 px-6 rounded-xl font-medium text-sm',
            'bg-red text-white transition-all duration-150',
            'hover:bg-red-bright disabled:opacity-40 disabled:cursor-not-allowed',
            'flex items-center gap-2'
          )}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : null}
          Search
        </button>
      </form>
    </div>
  )
}
