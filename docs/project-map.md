# CineMatch — Project Map

## 1. Project Overview

Next.js 14 (App Router) frontend + FastAPI Python backend + Supabase auth/DB.
Users search movies (smart/semantic or title), get AI-powered recommendations, manage a watchlist, and chat with a movie assistant.
Frontend talks to backend via `http://localhost:8000` (configurable via `NEXT_PUBLIC_API_URL`).
Auth is Supabase; watchlist is stored in Supabase DB; recently-viewed is localStorage.
Styling: Tailwind CSS with a custom dark theme defined in `tailwind.config.js`.
No external UI library — all components are hand-built.

---

## 2. Core Architecture

### Main Folders

| Path | Purpose |
|------|---------|
| `frontend/app/` | Next.js App Router pages (one folder per route) |
| `frontend/components/` | Shared UI components (layout, movie, search, chat, ui, auth) |
| `frontend/lib/` | API client, utils, Supabase clients, contexts, hooks |
| `src/api/` | FastAPI backend entry point |
| `src/services/` | Python recommendation/search/chat logic |
| `tests/e2e/` | Playwright E2E test suite |

### Frontend Flow

```
User action
  → page.js (state + data fetching)
    → api.js (fetch to :8000)
      → component receives data as props
        → renders UI
```

### API Flow

```
frontend api.js
  → GET/POST localhost:8000/<endpoint>
    → src/api/main.py (FastAPI route)
      → src/services/recommendation_service.py
        → returns JSON
```

---

## 3. Top 12 Most Important Files

| File | Purpose | Type | Safe to Edit? |
|------|---------|------|---------------|
| `frontend/tailwind.config.js` | All design tokens: colors, shadows, fonts, animations | logic | YES — this is design ground zero |
| `frontend/components/layout/AppShell.jsx` | Root layout wrapper: sidebar + topnav + chat widget | mixed | MEDIUM — structure logic present (sidebar state, WatchlistProvider) |
| `frontend/components/layout/SidebarNav.jsx` | Left nav: links, watchlist preview, recently viewed, sign out | mixed | MEDIUM — routing logic + auth checks inside |
| `frontend/components/layout/TopNav.jsx` | Header bar: search input → `/recommendations`, user avatar | mixed | MEDIUM — search route logic on line 16 |
| `frontend/components/search/SearchBar.jsx` | Home page search bar + Smart/Title mode toggle | UI | SAFE — pure presentational, all logic via props |
| `frontend/components/movie/MovieCard.jsx` | Movie poster card with save button | mixed | MEDIUM — auth + watchlist logic inside click handlers |
| `frontend/components/movie/MovieGrid.jsx` | Grid layout for MovieCard lists + skeleton | UI | SAFE — layout only, no business logic |
| `frontend/components/movie/RecommendationPanel.jsx` | Grid of rec cards with match %, tags, save | mixed | MEDIUM — watchlist + auth logic inside RecommendationCard |
| `frontend/components/chat/ChatWidget.jsx` | Floating chat FAB + panel + message bubbles | mixed | MEDIUM — API calls + routing inside |
| `frontend/lib/api.js` | All API call functions | logic | NO — changing breaks all data fetching |
| `frontend/lib/context/WatchlistContext.jsx` | Global watchlist state (Supabase) | logic | NO — shared state across all pages |
| `frontend/app/recommendations/page.js` | Recommendations page: search input + fetch + panel | mixed | RISKY — DEF-002 fix lives here (careful with useEffect deps) |

---

## 4. Critical Flows

### Header Search (`TopNav.jsx`)
```
TopNav input [Enter/submit]
  → router.push('/recommendations?movie=<title>')
    → recommendations/page.js reads searchParams.get('movie')
      → useEffect fires fetchRecs()
        → api.recommend() → /recommend
```

### Chat Widget
```
ChatWidget sendMessage()
  → api.chat(history, message, contextTitles) → POST /chat
    → reply + suggested_movies returned
      → MessageBubble renders chips
        → chip click: router.push('/?q=<title>')
          → home page page.js reads ?q param
            → runSearch() fires on mount
```

### Recommendations Page
```
URL: /recommendations?movie=Inception
  → useEffect [initialMovie] fires fetchRecs(initialMovie, 10)
    → api.recommend() → GET /recommend?movie=Inception&n=10
      → setRecs / setPosters
        → RecommendationPanel renders cards
          → card click: router.replace('/recommendations?movie=<new>')
            → initialMovie changes → useEffect re-fires
```

---

## 5. Design Control Points

See `design-control.md` for full details.
