'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHero from '../../components/layout/PageHero'
import RecentSearches from '../../components/search/RecentSearches'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import {
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  deleteRecentSearch,
} from '../../lib/recentSearches'

export default function HistoryPage() {
  const router = useRouter()
  const [recentSearches, setRecentSearches] = useState([])

  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  const handleSelect = (query) => {
    const updated = saveRecentSearch(query)
    setRecentSearches(updated)
    router.push(`/?q=${encodeURIComponent(query)}`)
  }

  const handleClear = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const handleRemove = (query) => {
    const updated = deleteRecentSearch(query)
    setRecentSearches(updated)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHero
        title="Search History"
        subtitle="Your recent searches are stored locally on this device."
      />

      {recentSearches.length > 0 ? (
        <RecentSearches
          items={recentSearches}
          onSelect={handleSelect}
          onClear={handleClear}
          onRemove={handleRemove}
          showWhenEmpty
        />
      ) : (
        <EmptyState
          icon="🕘"
          title="No recent searches yet"
          description="Search for a movie and it will appear here."
          action={<Button onClick={() => router.push('/')}>Go to Search</Button>}
        />
      )}
    </div>
  )
}
