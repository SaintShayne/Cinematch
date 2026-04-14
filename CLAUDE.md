# CineMatch — Claude Context File

> This file is read automatically by Claude Code at the start of every session.
> Full practices reference: `docs/working-practices.md`

---

## Who I am and what I'm building

I'm SaintShayne. I'm actively moving from **Level 1 AI coding** (vibe coding, trust the output)
toward **Level 3–4** (understand every line, write tests that mean something, use Git and Docker
like a professional). I am not there yet. I need Claude to help me get there, not just get
the task done.

**Do not just complete tasks for me silently.**
Explain what you are doing and why, especially for:
- Any git command (what it does, why now, what happens if I skip it)
- Any Docker command (what changed, why rebuild vs restart)
- Any new file or pattern I haven't used before
- Any security-relevant decision

---

## The project

**CineMatch** — a full-stack movie discovery platform.

| Layer | Tech | Entry point |
|---|---|---|
| Frontend | Next.js 14, Tailwind, Supabase JS | `frontend/app/` |
| Backend | FastAPI, Python 3.11, uvicorn | `src/api/main.py` |
| ML/Search | scikit-learn TF-IDF, BM25, fuzzy | `src/models/`, `src/services/` |
| Auth/DB | Supabase (Postgres + Auth) | `supabase/schema.sql` |
| Containers | Docker + Compose | `Dockerfile.*`, `docker-compose.yml` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

Full architecture: `docs/working-practices.md` → Architecture section.

---

## How to work with me

### Always do this
- Give me git commands one at a time with a one-line explanation of what each one does
- Tell me which files are being changed and why, before changing them
- When something auto-generates files (npm install, build, pytest), say so explicitly
- If CI is failing, explain what the failure means before fixing it
- When I'm working across phases, give me a checklist I can tick off

### Never do this
- Make multiple unrelated changes in one response without listing them
- Commit or push without telling me what is being committed and why
- Create files I didn't ask for
- Use "it works" as a reason — explain the mechanism
- Skip explaining a pattern I haven't seen before in this codebase

### My known weak spots
- I confuse auto-generated files with source files — always say which is which
- Multi-phase tasks: I lose context after Phase 1 — break every phase into ≤5 checkboxes
- Git: I know the commands but not always when/why to use them
- Docker: I default to `down` + `up` for everything — remind me of the right command

---

## Current project state

**CI status:** GREEN — all 16 E2E tests pass; backend pytest and frontend Next.js build both passing.

**Last worked on:** E2E test suite stabilisation. Fixed Next.js 16 concurrent scheduler race condition in recommendations page — `router.replace` was being dropped when called in the same tick as `setState`; replaced with `window.history.replaceState`. All fixes merged through develop → staging → main.

**Active branch:** `main` (clean, linear history).

**Local dev:** Run frontend with `cd frontend && npm run dev`, backend with
`uvicorn src.api.main:app --reload --port 8000`. Docker is for integration testing only.
