'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import { addToRecentlyViewed, getRecentlyViewed } from '../utils'

/**
 * Manages recently viewed movies.
 * - Logged-in users: persisted to Supabase + localStorage.
 * - Guests: localStorage only.
 */
export function useRecentlyViewed() {
  const { user } = useAuth()
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const supabase = createClient()

  const fetchFromSupabase = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('recently_viewed')
      .select('*')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(10)
    if (data) setRecentlyViewed(data)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      fetchFromSupabase()
    } else {
      setRecentlyViewed(getRecentlyViewed())
    }
  }, [user, fetchFromSupabase])

  const trackView = useCallback(
    async (movie) => {
      // Always update localStorage for instant sidebar feedback
      addToRecentlyViewed(movie)

      if (user) {
        await supabase.from('recently_viewed').upsert(
          {
            user_id: user.id,
            movie_id: String(movie.id || movie.title),
            movie_title: movie.title,
            poster_url: movie.poster_url || null,
            viewed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,movie_id' }
        )
        await fetchFromSupabase()
      } else {
        setRecentlyViewed(getRecentlyViewed())
      }
    },
    [user, fetchFromSupabase] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { recentlyViewed, trackView }
}
