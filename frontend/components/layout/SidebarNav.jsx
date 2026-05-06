'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '../../lib/utils'
import { NAV_LINKS } from '../../lib/constants'
import { useAuth } from '../../lib/context/AuthContext'
import { useWatchlist } from '../../lib/hooks/useWatchlist'
import { useRecentlyViewed } from '../../lib/hooks/useRecentlyViewed'

// ── Icons (inline SVG — no icon lib dependency) ──────────────────────────────
const icons = {
  search: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.5-9A2.25 2.25 0 008.5 4.25v2.5A2.25 2.25 0 0010.75 9h2.5A2.25 2.25 0 0015.5 6.75v-2.5A2.25 2.25 0 0013.25 2h-2.5zm0 9A2.25 2.25 0 008.5 13.25v2.5A2.25 2.25 0 0010.75 18h2.5A2.25 2.25 0 0015.5 15.75v-2.5A2.25 2.25 0 0013.25 11h-2.5z" clipRule="evenodd" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.239a1 1 0 000 1.962l1.192.24a1 1 0 01.785.783l.24 1.192a1 1 0 001.96 0l.239-1.192a1 1 0 01.784-.784l1.192-.238a1 1 0 000-1.962l-1.192-.24a1 1 0 01-.784-.785l-.24-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M6.75 2.75A2.75 2.75 0 004 5.5v11.75a.75.75 0 001.26.55L10 13.06l4.74 4.74A.75.75 0 0016 17.25V5.5A2.75 2.75 0 0013.25 2.75h-6.5z" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .199.079.39.22.53l2.75 2.75a.75.75 0 101.06-1.06l-2.53-2.53V5z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
    </svg>
  ),
  flag: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 12.25v-8.5a.75.75 0 00-.904-.734l-2.38.501a7.25 7.25 0 01-4.186-.363l-.502-.2a8.75 8.75 0 00-5.053-.439l-1.475.31V2.75z" />
    </svg>
  ),
}

const bookmarkIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M6.75 2.75A2.75 2.75 0 004 5.5v11.75a.75.75 0 001.26.55L10 13.06l4.74 4.74A.75.75 0 0016 17.25V5.5A2.75 2.75 0 0013.25 2.75h-6.5z" />
  </svg>
)

export default function SidebarNav({ open, onClose }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const { watchlist } = useWatchlist()
  const { recentlyViewed } = useRecentlyViewed()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full w-[240px] z-40',
        'bg-surface border-r border-[rgba(255,255,255,0.06)]',
        'flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Brand — clicking navigates to Search (/) */}
      <Link
        href="/"
        onClick={onClose}
        className="flex items-center gap-2 px-5 h-14 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <span className="text-red text-xl">🎬</span>
        <span className="font-bold text-text-primary tracking-tight">CineMatch</span>
      </Link>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                active
                  ? 'bg-red/10 text-red font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              )}
            >
              <span className={active ? 'text-red' : 'text-text-muted'}>
                {icons[link.icon]}
              </span>
              {link.label}
            </Link>
          )
        })}

        <Link
          href="/support"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
            pathname === '/support'
              ? 'bg-red/10 text-red font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          )}
        >
          <span className={pathname === '/support' ? 'text-red' : 'text-text-muted'}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
            </svg>
          </span>
          Support
        </Link>

        <Link
          href="/report"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
            pathname === '/report'
              ? 'bg-red/10 text-red font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          )}
        >
          <span className={pathname === '/report' ? 'text-red' : 'text-text-muted'}>
            {icons.flag}
          </span>
          Report an Issue
        </Link>

        {/* Watchlist preview */}
        {user && watchlist.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <p className="px-3 text-2xs font-semibold uppercase tracking-widest text-text-muted mb-2">
              Watchlist
            </p>
            {watchlist.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  router.push(
                    `/movies/${encodeURIComponent(item.movie_title)}`
                  )
                  onClose?.()
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
              >
                <span className="text-text-muted flex-shrink-0">{bookmarkIcon}</span>
                <span className="truncate">{item.movie_title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <p className="px-3 text-2xs font-semibold uppercase tracking-widest text-text-muted mb-2">
              Recently Viewed
            </p>
            {recentlyViewed.slice(0, 5).map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  router.push(
                    `/movies/${encodeURIComponent(item.movie_title || item.title)}`
                  )
                  onClose?.()
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted flex-shrink-0" />
                <span className="truncate">{item.movie_title || item.title}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
        {loading ? null : user ? (
          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-red/20 flex items-center justify-center text-xs font-semibold text-red flex-shrink-0">
                {(user.user_metadata?.display_name || user.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  {user.user_metadata?.display_name || 'Profile'}
                </p>
                <p className="text-2xs text-text-muted truncate">{user.email}</p>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-text-muted hover:text-red hover:bg-red/5 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-1.069a.75.75 0 10-1.064-1.059l-2.5 2.5a.75.75 0 000 1.06l2.5 2.5a.75.75 0 001.06-1.06L8.704 10.75h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
              </svg>
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-xs font-medium text-text-primary bg-surface-elevated hover:bg-surface-high border border-[rgba(255,255,255,0.08)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={onClose}
              className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-xs font-medium text-white bg-red hover:bg-red-bright transition-colors"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
