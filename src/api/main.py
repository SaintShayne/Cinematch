"""
FastAPI backend for the Movie Recommender project.
"""

import os
import re as _re
import random as _random
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.services.recommendation_service import RecommendationService
from src.config.settings import MOVIES_CSV, CREDITS_CSV

app = FastAPI(
    title="Movie Recommender API",
    description="Elite backend API for movie browsing, searching, semantic search, and explainable recommendations.",
    version="3.0.0"
)

# ALLOWED_ORIGINS env var can be a comma-separated list of origins for production
# e.g. "https://cinebot.vercel.app,https://www.cinebot.app"
# Defaults to wildcard for local development.
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

service = RecommendationService(MOVIES_CSV, CREDITS_CSV)


class ChatRequest(BaseModel):
    messages: list[dict[str, str]] = []
    message: str
    # Top watchlist/recently-viewed titles passed from the frontend
    # to ground recommendations for vague prompts ("what should I watch?")
    context_titles: list[str] = []


# ── Chat helpers ─────────────────────────────────────────────────────────────

def _find_seed_movie(message: str) -> str | None:
    """
    Extract a specific movie title from patterns like "movies like X" or "similar to X".
    Returns the raw candidate string (not yet validated against the dataset).
    """
    pattern = (
        r'(?:movies?\s+like|films?\s+like|similar\s+to|like)\s+'
        r'["\u201c\u201d\u2018\u2019]?([A-Za-z][^"\'?!\n]{1,50}?)'
        r'["\u201c\u201d\u2018\u2019]?(?:\s*\(|\s*$|\s*[?!,.])'
    )
    m = _re.search(pattern, message, _re.IGNORECASE)
    if m:
        return m.group(1).strip().rstrip(',')
    return None


def _get_dataset_suggestions(service, message: str, context_titles: list[str]) -> list[str]:
    """
    Return up to 5 validated movie titles from the CineMatch dataset, in priority order:
      1. Specific seed movie detected in the message → recommendations for that seed
      2. Watchlist/recently-viewed context titles → recommendations for the first match
      3. Semantic search on the message text
      4. Trending fallback
    """
    # 1. Specific seed
    candidate = _find_seed_movie(message)
    if candidate:
        search_results = service.search_movies(candidate, 3)
        if search_results:
            seed_title = search_results[0]["title"]
            try:
                recs, _ = service.get_recommendations(seed_title, 5)
                if recs:
                    return [r["title"] for r in recs[:5]]
            except Exception:
                pass

    # 2. Watchlist / recently-viewed context
    for title in context_titles[:3]:
        try:
            recs, _ = service.get_recommendations(title, 5)
            if recs:
                return [r["title"] for r in recs[:5]]
        except Exception:
            continue

    # 3. Semantic search on the full message
    try:
        results = service.semantic_search_movies(message, 5)
        if results:
            return [r["title"] for r in results[:5]]
    except Exception:
        pass

    # 4. Trending fallback
    try:
        trending = service.get_trending(20)
        movies = trending.get("movies", [])
        if movies:
            sample = _random.sample(movies, min(5, len(movies)))
            return [m["title"] for m in sample]
    except Exception:
        pass

    return []


@app.get("/", tags=["System"])
def root():
    return {"message": "Movie Recommender API is running"}


@app.get("/health", tags=["System"])
def health():
    return {"status": "healthy"}


@app.get("/genres", tags=["Browse"])
def get_genres():
    genres = service.get_genres()
    return {"count": len(genres), "genres": genres}


@app.get("/movies", tags=["Browse"])
def get_movies(
    genre: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50)
):
    genres = service.get_genres()

    if genre not in genres:
        raise HTTPException(status_code=404, detail=f"Genre '{genre}' not found")

    return service.get_movies_by_genre(genre, page, page_size)


@app.get("/movie/{title}", tags=["Browse"])
def get_movie_details(title: str = Path(...)):
    movie = service.get_movie_details(title)

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    return movie


@app.get("/search", tags=["Search"])
def search_movies(
    query: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    results = service.search_movies(query, limit)

    return {
        "query": query,
        "count": len(results),
        "results": results
    }


@app.get("/semantic-search", tags=["Search"])
def semantic_search_movies(
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20)
):
    results = service.semantic_search_movies(query, limit)

    return {
        "query": query,
        "count": len(results),
        "results": results
    }


@app.get("/recommend", tags=["Recommendations"])
def recommend(
    movie: str = Query(...),
    n: int = Query(10, ge=1, le=20)
):
    recommendations, posters = service.get_recommendations(movie, n)

    if not recommendations:
        raise HTTPException(status_code=404, detail="Movie not found")

    return {
        "movie": movie,
        "count": len(recommendations),
        "recommendations": recommendations,
        "posters": posters
    }


@app.get("/stats", tags=["System"])
def get_stats():
    return service.get_stats()


@app.get("/trending", tags=["Browse"])
def get_trending(limit: int = Query(20, ge=1, le=50)):
    return service.get_trending(limit)


@app.post("/chat", tags=["Chat"])
def chat(request: ChatRequest):
    from groq import AuthenticationError, RateLimitError, BadRequestError
    from src.services.chatbot_service import send_message
    try:
        # Get validated dataset suggestions to ground the LLM
        suggestions = _get_dataset_suggestions(
            service, request.message, request.context_titles
        )

        reply, updated_messages = send_message(
            request.messages, request.message, suggestions
        )

        return {
            "reply": reply,
            "suggested_movies": suggestions,   # validated dataset titles as chips
            "messages": updated_messages,
        }
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Groq API key. Check GROQ_API_KEY in .env")
    except BadRequestError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Groq rate limit reached. Try again shortly.")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"CineMatch unavailable: {e}")