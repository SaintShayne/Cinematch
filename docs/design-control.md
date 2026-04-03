# CineMatch — Design Control Points

## Design Token Source of Truth

`frontend/tailwind.config.js` — edit this first for global changes.

| Token | Current Value | What it affects |
|-------|--------------|-----------------|
| `bg` | `#08090b` | Page background |
| `surface` | `#0f1014` | Sidebar, cards base |
| `surface-elevated` | `#16171c` | Card fill, inputs |
| `surface-high` | `#1e1f26` | Hover states, focused inputs |
| `red.DEFAULT` | `#e5091a` | Primary action color |
| `red.bright` | `#ff1a2e` | Hover on buttons |
| `text.primary` | `#f0f0f0` | Headlines, card titles |
| `text.secondary` | `#8a8a9a` | Body text |
| `text.muted` | `#555563` | Placeholder, labels |
| `sans` font | `Inter` | All text |
| `shadow-elevated` | `0 8px 32px rgba(0,0,0,0.5)` | Floating panels |
| `shadow-red-glow` | `0 0 30px rgba(229,9,26,0.3)` | Chat FAB |

---

## File-by-File Safety Rating

### SAFE — Edit freely, no logic risk

| File | What you can change |
|------|-------------------|
| `frontend/tailwind.config.js` | Colors, fonts, spacing scale, shadows, animations |
| `frontend/components/search/SearchBar.jsx` | Input styling, button shape, mode toggle pills, layout |
| `frontend/components/movie/MovieGrid.jsx` | Grid columns, gap, skeleton card shape |
| `frontend/components/ui/Button.jsx` | Button variants, border-radius, padding |
| `frontend/components/ui/Badge.jsx` | Badge colors, size, shape |
| `frontend/components/ui/SectionHeader.jsx` | Title/subtitle typography, spacing |
| `frontend/components/ui/EmptyState.jsx` | Icon size, layout, copy styling |
| `frontend/components/ui/LoadingState.jsx` | Skeleton animation, shimmer |
| `frontend/components/layout/PageHero.jsx` | Hero title/subtitle layout, padding |
| `frontend/components/search/MoodFilters.jsx` | Chip style, gap, scroll behavior |

### MEDIUM — Edit UI safely, avoid touching logic sections

| File | Safe zone | Danger zone |
|------|-----------|-------------|
| `frontend/components/layout/AppShell.jsx` | `lg:ml-[240px]`, padding on `<main>`, overall flex layout | `WatchlistProvider` wrapper — do not remove |
| `frontend/components/layout/SidebarNav.jsx` | Width (`w-[240px]`), link styles, brand area, user section visuals | `useAuth`, `useWatchlist`, `router.push` calls |
| `frontend/components/layout/TopNav.jsx` | Height (`h-14`), input styles, avatar shape | `handleSearch` (line 13–18) — routes to `/recommendations` |
| `frontend/components/movie/MovieCard.jsx` | Poster aspect ratio, card border-radius, info section, hover effects | `handleSelect`, `handleSave` — auth + watchlist logic |
| `frontend/components/movie/RecommendationPanel.jsx` | Card layout, match pill style, explanation tags, skeleton | `handleSelect`, `handleSave` inside `RecommendationCard` |
| `frontend/components/chat/ChatWidget.jsx` | Panel size, bubble styles, FAB shape, header visuals | `sendMessage`, `handleMovieClick`, `useEffect` for scroll |

### RISKY — Logic and UI tightly coupled

| File | Why risky |
|------|-----------|
| `frontend/app/recommendations/page.js` | DEF-002 fix: `useEffect` dep array is intentionally minimal — do not add `count` back |
| `frontend/app/page.js` | Mode state drives which API is called; `activeQuery` gates results vs trending |
| `frontend/app/browse/page.js` | Pagination state tied to genre switch |
| `frontend/middleware.js` | Auth redirect logic — do not touch |
| `frontend/lib/context/WatchlistContext.jsx` | Global state — any change affects all watchlist UI |

---

## Top 5 Files to Edit for UI Redesign

1. **`frontend/tailwind.config.js`** — Change all colors, shadows, fonts globally from one place
2. **`frontend/components/movie/MovieCard.jsx`** — Cards are the primary visual element; redesign the poster area, info section, hover effects
3. **`frontend/components/layout/SidebarNav.jsx`** — Full left nav visual (width, link style, brand logo area)
4. **`frontend/components/search/SearchBar.jsx`** — Home page hero search — safe to completely restyle
5. **`frontend/components/layout/AppShell.jsx`** — Overall page structure (sidebar width offset, main padding, max-width)

---

## Top 5 Files to NOT Break

1. **`frontend/lib/api.js`** — All data fetching; changing endpoint paths or signatures breaks everything
2. **`frontend/lib/context/WatchlistContext.jsx`** — Shared watchlist state; any hook signature change breaks MovieCard + RecommendationPanel + SidebarNav
3. **`frontend/app/recommendations/page.js`** — DEF-002 `useEffect` deps are intentional; adding `count` re-introduces the duplicate fetch bug
4. **`frontend/middleware.js`** — Auth guard; breaking this exposes protected routes
5. **`frontend/lib/context/AuthContext.jsx`** — Auth state used by TopNav, SidebarNav, MovieCard, RecommendationPanel, and all auth pages

---

## Key Pattern: How Cards Get Watchlist State

Both `MovieCard` and `RecommendationCard` call `useWatchlist()` directly.
Do NOT lift this to parent grids — each card needs independent save state.
Safe to restyle the save button, unsafe to remove or restructure the `handleSave` function.

## Key Pattern: Color Usage in Code

Most components use Tailwind arbitrary values like `border-[rgba(255,255,255,0.06)]` inline.
To change the base surface border color globally, search for this pattern and replace,
OR add a custom CSS variable in `globals.css` and reference it in `tailwind.config.js`.
