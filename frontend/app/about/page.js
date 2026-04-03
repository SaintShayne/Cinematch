import PageHero from '../../components/layout/PageHero'
import Badge from '../../components/ui/Badge'
import SupportCTA from '../../components/support/SupportCTA'
import { TECH_STACK } from '../../lib/constants'

const FEATURES = [
  {
    icon: '🔍',
    title: 'Semantic Search',
    desc: 'Describe a vibe, emotion, or plot — the engine understands natural language and finds the right film.',
  },
  {
    icon: '✨',
    title: 'Hybrid Recommendations',
    desc: 'A custom scoring formula combining content similarity, genre overlap, cast, and quality signals.',
  },
  {
    icon: '🤖',
    title: 'AI Chat',
    desc: 'Chat with CineMatch — ask for recommendations, trivia, or explore genres through conversation.',
  },
  {
    icon: '🎬',
    title: '5,000+ Films',
    desc: 'Sourced from the TMDB dataset with enriched metadata, posters, ratings, and full cast data.',
  },
  {
    icon: '🔖',
    title: 'Personal Watchlist',
    desc: 'Sign in to save films to your watchlist, persisted across devices with Supabase.',
  },
  {
    icon: '🕓',
    title: 'Recently Viewed',
    desc: 'Your viewing history is tracked locally and synced to your account when signed in.',
  },
]

const ROADMAP = [
  { label: 'Watch provider lookup', status: 'planned' },
  { label: 'Personalised recommendations based on your watchlist', status: 'planned' },
  { label: 'Director & actor filmography pages', status: 'planned' },
  { label: 'Movie detail pages', status: 'planned' },
  { label: 'Mobile app', status: 'future' },
]

function FeatureCard({ feature }) {
  return (
    <div className="p-5 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
      <div className="text-2xl mb-3">{feature.icon}</div>
      <h3 className="text-sm font-semibold text-text-primary mb-1.5">{feature.title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{feature.desc}</p>
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="space-y-12 max-w-3xl">
      <PageHero
        title="About CineMatch"
        subtitle="A portfolio-grade movie discovery engine built with modern web technology and real AI/ML backends."
      />

      {/* What it is */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">What is CineMatch?</h2>
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>
            CineMatch is a full-stack movie recommendation platform demonstrating how semantic search,
            machine learning recommendation engines, and modern web architecture work together
            as a real product.
          </p>
          <p>
            The recommendation engine uses a <strong className="text-text-primary">hybrid cosine similarity + BM25</strong> approach
            trained on metadata, genres, cast, and directors from 5,000 TMDB films. The semantic
            search pipeline combines <strong className="text-text-primary">TF-IDF, BM25, fuzzy matching, and franchise alias expansion</strong> to
            understand natural language queries.
          </p>
          <p>
            Authentication and user data (watchlist, recently viewed) are powered by{' '}
            <strong className="text-text-primary">Supabase</strong>.
            The AI chat assistant runs on <strong className="text-text-primary">Groq LLM (Llama 3.1)</strong>.
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </section>

      {/* Stack */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Technology stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <p className="font-semibold text-text-primary mb-3">Frontend</p>
            <ul className="space-y-1.5 text-text-secondary">
              <li>Next.js 14 (App Router)</li>
              <li>React 18</li>
              <li>Tailwind CSS</li>
              <li>Supabase JS (auth + storage)</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <p className="font-semibold text-text-primary mb-3">Backend</p>
            <ul className="space-y-1.5 text-text-secondary">
              <li>Python 3.11</li>
              <li>FastAPI + Uvicorn</li>
              <li>scikit-learn (TF-IDF, cosine similarity)</li>
              <li>rank-bm25, thefuzz</li>
              <li>Groq LLM API</li>
              <li>TMDB + OMDB poster APIs</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <p className="font-semibold text-text-primary mb-3">Auth & Data</p>
            <ul className="space-y-1.5 text-text-secondary">
              <li>Supabase Auth (Google + email)</li>
              <li>Supabase Postgres</li>
              <li>Row-level security</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <p className="font-semibold text-text-primary mb-3">Deployment</p>
            <ul className="space-y-1.5 text-text-secondary">
              <li>Vercel (frontend)</li>
              <li>Render (FastAPI backend)</li>
              <li>Supabase cloud (DB + auth)</li>
              <li>Docker-ready</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Roadmap</h2>
        <div className="space-y-2">
          {ROADMAP.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated border border-[rgba(255,255,255,0.05)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted flex-shrink-0" />
              <span className="text-sm text-text-secondary flex-1">{item.label}</span>
              <Badge variant={item.status === 'future' ? 'default' : 'red'}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Support CTA */}
      <SupportCTA variant="banner" />
    </div>
  )
}
