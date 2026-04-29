import PageHero from '../../components/layout/PageHero'
import Badge from '../../components/ui/Badge'
import SupportCTA from '../../components/support/SupportCTA'

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🔍',
    title: 'Semantic Search',
    desc: 'Describe a vibe, emotion, or plot. The engine understands natural language and finds the right film.',
  },
  {
    icon: '✨',
    title: 'Hybrid Recommendations',
    desc: 'Custom scoring formula combining content similarity, genre overlap, cast, and quality signals.',
  },
  {
    icon: '🤖',
    title: 'AI Chat',
    desc: 'Chat with CineMatch. Ask for recommendations, trivia, or explore genres through conversation.',
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

const ARCH_LAYERS = [
  {
    label: 'Frontend',
    colour: 'border-indigo-500/40',
    items: [
      'Next.js 14: App Router, SSR, API routes',
      'React 18: Context API for auth & watchlist',
      'Tailwind CSS: utility-first styling',
      'Supabase JS: client-side auth + real-time',
    ],
  },
  {
    label: 'Backend',
    colour: 'border-emerald-500/40',
    items: [
      'Python 3.11: FastAPI + Uvicorn',
      'slowapi: per-endpoint rate limiting',
      'Structured JSON logging with latency',
      'Pydantic v2: request validation',
    ],
  },
  {
    label: 'ML / Search',
    colour: 'border-amber-500/40',
    items: [
      'TF-IDF + cosine similarity (scikit-learn)',
      'BM25 keyword scoring (rank-bm25)',
      'Fuzzy matching + franchise alias expansion',
      'Hybrid re-ranking formula',
    ],
  },
  {
    label: 'Auth & Data',
    colour: 'border-rose-500/40',
    items: [
      'Supabase Auth: email + Google OAuth',
      'Supabase Postgres: managed DB',
      'Row-Level Security on all tables',
      'RBAC: user / admin roles',
    ],
  },
]

const SECURITY_ITEMS = [
  {
    title: 'Row-Level Security (RLS)',
    desc: 'All Supabase tables enforce RLS policies; users can only access their own data at the database layer.',
  },
  {
    title: 'Rate Limiting',
    desc: 'slowapi guards every endpoint: /chat (10/min), /recommend (20/min), /search (30/min).',
  },
  {
    title: 'Admin RBAC',
    desc: 'A role column on profiles gates /admin via Next.js middleware before any page code runs.',
  },
  {
    title: 'Two-Factor Authentication',
    desc: 'Admins can enable TOTP (QR code via pyotp) or Telegram OTP (real Bot API via BotFather) as a second factor.',
  },
  {
    title: 'Input Validation',
    desc: 'Pydantic models sanitise all inputs. Queries are length-capped and whitespace-stripped server-side.',
  },
  {
    title: 'Standardised Error Envelopes',
    desc: '{ success, error: { code, message } } ensures no internal details leak to the client.',
  },
]

const TESTING_ITEMS = [
  {
    label: 'pytest: Search API',
    detail: 'tests/test_api_search.py',
    status: 'active',
  },
  {
    label: 'pytest: Recommendations API',
    detail: 'tests/test_api_recommend.py',
    status: 'active',
  },
  {
    label: 'pytest: Chat and Admin APIs',
    detail: 'tests/test_api_chat.py',
    status: 'active',
  },
  {
    label: 'Playwright E2E: Search flow',
    detail: 'tests/e2e/search.spec.js',
    status: 'active',
  },
  {
    label: 'Playwright E2E: Chat interface',
    detail: 'tests/e2e/chat.spec.js',
    status: 'active',
  },
  {
    label: 'CI pipeline (GitHub Actions)',
    detail: '.github/workflows/ci.yml',
    status: 'active',
  },
]

const ROADMAP = [
  { label: 'Watch provider lookup (JustWatch API)', status: 'planned' },
  { label: 'Personalised recommendations from watchlist ML', status: 'planned' },
  { label: 'Director & actor filmography pages', status: 'planned' },
  { label: 'Redis caching for hot search paths', status: 'planned' },
  { label: 'Microservices split (search / recommendations / chat)', status: 'future' },
  { label: 'Dedicated search infrastructure (Meilisearch / Typesense)', status: 'future' },
  { label: 'Mobile app (React Native)', status: 'future' },
]

// ── Components ────────────────────────────────────────────────────────────────

function FeatureCard({ feature }) {
  return (
    <div className="p-5 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
      <div className="text-2xl mb-3">{feature.icon}</div>
      <h3 className="text-sm font-semibold text-text-primary mb-1.5">{feature.title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{feature.desc}</p>
    </div>
  )
}

function ArchCard({ layer }) {
  return (
    <div className={`p-4 rounded-xl bg-surface-elevated border ${layer.colour}`}>
      <p className="font-semibold text-text-primary mb-3 text-sm">{layer.label}</p>
      <ul className="space-y-1.5">
        {layer.items.map((item) => (
          <li key={item} className="text-xs text-text-secondary flex gap-2">
            <span className="text-text-muted mt-0.5">›</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SecurityCard({ item }) {
  return (
    <div className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
      <p className="text-sm font-semibold text-text-primary mb-1">{item.title}</p>
      <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="space-y-14 max-w-3xl">
      <PageHero
        title="About CineMatch"
        subtitle="A full-stack movie discovery platform. Semantic search, hybrid ML recommendations, and an AI chat assistant on a production-hardened architecture."
      />

      {/* What it is */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">What is CineMatch?</h2>
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>
            CineMatch is a full-stack movie recommendation platform demonstrating how semantic
            search, machine learning recommendation engines, and modern web architecture work
            together as a real product, not a tutorial project.
          </p>
          <p>
            The recommendation engine uses a{' '}
            <strong className="text-text-primary">hybrid cosine similarity + BM25</strong> approach
            trained on metadata, genres, cast, and directors from 5,000 TMDB films. The semantic
            search pipeline combines{' '}
            <strong className="text-text-primary">
              TF-IDF, BM25, fuzzy matching, and franchise alias expansion
            </strong>{' '}
            to understand natural language queries.
          </p>
          <p>
            Authentication, user data, and role management are powered by{' '}
            <strong className="text-text-primary">Supabase</strong>. The AI chat assistant runs on{' '}
            <strong className="text-text-primary">Groq LLM (Llama 3.1)</strong>, grounded to the
            dataset for accurate suggestions.
          </p>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Architecture overview</h2>
        <p className="text-xs text-text-muted mb-4">
          Next.js → FastAPI → Supabase Postgres. Each layer is decoupled and independently deployable.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {ARCH_LAYERS.map((layer) => (
            <ArchCard key={layer.label} layer={layer} />
          ))}
        </div>
      </section>

      {/* Recommendation engine detail */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recommendation engine</h2>
        <div className="p-5 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)] space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>
            The engine computes a{' '}
            <strong className="text-text-primary">weighted hybrid score</strong> for every candidate
            film:
          </p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex gap-2">
              <span className="text-indigo-400 font-mono shrink-0">TF-IDF</span>
              Vectorises plot overviews and computes cosine similarity across the corpus.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-mono shrink-0">BM25</span>
              Probabilistic keyword relevance on title, genre, and cast tokens.
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 font-mono shrink-0">Fuzzy</span>
              Tolerates typos and alternate spellings via token-set-ratio matching.
            </li>
            <li className="flex gap-2">
              <span className="text-rose-400 font-mono shrink-0">Quality</span>
              Vote count and average rating signals boost popular consensus picks.
            </li>
          </ul>
          <p>
            Results are re-ranked by genre overlap and franchise membership before the final
            top-N are returned to the client.
          </p>
        </div>
      </section>

      {/* Security */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Security</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECURITY_ITEMS.map((item) => (
            <SecurityCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      {/* Testing & CI */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Testing & CI</h2>
        <div className="space-y-2">
          {TESTING_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated border border-[rgba(255,255,255,0.05)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-sm text-text-secondary flex-1">{item.label}</span>
              <span className="text-[10px] font-mono text-text-muted">{item.detail}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text-muted leading-relaxed">
          The GitHub Actions pipeline runs pytest, builds Next.js, and executes Playwright smoke
          tests on every push to <code className="text-text-secondary">main</code>. Any failing
          step blocks the merge.
        </p>
      </section>

      {/* Deployment */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Deployment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <p className="font-semibold text-text-primary mb-3">Cloud (default)</p>
            <ul className="space-y-1.5 text-text-secondary">
              <li>Vercel: Next.js frontend</li>
              <li>Render: FastAPI backend</li>
              <li>Supabase Cloud: DB + Auth</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            <p className="font-semibold text-text-primary mb-3">Self-hosted (Docker)</p>
            <ul className="space-y-1.5 text-text-secondary">
              <li>Dockerfile.backend: multi-stage Python image</li>
              <li>Dockerfile.frontend: multi-stage Node image</li>
              <li>docker-compose.yml: single-command local stack</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Roadmap & future improvements</h2>
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

      <SupportCTA variant="banner" />
    </div>
  )
}

