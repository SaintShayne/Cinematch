"""
Layer 4 — Load / performance tests for the CineMatch backend.

WHAT THESE TEST
  Throughput and response-time baseline for the endpoints users hit most:
  search, recommendations, genre browse. /chat is intentionally excluded
  because it makes real Groq API calls (latency is dominated by the LLM,
  not your server) and costs money per request.

WHAT THEY PREVENT
  - Catching a slow pandas/sklearn regression before it reaches production
  - Establishing a baseline for the Render free-tier cold-start behaviour
  - Confirming the rate limiter doesn't block normal concurrent traffic

HOW TO MAINTAIN
  - Run locally BEFORE and AFTER any ML-model or data-loading change to
    compare p95 response times.
  - Do NOT run against the Render free-tier URL without warming it up first
    (30s cold start will dominate every number and give meaningless results).
  - Update SEED_MOVIES / SEARCH_QUERIES if new fixture titles are added.

PREREQUISITES
  pip install locust          # or: pip install -r requirements-dev.txt
  uvicorn src.api.main:app --reload --port 8000

RUN (interactive web UI at http://localhost:8089):
  locust -f tests/load/locustfile.py --host http://localhost:8000

RUN (headless, scripted):
  locust -f tests/load/locustfile.py --host http://localhost:8000 \\
         --headless -u 10 -r 2 --run-time 60s --only-summary

TARGET NUMBERS (Render free tier, warm):
  /search        p95 < 200 ms
  /recommend     p95 < 500 ms
  /movie/{title} p95 < 100 ms
"""

import os
import random

from locust import HttpUser, between, task

# Titles present in the fixture dataset — guaranteed to return real results.
SEED_MOVIES = [
    "Avatar",
    "Inception",
    "The Dark Knight",
    "Interstellar",
    "The Matrix",
    "Pulp Fiction",
    "Goodfellas",
    "Titanic",
]

SEARCH_QUERIES = [
    "dark knight",
    "space",
    "romantic",
    "thriller",
    "animation",
    "crime",
    "Avatar",
    "Nolan",
]


class CineMatchUser(HttpUser):
    """
    Simulates a typical CineMatch user: searches, browses by genre,
    views movie details, and fetches recommendations.
    """

    wait_time = between(1, 3)

    def on_start(self):
        """Fetch one valid genre on startup so browse tasks don't guess."""
        r = self.client.get("/genres", name="/genres [setup]")
        genres = r.json().get("genres", []) if r.status_code == 200 else []
        self._genre = genres[0] if genres else "Action"

    # ── Tasks (weight = relative frequency) ──────────────────────────────────

    @task(1)
    def health_check(self):
        """Lightweight liveness probe — should always be near-instant."""
        self.client.get("/health")

    @task(2)
    def get_trending(self):
        self.client.get("/trending")

    @task(4)
    def search_movie(self):
        query = random.choice(SEARCH_QUERIES)
        with self.client.get(
            "/search",
            params={"query": query},
            name="/search",
            catch_response=True,
        ) as r:
            if r.status_code != 200:
                r.failure(f"Expected 200, got {r.status_code}")
            elif r.json().get("count", 0) == 0:
                r.failure("Search returned zero results")

    @task(4)
    def recommend_movie(self):
        movie = random.choice(SEED_MOVIES)
        with self.client.get(
            "/recommend",
            params={"movie": movie},
            name="/recommend",
            catch_response=True,
        ) as r:
            if r.status_code not in (200, 404):
                r.failure(f"Unexpected status {r.status_code}")

    @task(2)
    def browse_genre(self):
        self.client.get(
            "/movies",
            params={"genre": self._genre, "page": 1},
            name="/movies",
        )

    @task(2)
    def movie_detail(self):
        title = random.choice(SEED_MOVIES)
        self.client.get(f"/movie/{title}", name="/movie/{title}")

    @task(1)
    def semantic_search(self):
        query = random.choice(["space adventure", "feel good comedy", "scary horror"])
        self.client.get(
            "/semantic-search",
            params={"query": query},
            name="/semantic-search",
        )
