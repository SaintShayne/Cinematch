"""
Hybrid movie recommender.

This version improves recommendation quality by combining:
1. content similarity
2. genre overlap
3. source-genre priority
4. rating boost
5. a very small popularity boost

Compared to the previous version, this reduces the chance that
broad adventure blockbusters dominate recommendations for movies
that are more specifically war / drama / sci-fi / fantasy etc.
"""

import ast
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class MovieRecommender:
    def __init__(self, movies_path, credits_path):
        movies = pd.read_csv(movies_path)
        credits = pd.read_csv(credits_path)

        self.df = movies.merge(credits, left_on="id", right_on="movie_id")

        if "title_x" in self.df.columns:
            self.df["title"] = self.df["title_x"]
        elif "original_title" in self.df.columns:
            self.df["title"] = self.df["original_title"]

        for col in ["genres", "keywords", "cast", "crew"]:
            self.df[col] = self.df[col].fillna("[]")

        self.df["vote_average"] = self.df["vote_average"].fillna(0)
        self.df["popularity"] = self.df["popularity"].fillna(0)

        self.df["tags"] = self.df.apply(self.combine_features, axis=1)

        self.cv = CountVectorizer(max_features=5000, stop_words="english")
        # Keep as sparse matrix — converting to dense (.toarray()) would use ~192MB
        # and pre-computing the full N×N similarity matrix uses another ~184MB.
        # Instead we compute similarity on-demand per query (a few ms, not noticeable).
        self.vectors = self.cv.fit_transform(self.df["tags"])

    def parse_list(self, text):
        """
        Convert JSON-like text into a list of names.
        """
        try:
            items = ast.literal_eval(text)
            return [item["name"].replace(" ", "") for item in items if "name" in item]
        except Exception:
            return []

    def combine_features(self, row):
        """
        Build one combined feature string used for similarity matching.
        """
        features = []

        # Genres
        features.extend(self.parse_list(row["genres"]))

        # Keywords
        features.extend(self.parse_list(row["keywords"]))

        # Cast (top 3 actors)
        cast = self.parse_list(row["cast"])
        features.extend(cast[:3])

        # Director
        try:
            crew_list = ast.literal_eval(row["crew"])
            for member in crew_list:
                if member.get("job") == "Director":
                    features.append(member["name"].replace(" ", ""))
        except Exception:
            pass

        return " ".join(features)

    def _get_genres(self, idx: int) -> set[str]:
        """
        Return genre set for one movie.
        """
        return set(self.parse_list(self.df.iloc[idx]["genres"]))

    def explain_recommendation(self, source_idx: int, target_idx: int):
        """
        Generate human-readable explanation tags for the UI.
        """
        source = self.df.iloc[source_idx]
        target = self.df.iloc[target_idx]

        source_genres = set(self.parse_list(source["genres"]))
        target_genres = set(self.parse_list(target["genres"]))
        shared_genres = list(source_genres & target_genres)

        source_cast = set(self.parse_list(source["cast"]))
        target_cast = set(self.parse_list(target["cast"]))
        shared_cast = list(source_cast & target_cast)

        explanations = []

        if shared_genres:
            explanations.append(f"Shared genres: {', '.join(shared_genres[:3])}")

        if shared_cast:
            explanations.append(f"Shared cast: {', '.join(shared_cast[:2])}")

        if not explanations:
            explanations.append("Similar movie themes and metadata")

        return explanations

    def recommend(self, movie_name, num=10):
        """
        Return top N recommendations using improved hybrid ranking.
        """
        movie_name = movie_name.lower()

        if movie_name not in self.df["title"].str.lower().values:
            return []

        source_idx = self.df[self.df["title"].str.lower() == movie_name].index[0]

        source_genres = self._get_genres(source_idx)

        # Genre priority weights.
        # If the source movie has these genres, matching them should matter more.
        strong_genres = {
            "War", "ScienceFiction", "Fantasy", "Horror",
            "Mystery", "Crime", "History"
        }

        # Compute similarity for this one movie against all others (sparse, fast).
        sim_scores = cosine_similarity(self.vectors[source_idx], self.vectors).flatten()

        candidates = []

        for target_idx, content_similarity in enumerate(sim_scores):
            if target_idx == source_idx:
                continue

            target_genres = self._get_genres(target_idx)

            shared_genres = source_genres & target_genres
            shared_count = len(shared_genres)

            # Genre overlap boost
            genre_boost = shared_count * 0.12

            # Extra boost if source movie has strong defining genres
            # like War or Science Fiction and target shares them too.
            strong_match_count = len(shared_genres & strong_genres)
            genre_boost += strong_match_count * 0.22

            # Small quality signal
            rating = float(self.df.iloc[target_idx]["vote_average"])
            rating_boost = rating / 35.0

            # Very small popularity signal so popularity does not dominate
            popularity = float(self.df.iloc[target_idx]["popularity"])
            popularity_boost = min(popularity / 5000.0, 0.08)

            # Final hybrid score
            hybrid_score = (
                (content_similarity * 0.78) +
                genre_boost +
                rating_boost +
                popularity_boost
            )

            candidates.append((target_idx, hybrid_score))

        candidates = sorted(candidates, key=lambda x: x[1], reverse=True)[:num]

        recommendations = []

        for target_idx, score in candidates:
            recommendations.append({
                "title": self.df.iloc[target_idx]["title"],
                "score": float(score),
                "explanations": self.explain_recommendation(source_idx, target_idx)
            })

        return recommendations