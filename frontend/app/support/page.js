'use client'

import Link from 'next/link'
import PageHero from '../../components/layout/PageHero'
import Badge from '../../components/ui/Badge'

const TIERS = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Everything you need to discover great films.',
    features: [
      'Full semantic search',
      'AI-powered recommendations',
      'Watchlist (10 films)',
      'CineMatch chat assistant',
    ],
    cta: null,
    current: true,
  },
  {
    name: 'Supporter',
    price: '£3',
    period: 'one-time',
    description: 'Help keep the project running and shape what\'s built next.',
    features: [
      'Everything in Free',
      'Unlimited watchlist',
      'Early access to new features',
      'Your name in the credits',
    ],
    cta: { label: 'Support — £3', href: '#coming-soon' },
    highlight: true,
    current: false,
  },
]

function TierCard({ tier }) {
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
          <span className="text-3xl font-bold text-text-primary">{tier.price}</span>
          <span className="text-xs text-text-muted">{tier.period}</span>
        </div>
        <p className="text-xs text-text-secondary mt-2">{tier.description}</p>
      </div>

      <ul className="space-y-2 mb-6">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {tier.cta ? (
        <div className="space-y-2">
          <button
            id="coming-soon"
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-red text-white hover:bg-red-bright transition-colors"
            onClick={() => {}}
          >
            {tier.cta.label}
          </button>
          <p className="text-center text-2xs text-text-muted">
            Payment not yet enabled — coming soon.
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
  return (
    <div className="space-y-12 max-w-2xl">
      <PageHero
        title="Support CineMatch"
        subtitle="Support the project — help shape what comes next."
      />

      {/* Why support */}
      <section className="text-sm text-text-secondary leading-relaxed space-y-3">
        <p>
          CineMatch is an independent open-source project. It runs entirely on free tiers —
          Vercel, Render, and Supabase — and was built by one developer to demonstrate
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
          <TierCard key={tier.name} tier={tier} />
        ))}
      </div>

      {/* Other ways to help */}
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Other ways to help
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: '⭐',
              title: 'Star on GitHub',
              desc: 'Give the repo a star — it helps with visibility.',
            },
            {
              icon: '🐛',
              title: 'Report issues',
              desc: 'Found a bug or have a feature idea? Open an issue.',
            },
            {
              icon: '📢',
              title: 'Share it',
              desc: 'Tell a fellow film lover or developer about CineMatch.',
            },
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

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        ← Back to search
      </Link>
    </div>
  )
}
