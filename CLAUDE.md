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

**Last worked on (v5 update):**
- Renamed "For You" tab to "Recommendations" (star icon)
- Swept all pages for em-dashes; replaced with natural punctuation
- Support page: Stripe Checkout integration, local currency display, shared feature list, sign-in guard
- Report an Issue page: file upload (images/video/PDF), Supabase storage, Telegram forwarding, admin dashboard visibility
- Admin panel: Reports section added (category badges, attachment indicator, Refresh button)
- Stripe webhook: `POST /stripe-webhook` marks `profiles.is_supporter = true` on payment completion
- `client_reference_id` (Supabase user ID) and `customer_email` are passed to Stripe checkout session

**Deployment:**
- Frontend: `https://cinematch.shaynelabs.co` (Vercel, auto-deploys on push to main)
- Backend: `https://cinematch-backend-7v9e.onrender.com` (Render, Docker, free tier — 30s cold start)
- Old Vercel URL `cinematch-nine-pearl.vercel.app` still works but `shaynelabs.co` is canonical

**Auth status:**
- Google OAuth: working on production
- Email registration: working — confirmation emails sent via Resend SMTP from `noreply@shaynelabs.co`
- Supabase redirect URLs: localhost:3000, cinematch.shaynelabs.co, cinematch-nine-pearl.vercel.app all configured

**Admin panel:**
- Access: Google login with `tanlimhan@gmail.com` (role = admin in profiles table) OR `admin`/`admin` dev login
- Dev cookie bypass (`cinematch_dev_admin`) is disabled in production (NODE_ENV guard), active in local dev only
- User management: reads all profiles via `/admin/users` backend endpoint (service role key, bypasses RLS)
- Reports: reads all submitted reports via `/admin/reports` (service role key, bypasses RLS)
- Telegram 2FA: persists across Render restarts via `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` env vars
- Feature flags: `enable_chat` and `enable_recommendations` now both wired to their endpoints

**Stripe payment flow:**
- User must be signed in to trigger checkout (sign-in guard on Support page button)
- Frontend POSTs `user_id` + `email` to `/create-checkout-session`
- Backend creates Stripe Checkout Session with `client_reference_id=user_id` and `customer_email`
- On success, Stripe sends `checkout.session.completed` to `/stripe-webhook`
- Webhook reads `client_reference_id`, PATCHes `profiles.is_supporter = true` in Supabase
- Webhook secret: `STRIPE_WEBHOOK_SECRET` (whsec_... from Stripe dashboard)
- Stripe dashboard webhook URL: `https://cinematch-backend-7v9e.onrender.com/stripe-webhook`
- Event to subscribe: `checkout.session.completed`

**Supabase SQL needed (run once in Supabase SQL editor):**
```sql
-- Support page: track supporter status
alter table profiles add column if not exists is_supporter boolean default false;

-- Report an Issue page
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  subject     text not null,
  description text not null,
  email       text,
  has_attachment boolean default false,
  file_name   text,
  created_at  timestamptz default now()
);
alter table reports enable row level security;
create policy "service role full access" on reports using (true) with check (true);
```

**Env vars needed locally (.env):**
`TMDB_API_KEY`, `OMDB_API_KEY`, `GROQ_API_KEY`, `ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Active branch:** `main` (clean, linear history).

**Local dev:** Run frontend with `cd frontend && npm run dev`, backend with
`uvicorn src.api.main:app --reload --port 8000`. Docker is for integration testing only.
