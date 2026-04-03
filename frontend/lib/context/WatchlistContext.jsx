'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '../supabase/client'
import { useAuth } from './AuthContext'

/**
 * WatchlistContext — single source of truth for the user's watchlist.
 *
 * Placed above AppShell so every component (MovieCard, SidebarNav,
 * watchlist page, RecommendationPanel) shares the same state.
 * Eliminates the N-fetch-per-card problem and ensures the save icon
 * reflects the correct state across the entire app.
 */
const WatchlistContext = createContext(null)

export function WatchlistProvider({ children }) {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[WatchlistContext] fetch error:', error.message)
    } else {
      setWatchlist(data || [])
    }
    setLoading(false)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  const addToWatchlist = useCallback(
    async (movie) => {
      if (!user) return false

      // Use title as the stable movie_id — our API doesn't return numeric IDs
      const movieId = movie.title

      const { error } = await supabase.from('watchlists').insert({
        user_id: user.id,
        movie_id: movieId,
        movie_title: movie.title,
        poster_url: movie.poster_url || null,
      })

      if (error) {
        // Unique constraint hit means it's already saved — treat as success
        if (error.code === '23505') return true
        console.error('[WatchlistContext] insert error:', error.message)
        return false
      }

      // Optimistic update for instant icon feedback, then sync from DB
      setWatchlist((prev) => [
        {
          id: `temp-${movieId}`,
          user_id: user.id,
          movie_id: movieId,
          movie_title: movie.title,
          poster_url: movie.poster_url || null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      await fetchWatchlist()
      return true
    },
    [user, fetchWatchlist] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const removeFromWatchlist = useCallback(
    async (movieId) => {
      if (!user) return false

      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', String(movieId))

      if (error) {
        console.error('[WatchlistContext] delete error:', error.message)
        return false
      }

      // Optimistic update
      setWatchlist((prev) =>
        prev.filter((item) => item.movie_id !== String(movieId))
      )
      await fetchWatchlist()
      return true
    },
    [user, fetchWatchlist] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const isInWatchlist = useCallback(
    (movieIdOrTitle) =>
      watchlist.some((item) => item.movie_id === String(movieIdOrTitle)),
    [watchlist]
  )

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        loading,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        refetch: fetchWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  )
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext)
  if (!ctx) throw new Error('useWatchlist must be used inside <WatchlistProvider>')
  return ctx
}
