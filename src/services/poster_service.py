"""
Poster Service

Fetches movie posters with a two-source fallback chain:
  1. TMDB API  - exact title, then cleaned title (strips "The ", "A ", etc.)
  2. OMDB API  - free fallback (1 000 req/day, key at omdbapi.com)

Results are cached locally so each title is only fetched once.
"""

import re
import requests

from src.utils.cache import load_json_cache, save_json_cache
from src.utils.concurrency import run_parallel
from src.config.settings import (
    TMDB_API_KEY,
    TMDB_IMAGE_BASE,
    POSTER_CACHE_PATH,
    OMDB_API_KEY,
)

poster_cache = load_json_cache(POSTER_CACHE_PATH)


def _tmdb_search(query: str) -> str | None:
    """Return a poster URL from TMDB for the given query string, or None."""
    try:
        resp = requests.get(
            "https://api.themoviedb.org/3/search/movie",
            params={"api_key": TMDB_API_KEY, "query": query},
            timeout=5,
        )
        for result in resp.json().get("results", []):
            if result.get("poster_path"):
                return TMDB_IMAGE_BASE + result["poster_path"]
    except Exception:
        pass
    return None


def _omdb_search(title: str) -> str | None:
    """Return a poster URL from OMDB for the given title, or None."""
    if not OMDB_API_KEY or OMDB_API_KEY == "your_omdb_key_here":
        return None
    try:
        resp = requests.get(
            "http://www.omdbapi.com/",
            params={"t": title, "apikey": OMDB_API_KEY, "type": "movie"},
            timeout=5,
        )
        poster = resp.json().get("Poster", "")
        if poster and poster != "N/A":
            return poster
    except Exception:
        pass
    return None


def _clean_title(title: str) -> str | None:
    """Strip common leading articles that can confuse search."""
    cleaned = re.sub(r"^(The|A|An)\s+", "", title, flags=re.IGNORECASE).strip()
    return cleaned if cleaned.lower() != title.lower() else None


def fetch_single_poster(title: str) -> tuple[str, str | None]:
    """Fetch the poster URL for one movie title (fail-safe)."""
    safe_title = "" if title is None else str(title)

    try:
        if safe_title in poster_cache and poster_cache[safe_title] is not None:
            return safe_title, poster_cache[safe_title]

        url = (
            _tmdb_search(safe_title)
            or _tmdb_search(_clean_title(safe_title) or safe_title)
            or _omdb_search(safe_title)
        )
        poster_cache[safe_title] = url
        return safe_title, url
    except Exception:
        poster_cache[safe_title] = None
        return safe_title, None


def fetch_posters(titles: list[str]) -> dict[str, str | None]:
    """Fetch posters for multiple movies concurrently; never raise."""
    safe_titles = ["" if t is None else str(t) for t in titles]

    try:
        results = run_parallel(fetch_single_poster, safe_titles)
        poster_dict = dict(results)
    except Exception:
        poster_dict = {t: None for t in safe_titles}

    # Cache persistence is best-effort and must not break API responses.
    save_json_cache(POSTER_CACHE_PATH, poster_cache)
    return poster_dict
