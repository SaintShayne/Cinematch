'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import RecentSearches from '../search/RecentSearches'
import {
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  deleteRecentSearch,
} from '../../lib/recentSearches'

export default function TopNav({ onMenuClick }) {
  const router = useRouter()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)

  const q = searchParams.get('q') || ''

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = searchValue.trim()
    if (!trimmed) return
    const updated = saveRecentSearch(trimmed)
    setRecentSearches(updated)
    setShowDropdown(false)
    router.push(`/?q=${encodeURIComponent(trimmed)}`)
  }

  const handleRecentSelect = (query) => {
    const updated = saveRecentSearch(query)
    setRecentSearches(updated)
    setShowDropdown(false)
    router.push(`/?q=${encodeURIComponent(query)}`)
  }

  const handleClearRecent = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const handleRemoveRecent = (query) => {
    const updated = deleteRecentSearch(query)
    setRecentSearches(updated)
  }

  return (
    <header className="sticky top-0 z-20 h-14 bg-surface/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] flex items-center gap-4 px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="lg:hidden p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Quick search with recent searches dropdown */}
      <div ref={searchRef} className="hidden sm:flex flex-1 max-w-sm relative">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <input
              type="text"
              value={searchValue}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search movies..."
              className="w-full bg-surface-elevated border border-[rgba(255,255,255,0.08)] rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red/50 transition-colors"
            />
          </div>
        </form>

        {showDropdown && (
          <RecentSearches
            items={recentSearches.slice(0, 5)}
            onSelect={handleRecentSelect}
            onClear={handleClearRecent}
            onRemove={handleRemoveRecent}
            onViewHistory={() => {
              setShowDropdown(false)
              router.push('/history')
            }}
            compact
            showWhenEmpty
            className="absolute top-[calc(100%+8px)] left-0 right-0 z-30"
          />
        )}
      </div>

      <div className="flex-1 lg:hidden" />

      <div className="flex items-center gap-2">
        {user ? (
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-red/20 flex items-center justify-center text-xs font-semibold text-red hover:bg-red/30 transition-colors"
          >
            {(user.user_metadata?.display_name || user.email || '?')
              .charAt(0)
              .toUpperCase()}
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red hover:bg-red-bright transition-colors"
            >
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
