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

from src.models.recommender import MovieRecommender
from src.models.semantic_search import SemanticSearchEngine
from src.services.poster_service import fetch_posters
from src.data.loader import load_movies, load_credits
from src.data.preprocessing import extract_genres


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
            return None

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
        }

    def get_recommendations(self, movie_title: str, num: int = 10):
        """
        Get elite recommendations including explanation.
        """
        recommendations = self.recommender.recommend(movie_title, num)

        if not recommendations:
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