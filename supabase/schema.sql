-- ============================================================
-- CineMatch — Supabase Database Schema
-- If tables already exist, run ONLY the new policy statements below.
-- New policy added: "watchlists: update own" (required for upsert ON CONFLICT DO UPDATE)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    display_name TEXT,
    avatar_url  TEXT,
    -- RBAC: 'user' (default) or 'admin'
    role        TEXT        NOT NULL DEFAULT 'user',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile; admins can read ALL profiles
CREATE POLICY "profiles: select own"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "profiles: insert own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);


-- ── 2. watchlists ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watchlists (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id    TEXT        NOT NULL,
    movie_title TEXT        NOT NULL,
    poster_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, movie_id)
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlists: select own"
    ON public.watchlists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "watchlists: insert own"
    ON public.watchlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlists: update own"
    ON public.watchlists FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "watchlists: delete own"
    ON public.watchlists FOR DELETE
    USING (auth.uid() = user_id);


-- ── 3. recently_viewed ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recently_viewed (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id    TEXT        NOT NULL,
    movie_title TEXT        NOT NULL,
    poster_url  TEXT,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, movie_id)
);

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recently_viewed: select own"
    ON public.recently_viewed FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "recently_viewed: insert own"
    ON public.recently_viewed FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recently_viewed: upsert own"
    ON public.recently_viewed FOR UPDATE
    USING (auth.uid() = user_id);


-- ── 4. admin_settings ────────────────────────────────────────
-- Stores per-admin 2FA preferences and TOTP secrets.
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enable_2fa  BOOLEAN     NOT NULL DEFAULT FALSE,
    -- 'none' | 'totp' | 'telegram'
    auth_method TEXT        NOT NULL DEFAULT 'none',
    totp_secret TEXT,                       -- encrypted TOTP secret (set on 2FA setup)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only the owning admin can read or update their own 2FA settings
CREATE POLICY "admin_settings: select own"
    ON public.admin_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "admin_settings: insert own"
    ON public.admin_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_settings: update own"
    ON public.admin_settings FOR UPDATE
    USING (auth.uid() = user_id);


-- ── 5. donations (scaffold — not yet active) ──────────────────
CREATE TABLE IF NOT EXISTS public.donations (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    email          TEXT,
    amount         NUMERIC(10,2) NOT NULL,
    currency       TEXT        NOT NULL DEFAULT 'GBP',
    payment_status TEXT        NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Donations not user-accessible yet — enable RLS but no policies
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;


-- ── 6. Auto-create profile on signup ─────────────────────────
-- Trigger: whenever a new user is created in auth.users,
-- insert a matching row in public.profiles automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
