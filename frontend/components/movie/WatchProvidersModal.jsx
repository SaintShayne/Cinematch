'use client'

import { useEffect } from 'react'

// ── Affiliate tags ────────────────────────────────────────────────────────────
// Replace these placeholder values with your actual affiliate/partner IDs.
// Amazon Associates: sign up at affiliate-program.amazon.com
//   → earn ~3–5% on digital video rentals & purchases
// Apple Performance Partners: sign up at affiliate.itunes.apple.com (via Partnerize)
//   → earn ~2.5% on Apple TV purchases
const AMAZON_AFFILIATE_TAG = '' // e.g. 'cinematch-20'
const APPLE_AFFILIATE_TOKEN = '' // e.g. '1234abcd5678'

function amazonUrl(title) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=instant-video`
  return AMAZON_AFFILIATE_TAG ? `${base}&tag=${AMAZON_AFFILIATE_TAG}` : base
}

function appleUrl(title) {
  const base = `https://tv.apple.com/search?term=${encodeURIComponent(title)}`
  return APPLE_AFFILIATE_TOKEN ? `${base}&at=${APPLE_AFFILIATE_TOKEN}` : base
}

// ── Provider URL patterns ─────────────────────────────────────────────────────
// Keyed by lowercase provider name. Each value is a fn(title) → URL.
// Covers the most common TMDB US providers — falls back to JustWatch if unknown.
const PROVIDER_URLS = {
  // Subscription
  'netflix':              (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  'amazon prime video':   amazonUrl,
  'prime video':          amazonUrl,
  'disney plus':          (t) => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`,
  'disney+':              (t) => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`,
  'apple tv plus':        appleUrl,
  'apple tv+':            appleUrl,
  'hulu':                 (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  'max':                  (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  'hbo max':              (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  'peacock':              (t) => `https://www.peacocktv.com/search/?q=${encodeURIComponent(t)}`,
  'peacock premium':      (t) => `https://www.peacocktv.com/search/?q=${encodeURIComponent(t)}`,
  'paramount plus':       (t) => `https://www.paramountplus.com/search/?query=${encodeURIComponent(t)}`,
  'paramount+':           (t) => `https://www.paramountplus.com/search/?query=${encodeURIComponent(t)}`,
  'showtime':             (t) => `https://www.sho.com/search?query=${encodeURIComponent(t)}`,
  'starz':                (t) => `https://www.starz.com/us/en/search?q=${encodeURIComponent(t)}`,
  'crunchyroll':          (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  'shudder':              (t) => `https://www.shudder.com/search?q=${encodeURIComponent(t)}`,
  'mubi':                 (t) => `https://mubi.com/search/${encodeURIComponent(t)}`,
  // Free / ad-supported
  'tubi tv':              (t) => `https://tubitv.com/search/${encodeURIComponent(t)}`,
  'tubi':                 (t) => `https://tubitv.com/search/${encodeURIComponent(t)}`,
  'pluto tv':             (t) => `https://pluto.tv/search?q=${encodeURIComponent(t)}`,
  'plex':                 (t) => `https://app.plex.tv/desktop/#!/search?query=${encodeURIComponent(t)}`,
  'kanopy':               (t) => `https://www.kanopy.com/en/search?q=${encodeURIComponent(t)}`,
  'hoopla':               (t) => `https://www.hoopladigital.com/search?q=${encodeURIComponent(t)}`,
  // Rent / buy
  'apple tv':             appleUrl,
  'google play movies':   (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=movies`,
  'youtube':              (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,
  'vudu':                 (t) => `https://www.vudu.com/content/movies/search/?searchString=${encodeURIComponent(t)}`,
  'fandango at home':     (t) => `https://www.vudu.com/content/movies/search/?searchString=${encodeURIComponent(t)}`,
  'microsoft store':      (t) => `https://www.microsoft.com/en-us/search?q=${encodeURIComponent(t)}&filters=VideoType%3DMovie`,
  'redbox':               (t) => `https://www.redbox.com/search-results?q=${encodeURIComponent(t)}`,
  'amazon video':         amazonUrl,
  'amazon':               amazonUrl,
}

function getProviderUrl(providerName, movieTitle, fallback) {
  const fn = PROVIDER_URLS[providerName.toLowerCase()]
  return fn ? fn(movieTitle) : fallback
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProviderTile({ p, movieTitle, fallbackLink }) {
  const href = getProviderUrl(p.name, movieTitle, fallbackLink)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 w-14 group"
      title={p.name}
    >
      {p.logo ? (
        <img
          src={p.logo}
          alt={p.name}
          className="w-10 h-10 rounded-lg object-cover border border-[rgba(255,255,255,0.1)] group-hover:border-[rgba(255,255,255,0.3)] group-hover:scale-105 transition-all duration-150"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-surface-high border border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.2)] flex items-center justify-center transition-colors">
          <span className="text-text-muted text-xs">{p.name.slice(0, 2)}</span>
        </div>
      )}
      <span className="text-[10px] text-text-muted group-hover:text-text-secondary text-center leading-tight line-clamp-2 transition-colors">
        {p.name}
      </span>
    </a>
  )
}

function ProviderTier({ label, providers, movieTitle, fallbackLink }) {
  if (!providers?.length) return null
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
        {label}
      </p>
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => (
          <ProviderTile
            key={p.name}
            p={p}
            movieTitle={movieTitle}
            fallbackLink={fallbackLink}
          />
        ))}
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function WatchProvidersModal({ providers, movieTitle, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const hasAny =
    providers?.flatrate?.length ||
    providers?.free?.length ||
    providers?.rent?.length ||
    providers?.buy?.length

  const fallbackLink = providers?.link

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-surface-elevated border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-text-primary">Where to Watch</h2>
            <p className="text-xs text-text-muted mt-0.5 truncate max-w-[220px]">{movieTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body — scrollable if tall */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto">
          {hasAny ? (
            <>
              <ProviderTier label="Stream" providers={providers.flatrate} movieTitle={movieTitle} fallbackLink={fallbackLink} />
              <ProviderTier label="Free"   providers={providers.free}     movieTitle={movieTitle} fallbackLink={fallbackLink} />
              <ProviderTier label="Rent"   providers={providers.rent}     movieTitle={movieTitle} fallbackLink={fallbackLink} />
              <ProviderTier label="Buy"    providers={providers.buy}      movieTitle={movieTitle} fallbackLink={fallbackLink} />
            </>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">
              No streaming options found for your region.
            </p>
          )}
        </div>

        {/* Footer */}
        {fallbackLink && (
          <div className="px-6 pb-5 flex-shrink-0">
            <a
              href={fallbackLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs text-text-muted border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)] hover:text-text-secondary transition-colors"
            >
              View all options on JustWatch ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
