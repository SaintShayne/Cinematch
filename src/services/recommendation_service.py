"""
Recommendation service.

This is the business-logic layer between:
- API
- recommender model
- semantic search model
- poster fetching
"""

import json
import math

import pandas as pd
import requests

from src.models.recommender import MovieRecommender
from src.models.semantic_search import SemanticSearchEngine
from src.services.poster_service import fetch_posters
from src.data.loader import load_movies, load_credits
from src.data.preprocessing import extract_genres
from src.config.settings import TMDB_API_KEY


# In-memory cache so the same movie's trailer isn't fetched from TMDB
# more than once per server process lifetime.
_trailer_cache: dict = {}
_watch_providers_cache: dict = {}


def _fetch_trailer(tmdb_id: int) -> str | None:
    """
    Return the first YouTube trailer URL for a TMDB movie ID, or None.

    Calls GET /movie/{id}/videos, filters for site=YouTube + type=Trailer,
    and constructs a standard watch URL from the video key.
    Results are cached in _trailer_cache to avoid repeat API calls.
    """
    if not TMDB_API_KEY:
        return None
    if tmdb_id in _trailer_cache:
        return _trailer_cache[tmdb_id]
    try:
        resp = requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}/videos",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        )
        for v in resp.json().get("results", []):
            if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                url = f"https://www.youtube.com/watch?v={v['key']}"
                _trailer_cache[tmdb_id] = url
                return url
    except Exception:
        pass
    _trailer_cache[tmdb_id] = None
    return None


def _fetch_watch_providers(tmdb_id: int) -> dict | None:
    """
    Return US watch providers for a TMDB movie ID, or None.

    Calls GET /movie/{id}/watch/providers, extracts the US region, and
    returns { link, flatrate, rent, buy } where each provider list contains
    { name, logo } dicts.  Logo URLs are fully qualified (w45 size).
    Results are cached in _watch_providers_cache to avoid repeat API calls.
    """
    if not TMDB_API_KEY:
        return None
    if tmdb_id in _watch_providers_cache:
        return _watch_providers_cache[tmdb_id]
    try:
        resp = requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}/watch/providers",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        )
        us = resp.json().get("results", {}).get("US", {})
        if not us:
            _watch_providers_cache[tmdb_id] = None
            return None

        logo_base = "https://image.tmdb.org/t/p/w45"

        def _map(providers):
            return [
                {
                    "name": p.get("provider_name", ""),
                    "logo": f"{logo_base}{p['logo_path']}" if p.get("logo_path") else None,
                }
                for p in providers
            ]

        # TMDB uses both "free" and "ads" keys for ad-supported free streaming
        free_providers = _map(us.get("free", [])) + _map(us.get("ads", []))

        result = {
            "link":     us.get("link"),
            "flatrate": _map(us.get("flatrate", [])),
            "free":     free_providers,
            "rent":     _map(us.get("rent", [])),
            "buy":      _map(us.get("buy", [])),
        }
        _watch_providers_cache[tmdb_id] = result
        return result
    except Exception:
        pass
    _watch_providers_cache[tmdb_id] = None
    return None


_tmdb_movie_cache: dict = {}


def _fetch_movie_from_tmdb(title: str) -> dict | None:
    """
    Fallback: fetch movie details directly from TMDB when the title isn't in
    the local dataset.  Makes three calls:
      1. /search/movie  — find the TMDB movie ID from the title
      2. /movie/{id}    — full details (genres, runtime, tagline, etc.)
      3. /movie/{id}/credits — director and top-5 cast

    Then re-uses the existing _fetch_trailer and _fetch_watch_providers helpers.
    Results are cached in _tmdb_movie_cache.
    """
    if not TMDB_API_KEY:
        return None
    cache_key = title.strip().lower()
    if cache_key in _tmdb_movie_cache:
        return _tmdb_movie_cache[cache_key]

    try:
        # ── 1. Search ──────────────────────────────────────────────────────
        results = requests.get(
            "https://api.themoviedb.org/3/search/movie",
            params={"api_key": TMDB_API_KEY, "query": title},
            timeout=5,
        ).json().get("results", [])

        if not results:
            _tmdb_movie_cache[cache_key] = None
            return None

        # Prefer an exact title match; fall back to the first result
        match = next(
            (r for r in results if r.get("title", "").lower() == title.lower()),
            results[0],
        )
        tmdb_id = match["id"]

        # ── 2. Full details ────────────────────────────────────────────────
        detail = requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        ).json()

        # ── 3. Credits ─────────────────────────────────────────────────────
        credits_data = requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}/credits",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        ).json()

        poster_base = "https://image.tmdb.org/t/p/w500"

        crew     = credits_data.get("crew", [])
        directors = [c["name"] for c in crew if c.get("job") == "Director"]
        cast      = [c["name"] for c in credits_data.get("cast", [])[:5]]

        release_year = None
        rd = detail.get("release_date", "") or ""
        if rd:
            try:
                release_year = int(rd[:4])
            except ValueError:
                pass

        result = {
            "title":        detail.get("title", title),
            "release_year": release_year,
            "vote_average": detail.get("vote_average", 0),
            "vote_count":   detail.get("vote_count"),
            "overview":     detail.get("overview", ""),
            "genres":       [g["name"] for g in detail.get("genres", [])],
            "poster_url":   f"{poster_base}{detail['poster_path']}" if detail.get("poster_path") else None,
            "runtime":      detail.get("runtime"),
            "tagline":      detail.get("tagline", ""),
            "director":     directors[0] if directors else None,
            "cast":         cast,
            "trailer_url":      _fetch_trailer(tmdb_id),
            "watch_providers":  _fetch_watch_providers(tmdb_id),
            # Internal field — lets get_recommendations look up the TMDB ID
            # for movies that aren't in the local dataset.
            "_tmdb_id":     tmdb_id,
        }
        _tmdb_movie_cache[cache_key] = result
        return result
    except Exception:
        pass
    _tmdb_movie_cache[cache_key] = None
    return None


_tmdb_similar_cache: dict = {}


def _fetch_tmdb_similar(tmdb_id: int, limit: int = 10) -> list:
    """
    Return TMDB-curated recommendations for a movie ID.

    Uses /movie/{id}/recommendations (TMDB's editorial list) rather than
    /similar (keyword/genre overlap) because editorial results are higher quality.
    Returns a list shaped like local recommender output so the same frontend
    component renders both without changes.
    """
    if not TMDB_API_KEY:
        return []
    cache_key = (tmdb_id, limit)
    if cache_key in _tmdb_similar_cache:
        return _tmdb_similar_cache[cache_key]
    try:
        results = requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}/recommendations",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        ).json().get("results", [])[:limit]

        poster_base = "https://image.tmdb.org/t/p/w500"
        similar = [
            {
                "title":        m.get("title"),
                "score":        round(min(m.get("vote_average", 0) / 10, 1.0), 2),
                "explanations": ["Recommended by TMDB"],
                "poster_url":   f"{poster_base}{m['poster_path']}" if m.get("poster_path") else None,
            }
            for m in results
            if m.get("title")
        ]
        _tmdb_similar_cache[cache_key] = similar
        return similar
    except Exception:
        pass
    _tmdb_similar_cache[cache_key] = []
    return []


_person_cache: dict = {}


def _fetch_person_details(name: str) -> dict | None:
    """
    Return TMDB person data for a given name, or None.

    Makes three sequential TMDB calls:
      1. /search/person  — find the person ID from their name
      2. /person/{id}    — biography, birthdate, birthplace, profile photo
      3. /person/{id}/movie_credits — full cast & crew filmography

    Results are cached in _person_cache (key = lowercased name).
    """
    if not TMDB_API_KEY:
        return None
    cache_key = name.strip().lower()
    if cache_key in _person_cache:
        return _person_cache[cache_key]

    try:
        # ── 1. Search by name ──────────────────────────────────────────────
        search = requests.get(
            "https://api.themoviedb.org/3/search/person",
            params={"api_key": TMDB_API_KEY, "query": name},
            timeout=5,
        ).json()
        results = search.get("results", [])
        if not results:
            _person_cache[cache_key] = None
            return None
        person_id = results[0]["id"]

        # ── 2. Full person details ─────────────────────────────────────────
        detail = requests.get(
            f"https://api.themoviedb.org/3/person/{person_id}",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        ).json()

        # ── 3. Movie credits ───────────────────────────────────────────────
        credits = requests.get(
            f"https://api.themoviedb.org/3/person/{person_id}/movie_credits",
            params={"api_key": TMDB_API_KEY},
            timeout=5,
        ).json()

        profile_base = "https://image.tmdb.org/t/p/w300"
        poster_base  = "https://image.tmdb.org/t/p/w185"

        def _year(item):
            d = item.get("release_date") or ""
            return d[:4] if d else "0000"

        def _credit_item(m, extra_key=None):
            return {
                "title":        m.get("title"),
                "release_year": _year(m) or None,
                "poster_url":   f"{poster_base}{m['poster_path']}" if m.get("poster_path") else None,
                "vote_average": m.get("vote_average"),
                **({"character": m.get("character")} if extra_key == "character" else {}),
                **({"job": m.get("job")} if extra_key == "job" else {}),
            }

        cast_credits = sorted(credits.get("cast", []), key=_year, reverse=True)
        crew_credits = sorted(credits.get("crew", []), key=_year, reverse=True)

        # "Known For" = top 8 most-popular movies from cast credits that have a poster
        known_for_raw = sorted(
            [c for c in credits.get("cast", []) if c.get("poster_path")],
            key=lambda x: x.get("popularity", 0),
            reverse=True,
        )[:8]

        result = {
            "id":                   person_id,
            "name":                 detail.get("name", name),
            "biography":            detail.get("biography", ""),
            "birthday":             detail.get("birthday"),
            "deathday":             detail.get("deathday"),
            "place_of_birth":       detail.get("place_of_birth"),
            "known_for_department": detail.get("known_for_department"),
            "profile_url":          f"{profile_base}{detail['profile_path']}" if detail.get("profile_path") else None,
            "known_for":   [_credit_item(m, "character") for m in known_for_raw],
            "cast_credits": [_credit_item(m, "character") for m in cast_credits[:60]],
            "crew_credits": [_credit_item(m, "job")       for m in crew_credits[:30]],
        }
        _person_cache[cache_key] = result
        return result
    except Exception:
        pass
    _person_cache[cache_key] = None
    return None


class RecommendationService:
    def __init__(self, movies_path, credits_path):
        self.recommender = MovieRecommender(movies_path, credits_path)
        self.semantic_search = SemanticSearchEngine()

        movies_df = load_movies()
        self.movies_df = extract_genres(movies_df)

        self.movies_df["overview"] = self.movies_df["overview"].fillna("")
        self.movies_df["vote_average"] = self.movies_df["vote_average"].fillna(0)
        self.movies_df["title"] = self.movies_df["title"].fillna("")

    def get_genres(self):
        genres = sorted({
            g
            for sublist in self.movies_df["genre_list"]
            for g in sublist
        })
        return genres

    def get_movies_by_genre(self, genre: str, page: int = 1, page_size: int = 20):
        filtered = self.movies_df[
            self.movies_df["genre_list"].apply(lambda x: genre in x)
        ].copy()

        total = len(filtered)

        start = (page - 1) * page_size
        end = start + page_size
        page_df = filtered.iloc[start:end]

        titles = page_df["title"].tolist()
        posters = fetch_posters(titles)

        movies = []
        for _, row in page_df.iterrows():
            movies.append({
                "title": row["title"],
                "release_year": None if row["release_year"] != row["release_year"] else int(row["release_year"]),
                "vote_average": float(row["vote_average"]),
                "overview": row["overview"],
                "poster_url": posters.get(row["title"])
            })

        return {
            "genre": genre,
            "page": page,
            "page_size": page_size,
            "total": total,
            "movies": movies
        }

    def search_movies(self, query: str, limit: int = 20):
        """
        Search by partial title match.
        """
        q = query.strip().lower()

        if not q:
            return []

        results = self.movies_df[
            self.movies_df["title"].str.lower().str.contains(q, na=False)
        ].head(limit)

        titles = results["title"].tolist()
        posters = fetch_posters(titles)

        movies = []
        for _, row in results.iterrows():
            movies.append({
                "title": row["title"],
                "release_year": None if row["release_year"] != row["release_year"] else int(row["release_year"]),
                "vote_average": float(row["vote_average"]),
                "overview": row["overview"],
                "poster_url": posters.get(row["title"])
            })

        return movies

    def semantic_search_movies(self, query: str, limit: int = 10):
        """
        Search by free-text meaning.
        """
        results = self.semantic_search.search(query, limit)
        titles = [item["title"] for item in results]
        posters = fetch_posters(titles)

        for item in results:
            item["poster_url"] = posters.get(item["title"])

        return results

    def get_movie_details(self, title: str):
        df = self.movies_df[
            self.movies_df["title"].str.lower() == title.lower()
        ]

        if df.empty:
            # Movie isn't in the local dataset — try TMDB directly so that
            # films linked from the person page (new releases, etc.) still work.
            return _fetch_movie_from_tmdb(title)

        row = df.iloc[0]
        posters = fetch_posters([row["title"]])

        def _safe_int(val):
            try:
                return None if pd.isna(val) else int(val)
            except Exception:
                return None

        def _safe_str(val):
            try:
                return "" if pd.isna(val) else str(val).strip()
            except Exception:
                return ""

        # Extract director and top-5 cast from credits CSV
        director = None
        cast = []
        try:
            credits_df = load_credits()
            credit_row = credits_df[
                credits_df["title"].str.lower() == title.lower()
            ]
            if not credit_row.empty:
                cr = credit_row.iloc[0]
                crew = json.loads(cr["crew"]) if isinstance(cr["crew"], str) else []
                directors = [c["name"] for c in crew if c.get("job") == "Director"]
                director = directors[0] if directors else None
                cast_raw = json.loads(cr["cast"]) if isinstance(cr["cast"], str) else []
                cast = [c["name"] for c in cast_raw[:5]]
        except Exception:
            pass

        tmdb_id = _safe_int(row.get("id"))
        trailer_url = _fetch_trailer(tmdb_id) if tmdb_id else None
        watch_providers = _fetch_watch_providers(tmdb_id) if tmdb_id else None

        return {
            "title": row["title"],
            "release_year": _safe_int(row["release_year"]),
            "vote_average": float(row["vote_average"]),
            "vote_count": _safe_int(row.get("vote_count")),
            "overview": row["overview"],
            "genres": row["genre_list"],
            "poster_url": posters.get(row["title"]),
            "runtime": _safe_int(row.get("runtime")),
            "tagline": _safe_str(row.get("tagline", "")),
            "director": director,
            "cast": cast,
            "trailer_url": trailer_url,
            "watch_providers": watch_providers,
            "tmdb_id": tmdb_id,
        }

    def get_person_details(self, name: str) -> dict | None:
        return _fetch_person_details(name)

    def get_recommendations(self, movie_title: str, num: int = 10):
        """
        Get recommendations for a movie title.

        Primary path: local TF-IDF/BM25 hybrid recommender (fast, trained on
        the local dataset).

        Fallback: when the movie isn't in the local dataset (e.g. a new release
        linked from a person page), look up its TMDB ID and use TMDB's own
        editorial recommendations endpoint instead.  The response shape is
        identical so the frontend renders both without any changes.
        """
        recommendations = self.recommender.recommend(movie_title, num)

        if not recommendations:
            # ── TMDB fallback ──────────────────────────────────────────────
            # Three independent sources for the TMDB ID, tried in order.
            # We cannot rely on _tmdb_movie_cache being populated because
            # /recommend and /movie/{title} are called in parallel from the
            # frontend — the movie endpoint may not have run yet.
            tmdb_id = None

            # 1. Local dataset — CSV movies have a TMDB id column
            local_row = self.movies_df[
                self.movies_df["title"].str.lower() == movie_title.strip().lower()
            ]
            if not local_row.empty:
                try:
                    tmdb_id = int(local_row.iloc[0]["id"])
                except Exception:
                    pass

            # 2. _tmdb_movie_cache — populated if /movie/{title} already ran
            if not tmdb_id:
                cached = _tmdb_movie_cache.get(movie_title.strip().lower())
                if cached:
                    tmdb_id = cached.get("_tmdb_id")

            # 3. Direct TMDB search — self-sufficient, fixes the race condition
            if not tmdb_id and TMDB_API_KEY:
                try:
                    results = requests.get(
                        "https://api.themoviedb.org/3/search/movie",
                        params={"api_key": TMDB_API_KEY, "query": movie_title},
                        timeout=5,
                    ).json().get("results", [])
                    if results:
                        match = next(
                            (r for r in results
                             if r.get("title", "").lower() == movie_title.strip().lower()),
                            results[0],
                        )
                        tmdb_id = match["id"]
                except Exception:
                    pass

            if tmdb_id:
                similar = _fetch_tmdb_similar(tmdb_id, num)
                if similar:
                    # Read poster_url without mutating the cached list
                    posters = {
                        m["title"]: m["poster_url"]
                        for m in similar
                        if m.get("poster_url")
                    }
                    recs = [
                        {k: v for k, v in m.items() if k != "poster_url"}
                        for m in similar
                    ]
                    return recs, posters

            return [], {}

        titles = [item["title"] for item in recommendations]
        posters = fetch_posters(titles)

        return recommendations, posters

    def get_trending(self, limit: int = 20) -> dict:
        """
        Return trending movies ranked by quality × log-popularity.

        Filters to movies with vote_average >= 6.0 and vote_count >= 100
        (where available) to exclude low-signal entries.
        """
        df = self.movies_df.copy()

        if "vote_count" in df.columns:
            df = df[pd.to_numeric(df["vote_count"], errors="coerce").fillna(0) >= 100]

        df = df[df["vote_average"] >= 6.0].copy()

        df["trending_score"] = df["vote_average"] * df["popularity"].apply(
            lambda x: math.log(float(x) + 1)
        )

        top = df.nlargest(limit, "trending_score")
        titles = top["title"].tolist()
        posters = fetch_posters(titles)

        movies = []
        for _, row in top.iterrows():
            movies.append({
                "title":        row["title"],
                "release_year": None if pd.isna(row["release_year"]) else int(row["release_year"]),
                "vote_average": float(row["vote_average"]),
                "overview":     row["overview"],
                "poster_url":   posters.get(row["title"]),
            })

        return {"movies": movies, "count": len(movies)}

    def get_watchlist_recommendations(self, titles: list, n: int = 12):
        """
        Aggregate recommendations across multiple watchlist titles.

        Seeds up to 5 titles into the recommender (capping avoids expensive
        matrix lookups for large watchlists). Pools 20 candidates per seed,
        sums scores for titles that appear in multiple seed results (a film
        recommended by several of the user's saved films is a stronger signal),
        removes titles already in the watchlist, and returns the top N with
        posters.

        The displayed score is the per-seed average so the match % badge
        remains meaningful on the frontend.
        """
        if not titles:
            return [], {}

        seeds = titles[:5]
        watchlist_lower = {t.lower() for t in titles}

        # title -> {"sum": float, "count": int, "explanations": list}
        score_map: dict = {}

        for seed in seeds:
            try:
                recs = self.recommender.recommend(seed, 20)
            except Exception:
                continue
            for rec in recs:
                t = rec["title"]
                if t.lower() in watchlist_lower:
                    continue  # skip films the user already saved
                if t not in score_map:
                    score_map[t] = {
                        "sum": 0.0,
                        "count": 0,
                        "explanations": rec.get("explanations", []),
                    }
                score_map[t]["sum"] += rec["score"]
                score_map[t]["count"] += 1

        if not score_map:
            return [], {}

        # Sort by sum — titles appearing in multiple seed results rank higher
        top = sorted(score_map.items(), key=lambda x: x[1]["sum"], reverse=True)[:n]

        recommendations = [
            {
                "title": title,
                "score": data["sum"] / data["count"],  # average for % match display
                "explanations": data["explanations"],
            }
            for title, data in top
        ]

        posters = fetch_posters([r["title"] for r in recommendations])
        return recommendations, posters

    def get_stats(self) -> dict:
        """Return platform statistics for the investor metrics bar."""
        genres = self.get_genres()
        return {
            "total_movies":         len(self.movies_df),
            "total_genres":         len(genres),
            "search_types":         2,
            "recommendation_engine": "Hybrid Cosine + BM25",
        }