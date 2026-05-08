"""
FastAPI backend for the CineMatch Movie Recommender project.

Hardening additions (v4.0):
  - slowapi rate limiting per endpoint
  - Structured request logging with latency
  - Standardised error envelope: { success, error: { code, message } }
  - Input validation (max query length, chat input sanitisation)
  - Admin endpoints (user list, stats, feature flags)
  - 2FA endpoints (TOTP setup/verify, Telegram OTP via real Bot API)
"""

import os
import re as _re
import random as _random
import secrets
import time
from datetime import datetime
import requests as _http
import stripe as _stripe

import logging
import pyotp
import qrcode
import qrcode.image.svg
import io
import base64
from fastapi import FastAPI, HTTPException, Query, Path, Request, Depends, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from src.services.recommendation_service import RecommendationService
from src.config.settings import MOVIES_CSV, CREDITS_CSV
from src.utils.logger import get_logger, RequestTimer

# ── Logging ──────────────────────────────────────────────────────────────────

logger = get_logger("cinematch.api")

# ── Rate limiter ──────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CineMatch API",
    description=(
        "Production-hardened backend for CineMatch: rate limiting, structured logging, "
        "RBAC admin endpoints, 2FA (TOTP + real Telegram Bot API)."
    ),
    version="4.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────

_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = (
    ["*"]
    if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Middleware: request logging ───────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    latency_ms = round((time.perf_counter() - start) * 1000, 1)
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "latency_ms": latency_ms,
            "client": request.client.host if request.client else "unknown",
        },
    )
    return response

# ── Service ───────────────────────────────────────────────────────────────────

service = RecommendationService(MOVIES_CSV, CREDITS_CSV)

# ── In-memory store (DEV ONLY) ────────────────────────────────────────────────
# Stores:  { user_id: { secret, enable_2fa, auth_method } }
# In production this should be replaced with the Supabase admin_settings table.
_admin_2fa_store: dict[str, dict] = {}

# Telegram OTP pending verification: { user_id: { code, expires_at } }
_telegram_otp_store: dict[str, dict] = {}

# Telegram bot credentials: { user_id: { bot_token, chat_id } }
# Stored in memory for dev; use an encrypted DB column in production.
_telegram_config_store: dict[str, dict] = {}

# Feature flags (in-memory, reset on restart; use a DB table in production)
_feature_flags = {
    "enable_chat": True,
    "enable_recommendations": True,
}

# Restore Telegram 2FA from env vars on startup so it survives Render restarts.
# Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Render → Environment once after setup.
_tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
_tg_chat  = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
if _tg_token and _tg_chat:
    _telegram_config_store["dev-admin"] = {"bot_token": _tg_token, "chat_id": _tg_chat}
    _admin_2fa_store["dev-admin"] = {"enable_2fa": True, "auth_method": "telegram"}

# Stripe — set STRIPE_SECRET_KEY in Render (live) or .env (test)
_stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

# ── Helpers ───────────────────────────────────────────────────────────────────

def _error(code: str, message: str, status: int = 400) -> JSONResponse:
    """Return a standardised error envelope."""
    return JSONResponse(
        status_code=status,
        content={"success": False, "error": {"code": code, "message": message}},
    )


def _ok(data: dict) -> dict:
    """Wrap a successful payload."""
    return {"success": True, **data}


MAX_QUERY_LENGTH = 200  # characters
MAX_CHAT_LENGTH = 1000


def _sanitise(text: str, max_len: int = MAX_QUERY_LENGTH) -> str:
    """Strip leading/trailing whitespace and enforce max length."""
    text = text.strip()
    if len(text) > max_len:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds maximum length of {max_len} characters.",
        )
    return text


# ── DEV-ONLY admin bootstrap ──────────────────────────────────────────────────
# WARNING: Hardcoded credentials for local development ONLY.
# Remove or gate behind an environment check before production deployment.
_DEV_ADMIN_USERNAME = "admin"
_DEV_ADMIN_PASSWORD = "admin"  # noqa: S105  # DEV ONLY


def _is_dev_admin(username: str, password: str) -> bool:
    """DEV ONLY — authenticate the hardcoded fallback admin account."""
    return username == _DEV_ADMIN_USERNAME and password == _DEV_ADMIN_PASSWORD


# ── Chat helpers (unchanged from v3) ──────────────────────────────────────────

# Strips trailing casual phrases that users append after a movie title.
# e.g. "I watched Goodfellas last night" → captures "Goodfellas last night"
# without this, because _END only matches punctuation / end-of-string.
_TRAILING_NOISE = _re.compile(
    r'\s+(?:'
    r'(?:last|this|the other)\s+(?:night|week|weekend|year|month|day|time|evening)'
    r'|yesterday|today|tonight|recently|earlier|already|again|now|though|too|lol|btw'
    r')$',
    _re.IGNORECASE,
)


def _find_seed_movie(message: str) -> str | None:
    _Q = r'["\u201c\u201d\u2018\u2019]?'
    _TITLE = r'([A-Za-z][^"\'?!\n]{1,50}?)'
    _END = r'(?:\s*\(|\s*$|\s*[?!,.])'
    patterns = [
        # "movies/films like X", "similar to X", "more like X", "something/anything like X"
        rf'(?:movies?\s+like|films?\s+like|similar\s+to|more\s+like|something\s+like|anything\s+like)\s+{_Q}{_TITLE}{_Q}{_END}',
        # "I loved/liked/enjoyed/watched/saw/adored X"
        rf'i\s+(?:loved?|liked?|enjoyed?|watched?|saw|adored?|rewatched?)\s+{_Q}{_TITLE}{_Q}{_END}',
        # "after watching X" / "after X"
        rf'after\s+(?:watching\s+)?{_Q}{_TITLE}{_Q}{_END}',
        # "fans of X" / "fan of X"
        rf'fans?\s+of\s+{_Q}{_TITLE}{_Q}{_END}',
        # "X vibes" (quoted or plain: 'Inception vibes')
        rf'{_Q}{_TITLE}{_Q}\s+vibes?',
        # "recommend something like X" / "suggest something like X"
        rf'(?:recommend|suggest)\s+something\s+like\s+{_Q}{_TITLE}{_Q}{_END}',
        # "what should I watch after X"
        rf'watch\s+after\s+{_Q}{_TITLE}{_Q}{_END}',
        # "just finished/watched/seen/completed X" / "just done with X"
        rf'just\s+(?:finished|watched|seen|completed|done\s+with)\s+{_Q}{_TITLE}{_Q}{_END}',
        # "done with X" / "done watching X"
        rf'done\s+(?:with|watching)\s+{_Q}{_TITLE}{_Q}{_END}',
        # "finished X" (without "just")
        rf'finished\s+{_Q}{_TITLE}{_Q}{_END}',
    ]
    for pat in patterns:
        m = _re.search(pat, message, _re.IGNORECASE)
        if m:
            title = m.group(1).strip().rstrip(',')
            title = _TRAILING_NOISE.sub('', title).strip().rstrip(',')
            return title or None
    return None


# Maps user-input genre terms to TMDB genre names used in the dataset
_GENRE_MAP: dict[str, str] = {
    'horror':           'Horror',
    'scary':            'Horror',
    'thriller':         'Thriller',
    'suspense':         'Thriller',
    'comedy':           'Comedy',
    'funny':            'Comedy',
    'humor':            'Comedy',
    'humour':           'Comedy',
    'romance':          'Romance',
    'romantic':         'Romance',
    'drama':            'Drama',
    'action':           'Action',
    'adventure':        'Adventure',
    'sci-fi':           'Science Fiction',
    'science fiction':  'Science Fiction',
    'fantasy':          'Fantasy',
    'animation':        'Animation',
    'animated':         'Animation',
    'documentary':      'Documentary',
    'mystery':          'Mystery',
    'western':          'Western',
    'musical':          'Music',
    'music':            'Music',
    'crime':            'Crime',
    'war':              'War',
    'biography':        'History',
    'biopic':           'History',
    'historical':       'History',
    'family':           'Family',
    'superhero':        'Action',
}


def _extract_genre(message: str) -> str | None:
    """Return the TMDB genre name for the first genre keyword found (longest match first)."""
    msg_lower = message.lower()
    for term in sorted(_GENRE_MAP, key=len, reverse=True):
        if term in msg_lower:
            return _GENRE_MAP[term]
    return None


_NEXT_TO_WATCH_PATTERNS = [
    r'\bwhat (?:should )?i watch next\b',
    r'\bwhat(?:\'s| is) next (?:to watch|on my list)\b',
    r'\bjust (?:finished|watched|seen)\b',
    r'\bdone (?:with|watching)\b',
    r'\bwhat (?:should i |to )?watch after\b',
    r'\bwhat else should i watch\b',
    r'\bnext (?:movie|film|watch)\b',
    r'\bwhat (?:should i|do i) watch\b',
]


def _is_next_to_watch_query(message: str) -> bool:
    msg = message.lower()
    return any(_re.search(p, msg) for p in _NEXT_TO_WATCH_PATTERNS)


def _best_search_match(search_results: list[dict], candidate: str) -> dict | None:
    """
    Prefer an exact title match from search results over a contains match.
    search_movies() uses str.contains so 'The Dark Knight' also returns
    'The Dark Knight Rises', which then seeds the wrong recommendations.
    """
    cand_lower = candidate.strip().lower()
    for r in search_results:
        if r["title"].strip().lower() == cand_lower:
            return r
    return search_results[0] if search_results else None


def _get_dataset_suggestions(service, message: str, context_titles: list[str]) -> tuple[list[str], str | None]:
    """
    Returns (title_list, seed_title).
    seed_title is the canonical dataset title of the movie the user mentioned
    so the endpoint can strip it from chips (don't recommend what they just said they love).
    """
    # 1. Specific movie mentioned → recommendations seeded from that movie
    candidate = _find_seed_movie(message)
    if candidate:
        search_results = service.search_movies(candidate, 10)
        match = _best_search_match(search_results, candidate)
        if match:
            seed_title = match["title"]
            try:
                recs, _ = service.get_recommendations(seed_title, 6)
                if recs:
                    # Exclude seed itself defensively (recommender already does this,
                    # but guard against edge cases like sequel/prequel title collisions)
                    titles = [r["title"] for r in recs if r["title"].lower() != seed_title.lower()]
                    return titles[:5], seed_title
            except Exception:
                pass

    # 2. Genre query → use get_movies_by_genre (reliable) not semantic search (unreliable)
    genre = _extract_genre(message)
    if genre:
        try:
            result = service.get_movies_by_genre(genre, page=1, page_size=50)
            movies = result.get("movies", [])
            if movies:
                # Sort by rating descending, take top 5 well-known films
                top = sorted(movies, key=lambda m: m.get("vote_average", 0), reverse=True)[:5]
                return [m["title"] for m in top], None
        except Exception:
            pass

    # 3. Personalised fallback — recommendations seeded from the user's watchlist
    for title in context_titles[:3]:
        try:
            recs, _ = service.get_recommendations(title, 5)
            if recs:
                return [r["title"] for r in recs[:5]], None
        except Exception:
            continue

    # 4. Generic semantic search (open-ended query, no genre keyword, no watchlist)
    try:
        results = service.semantic_search_movies(message, 5)
        if results:
            return [r["title"] for r in results[:5]], None
    except Exception:
        pass

    try:
        trending = service.get_trending(20)
        movies = trending.get("movies", [])
        if movies:
            sample = _random.sample(movies, min(5, len(movies)))
            return [m["title"] for m in sample], None
    except Exception:
        pass

    return [], None


# ── Pydantic models ───────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    messages: list[dict[str, str]] = []
    message: str
    context_titles: list[str] = []

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message cannot be empty")
        if len(v) > MAX_CHAT_LENGTH:
            raise ValueError(f"message exceeds {MAX_CHAT_LENGTH} characters")
        return v


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class TwoFAVerifyRequest(BaseModel):
    user_id: str
    token: str


class TwoFASetupRequest(BaseModel):
    user_id: str


class TelegramOTPRequest(BaseModel):
    user_id: str


class TelegramOTPVerifyRequest(BaseModel):
    user_id: str
    code: str


class TelegramConfigRequest(BaseModel):
    user_id: str
    bot_token: str
    chat_id: str


class WatchlistRecsRequest(BaseModel):
    titles: list[str]
    n: int = 12


class FeatureFlagRequest(BaseModel):
    flag: str
    enabled: bool


class RoleUpdateRequest(BaseModel):
    user_id: str
    role: str  # 'admin' | 'user'


# ── System endpoints ──────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
def root():
    return _ok({"message": "CineMatch API is running", "version": "4.0.0"})


@app.get("/health", tags=["System"])
def health():
    return _ok({"status": "healthy"})


@app.get("/stats", tags=["System"])
def get_stats():
    return _ok({"stats": service.get_stats()})


# ── Browse endpoints ──────────────────────────────────────────────────────────

@app.get("/genres", tags=["Browse"])
def get_genres():
    genres = service.get_genres()
    return _ok({"count": len(genres), "genres": genres})


@app.get("/movies", tags=["Browse"])
def get_movies(
    genre: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    genres = service.get_genres()
    if genre not in genres:
        return _error("NOT_FOUND", f"Genre '{genre}' not found", 404)
    return _ok({"data": service.get_movies_by_genre(genre, page, page_size)})


@app.get("/movie/{title}", tags=["Browse"])
def get_movie_details(title: str = Path(...)):
    movie = service.get_movie_details(title)
    if not movie:
        return _error("NOT_FOUND", "Movie not found", 404)
    return _ok({"movie": movie})


@app.get("/person/{name}", tags=["Browse"])
def get_person_details(name: str = Path(...)):
    person = service.get_person_details(name)
    if not person:
        return _error("NOT_FOUND", "Person not found", 404)
    return _ok({"person": person})


@app.get("/trending", tags=["Browse"])
def get_trending(limit: int = Query(20, ge=1, le=50)):
    return _ok({"data": service.get_trending(limit)})


# ── Search endpoints (rate-limited) ──────────────────────────────────────────

@app.get("/search", tags=["Search"])
@limiter.limit("30/minute")
def search_movies(
    request: Request,
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
):
    query = _sanitise(query)
    with RequestTimer(logger, "search", query=query):
        results = service.search_movies(query, limit)
    return _ok({"query": query, "count": len(results), "results": results})


@app.get("/semantic-search", tags=["Search"])
@limiter.limit("30/minute")
def semantic_search_movies(
    request: Request,
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20),
):
    query = _sanitise(query)
    with RequestTimer(logger, "semantic-search", query=query):
        results = service.semantic_search_movies(query, limit)
    return _ok({"query": query, "count": len(results), "results": results})


# ── Recommendations endpoint (rate-limited) ───────────────────────────────────

@app.get("/recommend", tags=["Recommendations"])
@limiter.limit("20/minute")
def recommend(
    request: Request,
    movie: str = Query(...),
    n: int = Query(10, ge=1, le=20),
):
    if not _feature_flags.get("enable_recommendations", True):
        return _error("FEATURE_DISABLED", "Recommendations are currently disabled", 503)
    movie = _sanitise(movie)
    with RequestTimer(logger, "recommend", movie=movie):
        recommendations, posters = service.get_recommendations(movie, n)
    if not recommendations:
        return _error("NOT_FOUND", "Movie not found", 404)
    return _ok({
        "movie": movie,
        "count": len(recommendations),
        "recommendations": recommendations,
        "posters": posters,
    })


@app.post("/recommend/watchlist", tags=["Recommendations"])
@limiter.limit("20/minute")
def recommend_from_watchlist(request: Request, body: WatchlistRecsRequest):
    if not _feature_flags.get("enable_recommendations", True):
        return _error("FEATURE_DISABLED", "Recommendations are currently disabled", 503)
    if not body.titles:
        return _error("BAD_REQUEST", "titles list cannot be empty", 400)
    # Cap and sanitise each title to prevent abuse
    titles = [_sanitise(t) for t in body.titles[:20]]
    recs, posters = service.get_watchlist_recommendations(titles, body.n)
    return _ok({
        "count": len(recs),
        "recommendations": recs,
        "posters": posters,
    })


# ── Chat endpoint (rate-limited) ─────────────────────────────────────────────

@app.post("/chat", tags=["Chat"])
@limiter.limit("10/minute")
def chat(request: Request, body: ChatRequest):
    # Check feature flag
    if not _feature_flags.get("enable_chat", True):
        return _error("FEATURE_DISABLED", "Chat is currently disabled", 503)

    from groq import AuthenticationError, RateLimitError, BadRequestError
    from src.services.chatbot_service import send_message

    try:
        suggestions, seed_movie = _get_dataset_suggestions(
            service, body.message, body.context_titles
        )

        system_note = None
        watchlist_for_llm = body.context_titles or None

        # "What should I watch next?" — check watchlist first, tell LLM the result
        if seed_movie and body.context_titles and _is_next_to_watch_query(body.message):
            wl_matches: list[str] = []
            _BROAD_GENRES = {"Drama", "Adventure", "Action", "Thriller"}

            # Strategy 1: forward recommendation check — is any watchlist title in
            # the seed movie's similar-film neighbourhood?
            try:
                wl_recs, _ = service.get_recommendations(seed_movie, 50)
                rec_titles_lower = {r["title"].lower() for r in wl_recs}
                wl_matches = [t for t in body.context_titles if t.lower() in rec_titles_lower]
            except Exception as e:
                logger.warning("watchlist_check s1 failed for %r: %s", seed_movie, e)

            # Strategy 2: genre-list overlap — require at least one specific genre in
            # common (Drama/Adventure/Action are too broad and cause false positives).
            if not wl_matches:
                try:
                    seed_rows = service.movies_df[
                        service.movies_df["title"].str.lower() == seed_movie.lower()
                    ]
                    if not seed_rows.empty:
                        seed_specific = set(seed_rows.iloc[0]["genre_list"]) - _BROAD_GENRES
                        for t in body.context_titles:
                            t_rows = service.movies_df[
                                service.movies_df["title"].str.lower() == t.lower()
                            ]
                            if not t_rows.empty:
                                t_specific = set(t_rows.iloc[0]["genre_list"]) - _BROAD_GENRES
                                if seed_specific & t_specific:
                                    wl_matches.append(t)
                except Exception as e:
                    logger.warning("watchlist_check s2 failed for %r: %s", seed_movie, e)

            if wl_matches:
                matched_str = ", ".join(f'"{t}"' for t in wl_matches)
                system_note = (
                    f'The user asked what to watch next after "{seed_movie}". '
                    f"From their saved watchlist, these films are a close match: {matched_str}. "
                    f"Recommend these specifically and mention they are already saved in their watchlist."
                )
                suggestions = wl_matches + [t for t in suggestions if t not in wl_matches]
                watchlist_for_llm = wl_matches
            else:
                system_note = (
                    f'The user asked what to watch next after "{seed_movie}". '
                    f"None of their saved watchlist films are a close match. "
                    f'Begin your reply with "Nothing in your watchlist is a great match for {seed_movie}, but..." '
                    f"then recommend from the dataset titles provided."
                )
                watchlist_for_llm = None

        reply, updated_messages = send_message(
            body.messages, body.message, suggestions,
            watchlist_titles=watchlist_for_llm,
            system_note=system_note,
        )
        seed_lower = seed_movie.lower() if seed_movie else None
        reply_lower = reply.lower()
        # Only show chips for titles the LLM actually named, excluding the seed movie
        # the user already mentioned (don't recommend what they just said they love).
        mentioned = [
            t for t in suggestions
            if t.lower() in reply_lower and t.lower() != seed_lower
        ]
        fallback = [t for t in suggestions if t.lower() != seed_lower]
        return _ok({
            "reply": reply,
            "suggested_movies": mentioned if mentioned else fallback,
            "messages": updated_messages,
        })
    except AuthenticationError:
        return _error("AUTH_ERROR", "Invalid Groq API key", 401)
    except BadRequestError as e:
        return _error("BAD_REQUEST", str(e), 402)
    except RateLimitError:
        return _error("RATE_LIMITED", "Groq rate limit reached. Try again shortly.", 429)
    except Exception as e:
        logger.error("chat error", extra={"error": str(e)})
        return _error("SERVICE_ERROR", f"CineMatch unavailable: {e}", 503)


# ── Admin: login ──────────────────────────────────────────────────────────────
# DEV ONLY: the hardcoded admin/admin bypass is intentional for local development.
# In production, replace this with a proper Supabase session check.

@app.post("/admin/login", tags=["Admin"])
def admin_login(body: AdminLoginRequest):
    """
    DEV ONLY — Authenticate with the hardcoded admin account.
    Returns a synthetic session token (not a real JWT — use Supabase auth in prod).
    """
    if not _is_dev_admin(body.username, body.password):
        return _error("UNAUTHORIZED", "Invalid credentials", 401)

    # Synthetic dev token — replace with Supabase JWT verification in production
    dev_token = secrets.token_urlsafe(32)
    logger.info("admin login (DEV)", extra={"username": body.username})
    return _ok({
        "role": "admin",
        "token": dev_token,
        "warning": "DEV ONLY — use Supabase auth in production",
    })


# ── Admin: stats & user management ───────────────────────────────────────────

@app.get("/admin/stats", tags=["Admin"])
def admin_stats():
    """High-level dataset statistics for the admin dashboard."""
    stats = service.get_stats()
    return _ok({
        "total_movies": stats.get("total_movies", 0),
        "total_genres": stats.get("total_genres", 0),
        "feature_flags": _feature_flags,
    })


@app.get("/admin/users", tags=["Admin"])
def get_admin_users():
    """Return all user profiles using the Supabase service role key (bypasses RLS)."""
    supabase_url = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")).rstrip("/")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        return _error("CONFIG_MISSING", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set", 503)
    resp = _http.get(
        f"{supabase_url}/rest/v1/profiles",
        params={"select": "id,email,display_name,role,created_at", "order": "created_at.desc", "limit": "50"},
        headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
        timeout=10,
    )
    if not resp.ok:
        return _error("SUPABASE_ERROR", "Failed to fetch users from Supabase", 502)
    return _ok({"users": resp.json()})


@app.get("/admin/feature-flags", tags=["Admin"])
def get_feature_flags():
    return _ok({"flags": _feature_flags})


@app.post("/admin/feature-flags", tags=["Admin"])
def set_feature_flag(body: FeatureFlagRequest):
    if body.flag not in _feature_flags:
        return _error("NOT_FOUND", f"Flag '{body.flag}' does not exist", 404)
    _feature_flags[body.flag] = body.enabled
    logger.info(
        "feature flag updated",
        extra={"flag": body.flag, "enabled": body.enabled},
    )
    return _ok({"flag": body.flag, "enabled": body.enabled})


# ── Admin: 2FA — TOTP setup ───────────────────────────────────────────────────

@app.post("/admin/2fa/setup", tags=["Admin 2FA"])
def setup_2fa(body: TwoFASetupRequest):
    """
    Generate a TOTP secret for the given admin user.
    Returns the secret and a base64-encoded QR code PNG.
    In production, store the secret encrypted in the admin_settings table.
    """
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=f"admin:{body.user_id}",
        issuer_name="CineMatch",
    )

    # Generate QR code as base64 PNG
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    # Store in memory (DEV ONLY — use Supabase admin_settings in production)
    _admin_2fa_store[body.user_id] = {
        "secret": secret,
        "enable_2fa": False,   # enabled only after successful verification
        "auth_method": "totp",
    }

    logger.info("2fa setup initiated", extra={"user_id": body.user_id})
    return _ok({
        "secret": secret,
        "qr_code": qr_b64,      # base64 PNG — render as <img src="data:image/png;base64,...">
        "provisioning_uri": provisioning_uri,
    })


@app.post("/admin/2fa/verify", tags=["Admin 2FA"])
def verify_2fa(body: TwoFAVerifyRequest):
    """
    Verify a TOTP token.  On success, marks 2FA as active for the user.
    """
    record = _admin_2fa_store.get(body.user_id)
    if not record:
        return _error("NOT_FOUND", "No 2FA setup found for this user", 404)

    totp = pyotp.TOTP(record["secret"])
    if not totp.verify(body.token, valid_window=1):
        return _error("INVALID_TOKEN", "OTP token is incorrect or expired", 401)

    record["enable_2fa"] = True
    logger.info("2fa verified and enabled", extra={"user_id": body.user_id})
    return _ok({"message": "2FA enabled successfully"})


# ── Admin: 2FA — Telegram bot config ─────────────────────────────────────────

@app.post("/admin/2fa/telegram/config", tags=["Admin 2FA"])
def save_telegram_config(body: TelegramConfigRequest):
    """
    Save the Telegram bot token and target chat ID for a user.
    The bot token is stored as-is in memory (dev only); use encrypted storage
    in production.  A test message is NOT sent here — use /send to verify.
    """
    _telegram_config_store[body.user_id] = {
        "bot_token": body.bot_token.strip(),
        "chat_id":   body.chat_id.strip(),
    }
    logger.info("telegram config saved", extra={"user_id": body.user_id})
    return _ok({
        "masked_token": f"...{body.bot_token.strip()[-6:]}",
        "chat_id": body.chat_id.strip(),
    })


@app.get("/admin/2fa/telegram/config/{user_id}", tags=["Admin 2FA"])
def get_telegram_config(user_id: str):
    """Return the saved Telegram config for a user (token is masked)."""
    cfg = _telegram_config_store.get(user_id)
    if not cfg:
        return _ok({"configured": False})
    return _ok({
        "configured":   True,
        "masked_token": f"...{cfg['bot_token'][-6:]}",
        "chat_id":      cfg["chat_id"],
    })


# ── Admin: 2FA — Telegram OTP (real Bot API) ─────────────────────────────────

def _send_telegram_otp(user_id: str, code: str):
    """
    Send a 6-digit OTP to the configured Telegram chat via the Bot API.

    Returns:
        True        — message delivered successfully
        str         — human-readable error description (caller surfaces to the client)
    """
    cfg = _telegram_config_store.get(user_id)
    if not cfg or not cfg.get("bot_token") or not cfg.get("chat_id"):
        msg = "No Telegram bot config found — save your bot token and chat ID first."
        logger.error("telegram config missing", extra={"user_id": user_id})
        return msg

    url  = f"https://api.telegram.org/bot{cfg['bot_token']}/sendMessage"
    text = (
        "🔐 <b>CineMatch admin 2FA code</b>\n\n"
        f"<code>{code}</code>\n\n"
        "Valid for 2 minutes. Do not share this code."
    )
    try:
        resp = _http.post(
            url,
            json={"chat_id": cfg["chat_id"], "text": text, "parse_mode": "HTML"},
            timeout=10,
        )
        resp.raise_for_status()
        logger.info("telegram OTP sent", extra={"user_id": user_id})
        return True
    except _http.exceptions.HTTPError as exc:
        # Surface Telegram's own error description (e.g. "Bad Request: chat not found")
        try:
            detail = exc.response.json().get("description", str(exc))
        except Exception:
            detail = str(exc)
        logger.error("telegram send failed", extra={"user_id": user_id, "error": detail})
        return f"Telegram API error: {detail}"
    except _http.exceptions.Timeout:
        msg = "Telegram API timed out — check your network and try again."
        logger.error("telegram send timeout", extra={"user_id": user_id})
        return msg
    except Exception as exc:
        msg = f"Unexpected error sending OTP: {exc}"
        logger.error("telegram send error", extra={"user_id": user_id, "error": str(exc)})
        return msg


@app.post("/admin/2fa/telegram/send", tags=["Admin 2FA"])
def telegram_send_otp(body: TelegramOTPRequest):
    """
    Generate a 6-digit OTP and deliver it to the user's configured Telegram chat.
    Returns an error if no bot config has been saved for this user.
    The OTP expires after 120 seconds.
    """
    if body.user_id not in _telegram_config_store:
        return _error(
            "CONFIG_MISSING",
            "No Telegram bot config found — save your bot token and chat ID first.",
            400,
        )

    code = f"{_random.randint(0, 999999):06d}"
    _telegram_otp_store[body.user_id] = {
        "code":       code,
        "expires_at": time.time() + 120,
    }

    tg_error = _send_telegram_otp(body.user_id, code)
    if tg_error is not True:
        # Clean up the stored code so the user doesn't get stuck waiting on a
        # code they'll never receive.
        del _telegram_otp_store[body.user_id]
        detail = tg_error if isinstance(tg_error, str) else (
            "Could not deliver the OTP via Telegram — "
            "check your bot token and chat ID, then try again."
        )
        return _error("SEND_FAILED", detail, 502)

    return _ok({"message": "OTP sent via Telegram", "expires_in_seconds": 120})


@app.post("/admin/2fa/telegram/verify", tags=["Admin 2FA"])
def telegram_verify_otp(body: TelegramOTPVerifyRequest):
    """Verify a Telegram OTP code. On success, marks 2FA as active for the user."""
    record = _telegram_otp_store.get(body.user_id)
    if not record:
        return _error("NOT_FOUND", "No pending OTP for this user", 404)
    if time.time() > record["expires_at"]:
        del _telegram_otp_store[body.user_id]
        return _error("EXPIRED", "OTP has expired", 401)
    if record["code"] != body.code:
        return _error("INVALID_TOKEN", "OTP code is incorrect", 401)

    del _telegram_otp_store[body.user_id]
    # Mark 2FA as enabled with telegram method (mirrors TOTP verify behaviour)
    _admin_2fa_store[body.user_id] = {
        "enable_2fa": True,
        "auth_method": "telegram",
    }
    logger.info("telegram 2fa enabled", extra={"user_id": body.user_id})
    return _ok({"message": "Telegram OTP verified — 2FA enabled successfully"})


# ── Admin: 2FA — status & disable ────────────────────────────────────────────

@app.get("/admin/2fa/status/{user_id}", tags=["Admin 2FA"])
def get_2fa_status(user_id: str):
    """Return whether 2FA is enabled for a user and which method is active."""
    record = _admin_2fa_store.get(user_id)
    if not record or not record.get("enable_2fa"):
        return _ok({"enabled": False, "method": None})
    return _ok({"enabled": True, "method": record.get("auth_method", "totp")})


@app.post("/admin/2fa/disable", tags=["Admin 2FA"])
def disable_2fa(body: TwoFASetupRequest):
    """Disable and remove 2FA for a user."""
    if body.user_id in _admin_2fa_store:
        del _admin_2fa_store[body.user_id]
        logger.info("2fa disabled", extra={"user_id": body.user_id})
    return _ok({"message": "2FA disabled"})


# ── Admin: logs viewer ────────────────────────────────────────────────────────
# In production, tail a real log file or query your log aggregator API.

_in_memory_log_buffer: list[dict] = []
_MAX_LOG_BUFFER = 100


class _BufferHandler(logging.Handler):
    def emit(self, record):
        _in_memory_log_buffer.append({
            "ts": self.format(record).split(" | ")[0],
            "level": record.levelname,
            "message": record.getMessage(),
        })
        if len(_in_memory_log_buffer) > _MAX_LOG_BUFFER:
            _in_memory_log_buffer.pop(0)


_buf_handler = _BufferHandler()
logging.getLogger("cinematch.api").addHandler(_buf_handler)


@app.get("/admin/logs", tags=["Admin"])
def get_logs():
    """Return the last 100 in-memory log entries."""
    return _ok({"count": len(_in_memory_log_buffer), "logs": list(reversed(_in_memory_log_buffer))})


# ── Public: issue reports ─────────────────────────────────────────────────────

# ── Payments ──────────────────────────────────────────────────────────────────

class CheckoutSessionRequest(BaseModel):
    success_url: str
    cancel_url: str
    user_id: str | None = None
    email: str | None = None


@app.post("/create-checkout-session", tags=["Payments"])
@limiter.limit("10/minute")
def create_checkout_session(request: Request, body: CheckoutSessionRequest):
    """Create a Stripe Checkout Session for a $3 one-time support payment."""
    if not _stripe.api_key:
        return _error("CONFIG_MISSING", "Payment is not configured yet", 503)
    try:
        create_kwargs: dict = dict(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": 300,
                    "product_data": {
                        "name": "CineMatch Supporter",
                        "description": "A one-time contribution to keep CineMatch running.",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=body.success_url,
            cancel_url=body.cancel_url,
        )
        if body.user_id:
            create_kwargs["client_reference_id"] = body.user_id
        if body.email:
            create_kwargs["customer_email"] = body.email
        session = _stripe.checkout.Session.create(**create_kwargs)
        return _ok({"url": session.url})
    except _stripe.StripeError as exc:
        logger.error("stripe checkout error", extra={"error": str(exc)})
        return _error("STRIPE_ERROR", "Could not create checkout session", 502)


# ── Stripe webhook ────────────────────────────────────────────────────────────

@app.post("/stripe-webhook", tags=["Payments"])
async def stripe_webhook(request: Request):
    """
    Receives Stripe events. On checkout.session.completed, marks the user as
    a supporter in Supabase by setting profiles.is_supporter = true.

    Stripe signs every event with STRIPE_WEBHOOK_SECRET (whsec_...).
    The raw request body must be read before any parsing — FastAPI's Request
    gives us that via request.body().
    """
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        if webhook_secret:
            event = _stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            import json as _json
            event = _stripe.Event.construct_from(_json.loads(payload), _stripe.api_key)
    except Exception as exc:
        logger.error("stripe webhook error", extra={"error": str(exc)})
        return JSONResponse(status_code=400, content={"error": str(exc)})

    if event.type == "checkout.session.completed":
        session_obj = event.data.object
        user_id = getattr(session_obj, "client_reference_id", None)
        if user_id:
            supabase_url = (os.environ.get("SUPABASE_URL") or
                            os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")).rstrip("/")
            service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
            if supabase_url and service_key:
                try:
                    resp = _http.patch(
                        f"{supabase_url}/rest/v1/profiles",
                        params={"id": f"eq.{user_id}"},
                        json={"is_supporter": True},
                        headers={
                            "Authorization": f"Bearer {service_key}",
                            "apikey": service_key,
                            "Prefer": "return=representation",
                        },
                        timeout=10,
                    )
                    if not resp.ok:
                        logger.error("supporter patch rejected", extra={"status": resp.status_code, "body": resp.text})
                    else:
                        updated = resp.json()
                        if updated:
                            logger.info("supporter tag applied", extra={"user_id": user_id})
                        else:
                            logger.error("supporter patch: 0 rows matched — UUID not in profiles", extra={"user_id": user_id})
                except Exception as exc:
                    logger.error("supporter patch failed", extra={"error": str(exc)})
            else:
                logger.error("supporter patch skipped — missing supabase_url or service_key", extra={"user_id": user_id})

    return _ok({"received": True})


# ── Public: issue reports ─────────────────────────────────────────────────────

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
_ALLOWED_DOC_TYPES   = {"application/pdf"}
_MAX_IMAGE_BYTES = 5  * 1024 * 1024   # 5 MB
_MAX_VIDEO_BYTES = 20 * 1024 * 1024   # 20 MB
_MAX_DOC_BYTES   = 10 * 1024 * 1024   # 10 MB


@app.post("/report", tags=["Report"])
@limiter.limit("5/minute")
async def submit_report(
    request: Request,
    category:    str            = Form(...),
    subject:     str            = Form(...),
    description: str            = Form(...),
    email:       str | None     = Form(None),
    attachment:  UploadFile | None = File(None),
):
    """Accept a bug/feedback report. Stores in Supabase and forwards to Telegram."""
    category    = category.strip().lower()
    subject     = subject.strip()
    description = description.strip()

    if category not in ("bug", "feature", "feedback"):
        return _error("INVALID_CATEGORY", "category must be bug, feature, or feedback", 400)
    if not 3 <= len(subject) <= 120:
        return _error("INVALID_SUBJECT", "subject must be 3-120 characters", 400)
    if not 10 <= len(description) <= 2000:
        return _error("INVALID_DESCRIPTION", "description must be 10-2000 characters", 400)

    file_content: bytes | None = None
    file_name:    str   | None = None
    file_type:    str   | None = None

    if attachment and attachment.filename:
        ct = (attachment.content_type or "").lower()
        if ct in _ALLOWED_IMAGE_TYPES:
            max_b = _MAX_IMAGE_BYTES
        elif ct in _ALLOWED_VIDEO_TYPES:
            max_b = _MAX_VIDEO_BYTES
        elif ct in _ALLOWED_DOC_TYPES:
            max_b = _MAX_DOC_BYTES
        else:
            return _error("INVALID_FILE_TYPE",
                          "Unsupported file type. Allowed: JPG/PNG/GIF/WEBP, MP4/MOV/WEBM, PDF", 400)
        file_content = await attachment.read()
        if len(file_content) > max_b:
            return _error("FILE_TOO_LARGE",
                          f"File exceeds the {max_b // (1024*1024)} MB limit for this type", 400)
        file_name = attachment.filename
        file_type = ct

    # Persist to Supabase
    supabase_url = (os.environ.get("SUPABASE_URL") or
                    os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")).rstrip("/")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if supabase_url and service_key:
        try:
            _http.post(
                f"{supabase_url}/rest/v1/reports",
                json={
                    "category": category, "subject": subject,
                    "description": description, "email": email or None,
                    "has_attachment": file_content is not None,
                    "file_name": file_name,
                },
                headers={"Authorization": f"Bearer {service_key}",
                         "apikey": service_key, "Prefer": "return=minimal"},
                timeout=10,
            )
        except Exception as exc:
            logger.warning("report supabase store failed", extra={"error": str(exc)})

    # Forward to Telegram
    if _tg_token and _tg_chat:
        try:
            caption = "\n".join(filter(None, [
                f"\U0001f4cb *New {category.title()} Report*",
                f"*Subject:* {subject}",
                f"*Description:* {description[:800]}",
                f"*Email:* {email}" if email else None,
            ]))
            if file_content:
                is_image  = file_type in _ALLOWED_IMAGE_TYPES
                tg_field  = "photo" if is_image else "document"
                tg_method = "sendPhoto" if is_image else "sendDocument"
                _http.post(
                    f"https://api.telegram.org/bot{_tg_token}/{tg_method}",
                    data={"chat_id": _tg_chat, "caption": caption, "parse_mode": "Markdown"},
                    files={tg_field: (file_name, file_content, file_type)},
                    timeout=30,
                )
            else:
                _http.post(
                    f"https://api.telegram.org/bot{_tg_token}/sendMessage",
                    json={"chat_id": _tg_chat, "text": caption, "parse_mode": "Markdown"},
                    timeout=10,
                )
        except Exception as exc:
            logger.warning("report telegram forward failed", extra={"error": str(exc)})

    logger.info("report received", extra={"category": category, "subject": subject[:50]})
    return _ok({"message": "Report received. Thank you for your feedback."})


@app.get("/admin/reports", tags=["Admin"])
def get_admin_reports():
    """Return all submitted reports from the Supabase reports table."""
    supabase_url = (os.environ.get("SUPABASE_URL") or
                    os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")).rstrip("/")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        return _error("CONFIG_MISSING", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set", 503)
    resp = _http.get(
        f"{supabase_url}/rest/v1/reports",
        params={"select": "id,category,subject,description,email,has_attachment,file_name,created_at",
                "order": "created_at.desc", "limit": "100"},
        headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
        timeout=10,
    )
    if not resp.ok:
        return _error("SUPABASE_ERROR", "Failed to fetch reports", 502)
    return _ok({"reports": resp.json()})

