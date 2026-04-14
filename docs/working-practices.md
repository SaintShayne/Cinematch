# CineMatch — Working Practices & Reference

> Personal reference for SaintShayne.
> Read this when starting a new session or before any significant change.
> Last updated: 2026-04-15

---

## Table of Contents

1. [The Four Levels of AI Coding](#the-four-levels)
2. [File Taxonomy — What to Touch vs. Never Touch](#file-taxonomy)
3. [Git — Every Command Explained](#git)
4. [Docker — The Right Tool for Each Situation](#docker)
5. [Architecture Reference](#architecture)
6. [Known Issues / CI Status](#known-issues)

---

## The Four Levels

Understanding which level you're at tells you what discipline to add next.

| Level | Mindset | What's missing |
|---|---|---|
| **L1 — Vibe coding** | "It works, ship it" | No understanding of why it works |
| **L2 — Disciplined agentic** | "I understand every file I commit" | Tests, hooks, branch discipline |
| **L3 — Software engineering** | "Tests verify behaviour, not just structure" | Deep function-level understanding |
| **L4 — Staff-level** | "Every line exists for a reason I can defend" | Nothing — this is the goal |

**Where I am now:** Transitioning L1 → L2.

**What L2 looks like in practice:**
- Read every diff before staging (`git diff --staged`)
- One commit = one decision, describable in a single sentence
- Never commit auto-generated files
- Ask "what does this function guarantee?" not just "what does it do?"

---

## File Taxonomy

### The Golden Rule
> If you've never opened it and edited it, and it appeared after running a command — it is auto-generated. Never commit it. Deleting it is safe.

### Full map for this project

```
Cinematch/
│
│  ── YOU OWN THESE (source code — read, edit, commit) ──
│
├── src/                        Python backend source
│   ├── api/main.py             FastAPI app, routes, middleware
│   ├── models/                 ML models (TF-IDF, semantic search)
│   ├── services/               Business logic (recommendations, chat, posters)
│   ├── config/settings.py      Reads environment variables
│   └── utils/                  Shared helpers (cache, logger, concurrency)
│
├── frontend/app/               Next.js pages (one folder = one URL route)
├── frontend/components/        Reusable React components
├── frontend/lib/               API client, contexts, hooks, utils
├── tests/                      pytest (backend) + Playwright (e2e)
├── supabase/schema.sql         Database table definitions
│
├── Dockerfile.backend          How to build the Python container
├── Dockerfile.frontend         How to build the Next.js container
├── docker-compose.yml          How to run both containers together
├── .github/workflows/ci.yml    What GitHub runs on every push
│
├── frontend/tailwind.config.js Design tokens (colors, fonts, shadows)
├── frontend/next.config.js     Next.js configuration
├── playwright.config.js        E2E test configuration
├── requirements.txt            Python dependencies (you maintain this)
├── frontend/package.json       JS dependencies + scripts (you maintain this)
├── .gitignore                  What git ignores (you maintain this)
├── .env                        Secret keys — NEVER commit, NEVER share
├── .env.example                Template for .env — DO commit this
├── CLAUDE.md                   Instructions for Claude Code — DO commit
├── docs/                       Your own documentation — DO commit
└── README.md                   Project description — DO commit
│
│  ── AUTO-GENERATED (never edit, usually gitignored) ──
│
├── frontend/.next/             Next.js build output
│                               Created by: npm run build / npm run dev
│                               Safe to delete. Gitignored ✓
│
├── frontend/node_modules/      Installed JS packages
├── node_modules/               Root-level Playwright packages
│                               Created by: npm install / npm ci
│                               Safe to delete. Gitignored ✓
│
├── __pycache__/                Python bytecode (appears in src/, tests/)
├── .pytest_cache/              pytest run artifacts
│                               Created by: python / pytest
│                               Safe to delete. Gitignored ✓
│
└── cache/posters.json          Poster URL cache from poster_service.py
                                Created by: the running backend
                                Safe to delete. Gitignored ✓

│  ── AUTO-GENERATED BUT COMMIT ANYWAY ──
│
├── frontend/package-lock.json  Exact JS dependency versions
└── package-lock.json           Same for root Playwright packages
                                Created by: npm install
                                WHY commit: locks exact versions so CI and
                                teammates get the same packages you tested with.
```

---

## Git

### The mental model in three questions

| Question | Git concept |
|---|---|
| "Which files belong to this one idea?" | **Stage** (`git add`) |
| "Save this snapshot with a message" | **Commit** (`git commit`) |
| "Upload to GitHub" | **Push** (`git push`) |
| "Combine two lines of work" | **Merge** |

### Commit message format

```
type: short description of what changed

Types: feat / fix / chore / refactor / test / docs
Rule: if you can't describe it in one sentence → you're committing too much
```

Good: `feat: add recent searches dropdown to SearchBar`
Bad: `update stuff` / `fix` / `changes`

---

### Every command, explained

#### Before you start working

```bash
git status
```
> Shows which files have changed since your last commit.
> Always run this first. It tells you what state the repo is in.
> Green = staged (will be in the next commit). Red = not staged yet.

```bash
git pull origin main
```
> Downloads any new commits from GitHub and applies them to your local branch.
> Run this at the start of every session to avoid conflicts.

---

#### Saving work (the daily loop)

```bash
git diff
```
> Shows line-by-line what changed in unstaged files.
> Read this before you stage anything. If you see something unexpected, stop and understand it.

```bash
git add <specific-file>
```
> Stages one file. Prefer this over `git add .` so you know exactly what's in each commit.
> Example: `git add frontend/components/search/SearchBar.jsx`

```bash
git add .
```
> Stages ALL changed files at once.
> Only use this when every changed file belongs to the same commit.
> Risk: you might accidentally stage debug code or unrelated changes.

```bash
git diff --staged
```
> Shows what is currently staged — exactly what will be in your next commit.
> **Run this before every commit.** This is your last chance to catch mistakes.

```bash
git restore --staged <file>
```
> Unstages a file (removes it from the staging area) without losing your changes.
> Use when you staged the wrong file and want to split it into a separate commit.

```bash
git commit -m "feat: add watchlist sorting"
```
> Creates the snapshot with a message.
> One logical change = one commit.
> Ask yourself: "If I had to revert this, is this the exact set of changes I'd undo?"

```bash
git push origin main
```
> Uploads your commits to GitHub.
> Triggers CI (the GitHub Actions workflow runs after every push).
> Before pushing: make sure tests pass locally.

---

#### Reviewing history

```bash
git log --oneline
```
> Shows your commit history, one line per commit.
> Use this to see the story of the project.
> The top commit is the most recent.

```bash
git log --oneline --graph
```
> Same, but draws the branch/merge structure visually.
> Use this to understand if branches have diverged.

```bash
git show <commit-hash>
```
> Shows the full diff of a specific commit.
> Example: `git show e53a377` — see exactly what changed in that commit.

---

#### Branching (for any non-trivial change)

```bash
git checkout -b feat/watchlist-sorting
```
> Creates a new branch and switches to it.
> WHY: isolates your work so main stays clean while you build the feature.
> Rule of thumb: create a branch whenever you're about to touch more than 2 files for one feature.

```bash
git checkout main
```
> Switches back to the main branch.
> Your uncommitted changes will come with you — commit or stash first.

```bash
git merge feat/watchlist-sorting
```
> Merges your feature branch into the current branch (main).
> Run this only when: the feature works end-to-end AND you've reviewed the diff.

```bash
git branch -d feat/watchlist-sorting
```
> Deletes the branch after merging.
> WHY: keeps the branch list clean. The commits are not deleted, just the branch pointer.

```bash
git push origin --delete feat/watchlist-sorting
```
> Deletes the branch on GitHub too.
> Always pair this with the local branch delete.

---

#### Undoing mistakes

```bash
git restore <file>
```
> Discards all unsaved changes to a file, reverting to the last commit.
> WARNING: this is permanent — your changes are gone.

```bash
git stash
```
> Temporarily saves your uncommitted changes and gives you a clean working directory.
> Use when: you need to switch branches but you're not ready to commit.

```bash
git stash pop
```
> Brings back the stashed changes.
> Always pop your stash before creating a new stash — stacking stashes gets confusing.

```bash
git revert <commit-hash>
```
> Creates a NEW commit that undoes a previous commit.
> Safe to use on pushed commits — does not rewrite history.
> Use this instead of reset when the commit is already on GitHub.

```bash
git reset --hard HEAD~1
```
> Deletes the last commit AND discards the changes permanently.
> Only use on commits that have NOT been pushed.
> If it's already on GitHub, use `git revert` instead.

---

#### When CI fails

```bash
git log --oneline -3
```
> See your last 3 commits — check which one triggered the failure.

```bash
git push origin main
```
> After fixing the issue, push again to re-trigger CI.
> GitHub runs CI on every push — no need to do anything special.

---

#### Clean up orphaned data

```bash
git gc --prune=now
```
> Garbage-collects dangling commits and loose objects from deleted branches.
> Run after deleting branches. Makes the repo smaller and cleaner.

---

### What a professional commit session looks like

```bash
# 1. Start of session — get up to date
git pull origin main
git status

# 2. Make your changes in the editor...

# 3. Review before staging
git diff

# 4. Stage only what belongs together
git add frontend/components/search/SearchBar.jsx
git add frontend/lib/recentSearches.js

# 5. Final review of what's staged
git diff --staged

# 6. Commit with a meaningful message
git commit -m "feat: add recent searches dropdown to SearchBar"

# 7. Push (triggers CI)
git push origin main
```

---

## Docker

### The mental model

Docker containers are like servers. You wouldn't restart a whole server just because you changed one line of code. You'd deploy the change and restart only that service.

| Situation | Right command | Wrong command |
|---|---|---|
| You changed a `.py` file | Don't use Docker — use `--reload` | `docker compose down && up` |
| You changed a `.jsx` file | Don't use Docker — use `npm run dev` | `docker compose down && up` |
| You want to test Docker works | `docker compose up -d --build` | — |
| You changed a Dockerfile | `docker compose build <service>` then `up -d` | — |
| You changed an env var | `docker compose down && docker compose up -d` | — |
| Something is broken, clean slate | `docker compose down -v && docker compose up -d --build` | — |

---

### Development workflow (daily use — no Docker)

```bash
# Terminal 1: backend
uvicorn src.api.main:app --reload --port 8000
# --reload: restarts automatically when you save any .py file
# No Docker needed. Changes are instant.

# Terminal 2: frontend
cd frontend && npm run dev
# Next.js hot-reloads on every save.
# No Docker needed. Changes are instant.
```

### Integration testing (verify Docker works before pushing)

```bash
docker compose up -d --build
```
> Builds any image that has changed, starts all containers.
> `-d` = detached (runs in background, you get your terminal back).
> Use this when you want to verify the Dockerized version works before pushing.

```bash
docker compose logs -f backend
```
> Streams the backend logs in real time.
> `-f` = follow (stays open, like `tail -f`).
> Use this to debug if a container isn't behaving.

```bash
docker compose logs -f frontend
```
> Same for the frontend container.

```bash
docker compose ps
```
> Shows which containers are running and their health status.

```bash
docker compose build backend --no-cache
```
> Rebuilds the backend image from scratch, ignoring any cached layers.
> Use when: you added a new pip package to `requirements.txt`.

```bash
docker compose build frontend --no-cache
```
> Same for the frontend.
> Use when: you added a new npm package to `package.json`.

```bash
docker compose down
```
> Stops and removes the containers. Does NOT delete the volumes (your cached data).
> Use when: you changed `.env` or `docker-compose.yml`.

```bash
docker compose down -v
```
> Stops containers AND deletes volumes.
> Use when: you want a completely clean state (database reset, cache cleared).
> WARNING: any data in volumes is gone.

---

### What `Dockerfile.frontend` actually does (two-stage build)

```dockerfile
# Stage 1: builder
# Purpose: install dependencies and compile the Next.js app
# Result: a heavy image with all build tools

FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps     # installs exact versions from package-lock.json
COPY frontend/ .
RUN npm run build                 # creates frontend/.next/ (compiled output)

# Stage 2: runtime
# Purpose: run the compiled app — NO build tools, much smaller image
# Copies only the compiled output from Stage 1

FROM node:20-alpine AS runtime
COPY --from=builder /app/.next ./.next   # only the compiled output
COPY --from=builder /app/node_modules ./node_modules
CMD ["npm", "run", "start"]
```

WHY two stages: the builder image is ~1GB (build tools). The runtime image is ~200MB (just the app). You never want to ship build tools to production.

---

## Architecture

### How a search works end-to-end

```
User types "movies like Inception"
  │
  ▼
frontend/app/page.js              (holds state, calls api.js)
  │
  ▼
frontend/lib/api.js               (fetch → http://localhost:8000/semantic-search)
  │
  ▼
src/api/main.py                   (FastAPI receives the request, validates with Pydantic)
  │
  ▼
src/services/recommendation_service.py   (calls the ML models)
  │
  ▼
src/models/semantic_search.py     (TF-IDF + BM25 + fuzzy matching)
  │
  ▼
returns JSON { success, results: [...] }
  │
  ▼
frontend/components/movie/MovieGrid.jsx   (renders the results)
```

### Key files to know cold

| File | What it does | When you'd edit it |
|---|---|---|
| `src/api/main.py` | All API routes, CORS, rate limiting | Adding a new endpoint |
| `src/config/settings.py` | Reads env vars, sets defaults | Adding a new API key |
| `frontend/lib/api.js` | All fetch calls to the backend | Adding a new frontend feature |
| `frontend/lib/constants.js` | Nav links, mood chips, tech stack | Adding a nav item |
| `frontend/tailwind.config.js` | All design tokens (colors, fonts) | Changing the visual design |
| `supabase/schema.sql` | Database tables and RLS policies | Adding a new data type |
| `.github/workflows/ci.yml` | What runs on every push | Changing CI checks |

---

## Known Issues

### CI — fully green (as of 2026-04-14)

All three CI jobs pass: **backend pytest**, **frontend Next.js build**, **E2E Playwright (16/16)**.

**What was fixed to get here:**
- GitHub Secrets added for `GROQ_API_KEY`, `TMDB_API_KEY`, `OMDB_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Data fixture CSVs added and copied into the CI environment so the ML model loads
- Backend port reuse fixed to avoid conflict when CI reuses an existing server
- **Root cause of the last E2E failure:** Next.js 16's concurrent scheduler drops a `router.replace` call when it fires in the same tick as a `setState`. Fixed in `frontend/app/recommendations/page.js` by replacing `router.replace(...)` with `window.history.replaceState(null, '', newUrl)` in `handleRecSelect`.

**How to diagnose a CI failure if one appears in future:**
1. Go to GitHub → Actions tab
2. Click the failed run
3. Click the failing job
4. Expand the failing step — the error message is there
5. Reproduce the same command locally before pushing a fix

### Scripts directory
`scripts/engine_manual_check.py` and `scripts/semantic_manual_check.py` are debug scripts from development. They are not tests. Consider deleting them or converting to proper pytest tests.
