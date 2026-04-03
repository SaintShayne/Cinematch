# CineBot — Movie Discovery Engine

A full-stack movie recommendation platform with AI-powered semantic search, hybrid ML recommendations, and personalised watchlists.

**Stack:** Next.js · React · Tailwind CSS · Python FastAPI · Supabase Auth · Supabase Postgres · Groq LLM

---

## Project Structure

```
├── frontend/          # Next.js 14 App Router
│   ├── app/           # Pages (Search, Browse, Recs, Watchlist, About, Auth, Profile, Support)
│   ├── components/    # UI, layout, movie, search, auth, chat components
│   └── lib/           # API client, Supabase clients, hooks, context, utils
│
├── src/               # Python FastAPI backend
│   ├── api/main.py    # All API endpoints
│   ├── models/        # Recommender + SemanticSearchEngine
│   └── services/      # RecommendationService, ChatbotService, PosterService
│
├── supabase/
│   └── schema.sql     # Run this once in Supabase SQL editor
│
└── data/raw/          # TMDB CSV datasets (not tracked in git)
```

---

## Local Development

### 1 — Backend (FastAPI)

```bash
# Install Python deps
pip install -r requirements.txt

# Copy and fill in env vars
cp .env.example .env

# Start backend on :8000
uvicorn src.api.main:app --reload
```

Visit `http://localhost:8000/docs` to see the full API.

---

### 2 — Frontend (Next.js)

```bash
cd frontend

# Install Node deps
npm install

# Copy and fill in env vars
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# Start dev server on :3000
npm run dev
```

Visit `http://localhost:3000`.

---

### 3 — Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. For **Google OAuth**:
   - Go to **Authentication → Providers → Google**
   - Add your Google OAuth Client ID and Secret
   - Set Redirect URL in Google Console to: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - For local dev also add: `http://localhost:3000/auth/callback`
6. Go to **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your Vercel URL (prod)
   - Redirect URLs: `http://localhost:3000/auth/callback`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Platform stats |
| GET | `/genres` | All genres |
| GET | `/movies?genre=Action&page=1` | Paginated movies by genre |
| GET | `/movie/{title}` | Single movie details |
| GET | `/search?query=batman` | Title substring search |
| GET | `/semantic-search?query=feel good comedy` | Semantic NLP search |
| GET | `/recommend?movie=Inception&n=10` | Hybrid recommendations |
| GET | `/trending` | Top-ranked films |
| POST | `/chat` | Groq LLM chat |

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
4. Deploy — Vercel auto-detects Next.js

### Backend → Render

1. Create a new Render **Web Service** → connect GitHub repo
2. Set:
   - **Root directory:** `.` (project root)
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn src.api.main:app --host 0.0.0.0 --port $PORT`
3. Add env vars from `.env` + set `ALLOWED_ORIGINS=https://your-app.vercel.app`

### Supabase (Production)

In Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: add `https://your-app.vercel.app/auth/callback`

---

## Required API Keys

| Key | Where | Used for |
|-----|-------|---------|
| `TMDB_API_KEY` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) | Movie posters |
| `OMDB_API_KEY` | [omdbapi.com](http://www.omdbapi.com/apikey.aspx) | Poster fallback (1000 req/day free) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Chat assistant |
| Supabase URL + anon key | Supabase project settings | Auth + database |

All free tier — no credit card required for development or deployment.

---

## Features

- Semantic search — natural language query understanding (TF-IDF + BM25 + fuzzy + franchise aliases)
- Hybrid recommendations — cosine similarity weighted with genre, cast, rating, popularity signals
- AI chat assistant — CineBot powered by Groq Llama 3.1 8B
- Google + email auth — Supabase Auth with email confirmation flow
- Persistent watchlist — per-user, synced to Supabase Postgres
- Recently viewed — localStorage (guests) + DB (signed-in users)
- 5,000+ films — TMDB dataset with posters, ratings, cast, genres
- Cinematic dark UI — Next.js + Tailwind CSS
