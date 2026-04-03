// Re-export from context so all existing imports (`from '../../lib/hooks/useWatchlist'`)
// continue to work without changes. State is now shared via WatchlistContext.
export { useWatchlist } from '../context/WatchlistContext'
