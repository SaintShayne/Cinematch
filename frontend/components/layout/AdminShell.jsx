'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * AdminShell — wraps all /admin/* pages.
 * Provides a clean header with branding + sign-out, and NO movie-app sidebar/topnav.
 * Sign-out clears the dev-admin cookie and returns to /admin/login.
 */
export default function AdminShell({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  function handleSignOut() {
    document.cookie = 'cinematch_dev_admin=; path=/; max-age=0; SameSite=Strict'
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Admin header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 h-14 bg-surface/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between px-6">
        <Link
          href={isLoginPage ? '#' : '/admin'}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <span className="text-xl">🎬</span>
          <span className="font-bold text-text-primary tracking-tight">CineMatch</span>
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </Link>

        {!isLoginPage && (
          <button
            onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-text-muted hover:text-red-400 hover:border-red-500/30 transition-all"
          >
            Sign out
          </button>
        )}
      </header>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-screen-xl mx-auto">
        {children}
      </main>
    </div>
  )
}
