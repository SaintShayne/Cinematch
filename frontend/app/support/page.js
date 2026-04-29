'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHero from '../../components/layout/PageHero'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../lib/context/AuthContext'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const SHARED_FEATURES = [
  'Full semantic search',
  'AI-powered recommendations',
  'Unlimited watchlist',
  'CineMatch chat assistant',
]

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to discover great films.',
    features: SHARED_FEATURES,
    cta: null,
    current: true,
  },
  {
    name: 'Supporter',
    price: '$3',
    period: 'one-time',
    description: 'A small donation keeps CineMatch running. Every bit counts.',
    features: SHARED_FEATURES,
    comingSoon: ['Exclusive streaming access'],
    highlight: true,
    current: false,
  },
]

function TierCard({ tier, localPrice, onSupport, supporting, user, authLoading }) {
  const displayPrice = tier.highlight && localPrice ? localPrice.display : tier.price

  return (
    <div
      className={`relative p-6 rounded-2xl border transition-colors ${
        tier.highlight
          ? 'bg-surface-elevated border-red/30'
          : 'bg-surface border-[rgba(255,255,255,0.07)]'
      }`}
    >
      {tier.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="red">Recommended</Badge>
        </div>
      )}

      <div className="mb-5">
        <p className="text-sm font-semibold text-text-primary">{tier.name}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-3xl font-bold text-text-primary">{displayPrice}</span>
          {tier.highlight && localPrice && localPrice.code !== 'USD' && (
            <span className="text-xs text-text-muted">≈ $3 USD</span>
          )}
          <span className="text-xs text-text-muted">{tier.period}</span>
        </div>
        <p className="text-xs text-text-secondary mt-2">{tier.description}</p>
      </div>

      <ul className="space-y-2 mb-6">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            {f}
          </li>
        ))}
        {tier.comingSoon?.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-text-muted opacity-50">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            {f} <span className="text-2xs">(coming soon)</span>
          </li>
        ))}
      </ul>

      {!tier.current ? (
        <div className="space-y-2">
          {!authLoading && !user ? (
            <Link
              href="/login"
              className="block w-full py-2.5 rounded-xl text-sm font-medium text-center bg-red text-white hover:bg-red-bright transition-colors"
            >
              Sign in to support
            </Link>
          ) : (
            <button
              onClick={onSupport}
              disabled={supporting || authLoading}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-red text-white hover:bg-red-bright transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              {supporting ? 'Redirecting to Stripe…' : `Support ${displayPrice}`}
            </button>
          )}
          <p className="text-center text-2xs text-text-muted">
            Secure payment via Stripe. Cards, Apple Pay, Google Pay accepted.
          </p>
        </div>
      ) : (
        <div className="py-2.5 text-center text-xs text-text-muted border border-[rgba(255,255,255,0.07)] rounded-xl">
          Current plan
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth()
  const [localPrice, setLocalPrice]   = useState(null)
  const [supporting, setSupporting]   = useState(false)
  const [supportError, setSupportError] = useState(null)
  const [paid, setPaid]               = useState(false)

  // Detect payment=success redirect from Stripe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPaid(new URLSearchParams(window.location.search).get('payment') === 'success')
    }
  }, [])

  // Fetch user's local currency and convert $3 USD
  useEffect(() => {
    async function loadLocalPrice() {
      try {
        const [geoRes, rateRes] = await Promise.all([
          fetch('https://ipapi.co/json/'),
          fetch('https://open.er-api.com/v6/latest/USD'),
        ])
        const geo   = await geoRes.json()
        const rates = await rateRes.json()

        const code = geo.currency || 'USD'
        const rate = rates.rates?.[code] ?? 1
        const amount = Math.ceil(3 * rate)

        const display = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: code,
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
        }).format(amount)

        setLocalPrice({ display, amount, code })
      } catch {
        setLocalPrice(null)
      }
    }
    loadLocalPrice()
  }, [])

  const handleSupport = useCallback(async () => {
    if (supporting) return
    setSupportError(null)
    setSupporting(true)
    try {
      const res = await fetch(`${API}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success_url: `${window.location.origin}/support?payment=success`,
          cancel_url:  `${window.location.origin}/support`,
          user_id: user?.id ?? null,
          email:   user?.email ?? null,
        }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        window.location.href = data.url
        // keep supporting=true — we're navigating away, no need to reset
      } else {
        setSupportError('Could not start checkout. Please try again.')
        setTimeout(() => setSupporting(false), 2000)
      }
    } catch {
      setSupportError('Could not reach the server. Please try again.')
      setTimeout(() => setSupporting(false), 2000)
    }
  }, [supporting, user])

  return (
    <div className="space-y-12 max-w-2xl">
      <PageHero
        title="Support CineMatch"
        subtitle="Help keep CineMatch free and improving."
      />

      {paid && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          Thank you for supporting CineMatch! Your contribution means a lot.
        </div>
      )}

      {/* Why support */}
      <section className="text-sm text-text-secondary leading-relaxed space-y-3">
        <p>
          CineMatch is an independent open-source project. It runs entirely on free tiers:
          Vercel, Render, and Supabase. Built by one developer to demonstrate
          full-stack AI/ML architecture.
        </p>
        <p>
          If you find it useful, a small contribution keeps the APIs running, funds
          future features, and genuinely means a lot.
        </p>
      </section>

      {/* Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {TIERS.map((tier) => (
          <TierCard
            key={tier.name}
            tier={tier}
            localPrice={localPrice}
            onSupport={handleSupport}
            supporting={supporting}
            user={user}
            authLoading={authLoading}
          />
        ))}
      </div>

      {supportError && (
        <p className="text-xs text-red text-center">{supportError}</p>
      )}

      {/* Other ways to help */}
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Other ways to help
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '⭐', title: 'Star on GitHub',  desc: 'Give the repo a star. It helps with visibility.' },
            { icon: '🐛', title: 'Report issues',   desc: 'Found a bug or have a feature idea? File a report.' },
            { icon: '📢', title: 'Share it',         desc: 'Tell a fellow film lover or developer about CineMatch.' },
          ].map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)] text-center"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-xs font-semibold text-text-primary mb-1">{item.title}</p>
              <p className="text-2xs text-text-secondary">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        ← Back to search
      </Link>
    </div>
  )
}
