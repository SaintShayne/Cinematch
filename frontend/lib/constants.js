export const MOOD_CHIPS = [
  { label: 'Action-packed', query: 'action-packed thriller' },
  { label: 'Romantic', query: 'romantic tearjerker love story' },
  { label: 'Horror', query: 'scary horror terrifying' },
  { label: 'Feel-good', query: 'feel-good comedy funny uplifting' },
  { label: 'Sci-Fi Epic', query: 'epic science fiction space adventure' },
  { label: 'Crime', query: 'crime mystery detective thriller' },
]

// Search ("/") is intentionally excluded — the brand logo links there instead
export const NAV_LINKS = [
  { href: '/browse', label: 'Browse', icon: 'grid' },
  { href: '/recommendations', label: 'Recommendations', icon: 'star' },
  { href: '/watchlist', label: 'Watchlist', icon: 'bookmark', protected: true },
  { href: '/history', label: 'History', icon: 'history' },
  { href: '/about', label: 'About', icon: 'info' },
]

export const TECH_STACK = [
  'Next.js',
  'FastAPI',
  'scikit-learn',
  'BM25',
  'Groq LLM',
  'TMDB API',
  'Supabase',
  'Python 3.11',
]

export const DEFAULT_POSTER = '/placeholder-poster.svg'

export const RECENTLY_VIEWED_KEY = 'cinematch_recently_viewed'
export const MAX_RECENTLY_VIEWED = 10
