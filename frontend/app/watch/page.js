'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '../../lib/context/AuthContext'

const SEASON_COUNT = 15
const EPISODE_COUNT = 50

function Spinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-text-muted border-t-red rounded-full animate-spin" />
    </div>
  )
}

function SafetyCard({ icon, title, children }) {
  return (
    <div className="flex-1 min-w-0 p-5 rounded-2xl bg-surface-elevated border border-[rgba(255,255,255,0.07)] space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="text-xs text-text-secondary leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

function WatchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, supabase } = useAuth()

  const tmdbId = searchParams.get('id')
  const type = searchParams.get('type') || 'movie'
  const title = searchParams.get('title') || ''
  const poster = searchParams.get('poster') || ''

  const [isSupporter, setIsSupporter] = useState(null)
  const [redirectMsg, setRedirectMsg] = useState('')
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [source, setSource] = useState('vidsrc')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      const dest = `/watch${window.location.search}`
      router.replace(`/login?redirect=${encodeURIComponent(dest)}`)
      return
    }

    supabase
      .from('profiles')
      .select('is_supporter')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const supported = data?.is_supporter ?? false
        setIsSupporter(supported)
        if (!supported) {
          setRedirectMsg('Watch is a supporter feature')
          setTimeout(() => router.replace('/support'), 2000)
        }
      })
  }, [user, authLoading, router, supabase])

  const SOURCES = [
    { id: 'vidsrc',   label: 'VidSrc',   mode: 'embed' },
    { id: 'cinegram', label: 'CineGram ↗', mode: 'external', url: () => `https://cinegram.net/index.php?menu=search&query=${encodeURIComponent(title)}` },
    { id: 'watchtv',  label: 'WatchTV ↗',  mode: 'external', url: () => `https://www.watchtv.click/?s=${encodeURIComponent(title)}` },
  ]

  const iframeSrc = (() => {
    if (!tmdbId) return ''
    if (type === 'tv') {
      return `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
    }
    return `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`
  })()

  const iframeKey = `${type === 'tv' ? `${tmdbId}-s${season}e${episode}` : tmdbId}`

  const handleSourceClick = (s) => {
    if (s.mode === 'external') {
      window.open(s.url(), '_blank', 'noopener,noreferrer')
    } else {
      setSource(s.id)
      setIframeLoaded(false)
    }
  }

  if (authLoading || isSupporter === null) {
    return redirectMsg ? (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="px-5 py-3 rounded-xl bg-red/10 border border-red/20 text-sm text-red font-medium">
          {redirectMsg}
        </div>
        <Spinner />
      </div>
    ) : (
      <Spinner />
    )
  }

  if (!tmdbId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-text-primary font-semibold">Nothing to watch</p>
        <p className="text-sm text-text-muted">No film ID was provided.</p>
        <Link href="/" className="text-xs text-text-muted hover:text-text-secondary transition-colors">← Back to search</Link>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% {
            text-shadow: 0 0 20px rgba(229,9,26,0.5), 0 0 40px rgba(229,9,26,0.25);
          }
          50% {
            text-shadow: 0 0 40px rgba(229,9,26,0.9), 0 0 80px rgba(229,9,26,0.4), 0 0 120px rgba(229,9,26,0.15);
          }
        }
        .glow-heading { animation: glow-pulse 3s ease-in-out infinite; }

        @keyframes banner-glow {
          0%, 100% { box-shadow: inset 0 0 60px rgba(229,9,26,0.04); }
          50% { box-shadow: inset 0 0 100px rgba(229,9,26,0.1); }
        }
        .banner-glow { animation: banner-glow 4s ease-in-out infinite; }
      `}</style>

      {/* ── Section A — Supporter hero ── */}
      <section className="banner-glow -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 mb-10 bg-gradient-to-b from-[#160003] via-[#0e0002] to-[#08090b] border-b border-[rgba(229,9,26,0.12)]">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span className="inline-block px-3 py-1 rounded-full text-2xs font-semibold tracking-widest uppercase bg-red/10 text-red border border-red/20">
            Supporter Exclusive
          </span>

          <h1 className="glow-heading text-3xl sm:text-4xl font-extrabold text-text-primary">
            Thank you, Supporter
          </h1>

          <p className="text-sm italic text-text-secondary">
            You make CineMatch possible. Enjoy your film.
          </p>

          {title && (
            <div className="inline-flex items-center gap-4 px-5 py-3 rounded-2xl bg-surface-elevated border border-[rgba(255,255,255,0.07)]">
              {poster && (
                <div className="relative w-10 h-14 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={poster}
                    alt={title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              )}
              <p className="text-base font-semibold text-text-primary text-left">{title}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Section B — Safety tips ── */}
      <section className="mb-10 space-y-4">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
          Before you watch
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">

          <SafetyCard icon="🛡️" title="Use a VPN">
            <p className="font-medium text-text-primary">Free options that actually work:</p>
            <ul className="space-y-1.5 pl-1">
              <li>
                <span className="font-medium text-text-primary">ProtonVPN</span>{' '}
                — truly free, no data cap.{' '}
                <span className="text-text-muted">protonvpn.com → Download → Sign up → Connect</span>
              </li>
              <li>
                <span className="font-medium text-text-primary">Windscribe</span>{' '}
                — 10 GB/month free.{' '}
                <span className="text-text-muted">windscribe.com → Sign up → Pick a location → Connect</span>
              </li>
            </ul>
          </SafetyCard>

          <SafetyCard icon="🕵️" title="Go Incognito">
            <p className="font-medium text-text-primary">Open an incognito window:</p>
            <ul className="space-y-1 pl-1">
              <li><span className="font-medium text-text-primary">Chrome / Edge</span> — Ctrl+Shift+N</li>
              <li><span className="font-medium text-text-primary">Firefox</span> — Ctrl+Shift+P</li>
            </ul>
            <p className="mt-2 font-medium text-text-primary">Enable your ad blocker in incognito:</p>
            <p className="pl-1 text-text-muted">Chrome → Extensions menu → click "⋮" next to uBlock Origin → Allow in Incognito</p>
          </SafetyCard>

          <SafetyCard icon="🚫" title="Block Ads">
            <p>
              <span className="font-medium text-text-primary">uBlock Origin</span> is free, open-source,
              and the most effective ad blocker available. Essential for third-party streaming sites.
            </p>
            <div className="flex gap-3 mt-2">
              <a
                href="https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Chrome
              </a>
              <a
                href="https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Firefox
              </a>
            </div>
          </SafetyCard>

        </div>
      </section>

      {/* ── Section C — Player ── */}
      <section className="space-y-4">

        {/* Source picker */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted font-medium">Source</span>
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSourceClick(s)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                s.mode === 'embed' && source === s.id
                  ? 'bg-red/15 text-red border-red/30'
                  : 'text-text-muted border-[rgba(255,255,255,0.08)] hover:text-text-secondary hover:border-[rgba(255,255,255,0.15)]',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
          <span className="text-2xs text-text-muted ml-1">VidSrc plays here · CineGram &amp; WatchTV open in a new tab</span>
        </div>

        {type === 'tv' && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-text-muted font-medium">Season</label>
            <select
              value={season}
              onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setIframeLoaded(false) }}
              className="px-3 py-1.5 rounded-lg text-xs bg-surface-elevated text-text-primary border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[rgba(255,255,255,0.25)]"
            >
              {Array.from({ length: SEASON_COUNT }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>S{String(s).padStart(2, '0')}</option>
              ))}
            </select>
            <label className="text-xs text-text-muted font-medium">Episode</label>
            <select
              value={episode}
              onChange={(e) => { setEpisode(Number(e.target.value)); setIframeLoaded(false) }}
              className="px-3 py-1.5 rounded-lg text-xs bg-surface-elevated text-text-primary border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[rgba(255,255,255,0.25)]"
            >
              {Array.from({ length: EPISODE_COUNT }, (_, i) => i + 1).map((ep) => (
                <option key={ep} value={ep}>E{String(ep).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        )}

        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-elevated border border-[rgba(255,255,255,0.07)]">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-elevated z-10">
              <div className="w-8 h-8 border-2 border-text-muted border-t-red rounded-full animate-spin" />
            </div>
          )}
          <iframe
            key={iframeKey}
            src={iframeSrc}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            referrerPolicy="origin"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>

        <p className="text-2xs text-text-muted text-center">
          Streaming content is served by a third-party provider. We recommend using a VPN and ad blocker above.
        </p>
      </section>
    </>
  )
}

export default function WatchPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <WatchContent />
    </Suspense>
  )
}
