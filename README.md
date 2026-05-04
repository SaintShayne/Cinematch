# CineMatch — Movie Discovery Platform

A full-stack movie discovery platform with AI-powered semantic search, hybrid ML recommendations, personalised watchlists, and an AI chat assistant.

**Stack:** Next.js 14 · Tailwind CSS · Python FastAPI · Supabase Auth · Supabase Postgres · Groq LLM

---

## Features

- **Semantic search** — natural language query understanding (TF-IDF + BM25 + fuzzy + franchise aliases)
- **Hybrid recommendations** — cosine similarity weighted with genre, cast, rating, and popularity signals
- **AI chat assistant** — powered by Groq Llama 3 8B; suggests movies in context
- **Browse by genre** — paginated grid with genre filter chips
- **Movie detail pages** — poster, cast, ratings, related recommendations
- **Personalised watchlist** — per-user, synced to Supabase Postgres
- **Recently viewed** — localStorage for guests, DB for signed-in users
- **Google + email auth** — Supabase Auth with email confirmation via Resend
- **Support page** — Stripe Checkout integration; local currency display
- **Report an Issue** — file upload (images/video/PDF), stored in Supabase Storage
- **Admin panel** — user management, submitted reports, feature flag toggles
- **Feature flags** — enable/disable chat and recommendations without a deploy
- **Mobile-responsive** — fully usable on phone-sized viewports
- **5,000+ films** — TMDB dataset with posters, ratings, cast, genres

---

## Project Structure

```
├── frontend/              # Next.js 14 App Router
│   ├── app/               # Pages (home, browse, recommendations, watchlist,
│   │                      #        history, movie detail, people, auth, support,
│   │                      #        report, admin, about)
│   ├── components/        # UI, layout, movie, search, auth, chat components
│   └── lib/               # API client, Supabase clients, hooks, context, utils
│
├── src/                   # Python FastAPI backend
│   ├── api/main.py        # All API endpoints
│   ├── models/            # Recommender + SemanticSearchEngine
│   └── services/          # RecommendationService, ChatbotService, PosterService
│
├── supabase/
│   └── schema.sql         # Run once in Supabase SQL editor to create tables
│
├── qa-automation/         # Playwright E2E + API test suite (142 tests)
│   ├── tests/e2e/         # One spec file per feature area
│   ├── playwright.config.js
│   └── package.json
│
└── data/raw/              # TMDB CSV datasets (not tracked in git)
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- A free [Supabase](https://supabase.com) project
- API keys listed in the **Required API Keys** section below

---

### 1 — Backend (FastAPI)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy env template and fill in your keys
cp .env.example .env

# Start backend on port 8000 (auto-reloads on save)
uvicorn src.api.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` to explore the full API interactively.

---

### 2 — Frontend (Next.js)

```bash
cd frontend

# Install JS dependencies
npm install

# Copy env template and fill in your keys
cp .env.local.example .env.local

# Start dev server on port 3000 (hot-reloads on save)
npm run dev
```

Visit `http://localhost:3000`.

---

### 3 — Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — keep secret)
5. For **Google OAuth**:
   - Go to **Authentication → Providers → Google**
   - Add your Google OAuth Client ID and Secret
   - Set Redirect URL in Google Console to: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - For local dev also add: `http://localhost:3000/auth/callback`
6. Go to **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your production URL
   - Redirect URLs: `http://localhost:3000/auth/callback`

---

## Testing

The test suite uses [Playwright](https://playwright.dev) for both browser E2E tests and backend API tests.

```bash
cd qa-automation

# One-time setup
npm install
npx playwright install chromium

# Run all tests
npx playwright test

# Run only smoke tests (fast subset)
npx playwright test --grep @smoke

# Watch mode (see the browser)
npx playwright test --headed --slowMo=500

# Run a single test by ID
npx playwright test --grep TC-055

# Open HTML report with screenshots
npx playwright show-report
```

Tests run automatically on every push and pull request via GitHub Actions.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/` | Version info |
| GET | `/stats` | Total movies and genres |
| GET | `/genres` | All genre names |
| GET | `/movies` | Paginated movies (`?genre=Action&page=1`) |
| GET | `/trending` | Top-ranked films |
| GET | `/movie/{title}` | Single movie detail |
| GET | `/people/{name}` | Person filmography |
| GET | `/search` | Title/BM25 search (`?query=batman`) |
| GET | `/semantic-search` | Natural language search (`?query=feel good comedy`) |
| GET | `/recommend` | Hybrid recommendations (`?movie=Inception&n=10`) |
| GET | `/recommend/watchlist` | Recommendations from a list of titles |
| POST | `/chat` | Groq LLM chat (movie assistant) |
| POST | `/create-checkout-session` | Stripe Checkout session |
| POST | `/stripe-webhook` | Stripe payment webhook |
| GET | `/admin/users` | All user profiles (admin only) |
| GET | `/admin/reports` | All submitted reports (admin only) |
| GET | `/admin/feature-flags` | Feature flag states (admin only) |
| POST | `/admin/feature-flags` | Toggle a feature flag (admin only) |

---

## Deployment

### Frontend → Vercel

1. Push the repo to GitHub
2. Create a new Vercel project → import repo → set root directory to `frontend`
3. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Deploy — Vercel auto-detects Next.js and deploys on every push to `main`

### Backend → Render

1. Create a new Render **Web Service** → connect GitHub repo
2. Set:
   - **Root directory:** `.` (project root)
   - **Dockerfile path:** `Dockerfile.backend`
3. Add all env vars from `.env`
4. Set `ALLOWED_ORIGINS=https://your-app.vercel.app`

### Supabase (Production)

In Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: your Vercel production URL
- Redirect URLs: add `https://your-app.vercel.app/auth/callback`

---

## Required API Keys

| Key | Where to get it | Used for |
|-----|-----------------|---------|
| `TMDB_API_KEY` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) | Movie posters and metadata |
| `OMDB_API_KEY` | [omdbapi.com](http://www.omdbapi.com/apikey.aspx) | Poster fallback (1,000 req/day free) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | AI chat assistant |
| Supabase URL + anon key | Supabase project → Settings → API | Auth + database (frontend) |
| Supabase service role key | Supabase project → Settings → API | Admin endpoints (backend only) |
| `STRIPE_SECRET_KEY` | [dashboard.stripe.com](https://dashboard.stripe.com) | Checkout session creation |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks | Webhook signature verification |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram | Report forwarding + admin 2FA |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | Report forwarding + admin 2FA |

All base tiers are free. No credit card required for development.
