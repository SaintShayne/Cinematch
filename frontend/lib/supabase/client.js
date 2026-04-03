'use client'

import { createBrowserClient } from '@supabase/ssr'

let _client

/**
 * Returns a singleton Supabase browser client.
 * Safe to call multiple times in the same browser session.
 */
export function createClient() {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  return _client
}
