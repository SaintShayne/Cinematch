"""
Semantic search module — BM25 + TF-IDF hybrid + fuzzy matching + spell correction.

Search quality stack (applied in order):
1. TF-IDF semantic-style cosine similarity   (weighted 50 %)
2. BM25 keyword scoring                      (weighted 50 %)
3. Title substring exact-match boost
4. Token overlap boost
5. Fuzzy title match boost (thefuzz)
6. Spell-corrected query re-scoring
7. Franchise alias expansion (LOTR, MCU, etc.)
8. Rating quality signal
9. Score-floor noise filter
10. Deduplication by title
"""

import re

import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from spellchecker import SpellChecker
from thefuzz import fuzz

from src.data.loader import load_movies
from src.data.preprocessing import extract_genres

# Minimum combined score — results below this are noise
_SCORE_FLOOR = 0.05


class SemanticSearchEngine:
    """
    Search movies using free-text queries such as:
      - 'space war movie'
      - 'romantic tragedy'
      - 'LOTR'
      - 'movies like Avatar'
      - 'dark superhero with good villain'
    """

    def __init__(self) -> None:
        df = load_movies()
        df = extract_genres(df)

        df["overview"]     = df["overview"].fillna("")
        df["keywords"]     = df["keywords"].fillna("[]")
        df["title"]        = df["title"].fillna("")
        df["tagline"]      = df["tagline"].fillna("")
        df["vote_average"] = df["vote_average"].fillna(0)
        df["popularity"]   = df["popularity"].fillna(0)

        # Franchise aliases for common shorthand
        df["alias_text"] = df["title"].apply(self._build_alias_text)

        # Combined search corpus
        df["search_text"] = (
            df["title"]             + " " +
            df["alias_text"]        + " " +
            df["overview"]          + " " +
            df["tagline"]           + " " +
            df["genres"].astype(str) + " " +
            df["keywords"].astype(str)
        )

        # Deduplicate by title — protect against duplicate rows in raw CSV
        df = df.drop_duplicates(subset=["title"]).reset_index(drop=True)
        self.df = df

        # TF-IDF matrix
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=12000,
            ngram_range=(1, 2),
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df["search_text"])

        # BM25 index (tokenised on whitespace)
        tokenised_corpus = [text.lower().split() for text in self.df["search_text"]]
        self.bm25 = BM25Okapi(tokenised_corpus)

        # Spell checker (English dictionary loaded once at startup)
        self.spell = SpellChecker()

    # ------------------------------------------------------------------ #
    #  Private helpers                                                     #
    # ------------------------------------------------------------------ #

    def _build_alias_text(self, title: str) -> str:
        """Expand well-known franchise shorthand into alias tokens."""
        t = title.lower()
        aliases: list[str] = []

        if "lord of the rings" in t:
            aliases += ["lotr", "lord rings", "middle earth"]
        if "pirates of the caribbean" in t:
            aliases += ["potc", "pirates caribbean"]
        if "harry potter" in t:
            aliases += ["hp", "hogwarts", "wizards"]
        if "star wars" in t:
            aliases += ["sw", "jedi", "sith", "force awakens"]
        if "marvel" in t or "avengers" in t:
            aliases += ["mcu", "marvel cinematic universe", "superhero"]
        if "the dark knight" in t or "batman" in t:
            aliases += ["dc", "bruce wayne", "gotham", "nolan"]
        if "fast and furious" in t or "fast & furious" in t:
            aliases += ["f&f", "fast furious cars racing"]
        if "james bond" in t or "007" in t:
            aliases += ["bond spy action"]

        return " ".join(aliases)

    def normalize_query(self, query: str) -> str:
        """
        Strip filler phrases so search focuses on the meaningful terms.

        'movies like Avatar' → 'avatar'
        'something similar to LOTR' → 'lotr'
        """
        query = query.lower().strip()
        for phrase in [
            "movies like", "movie like", "films like", "film like",
            "something like", "similar to", "something similar to",
            "movies similar to", "films similar to",
            "show me", "find me", "i want to watch", "recommend me",
        ]:
            query = query.replace(phrase, "")
        return re.sub(r"\s+", " ", query).strip()

    def _spell_correct(self, query: str) -> str:
        """
        Attempt conservative spell correction on the query.

        Only corrects words of 5+ characters that are not ALL-CAPS
        (acronyms like LOTR should not be touched).  Uses the original
        word if the spellchecker returns no confident candidate.
        """
        corrected: list[str] = []
        for word in query.split():
            if len(word) >= 5 and not word.isupper():
                fixed = self.spell.correction(word)
                corrected.append(fixed if fixed else word)
            else:
                corrected.append(word)
        return " ".join(corrected)

    def _tokenize(self, text: str) -> set[str]:
        return set(re.findall(r"[a-z0-9]+", text.lower()))

    def _bm25_normalised(self, query_tokens: list[str]) -> np.ndarray:
        """Return BM25 scores normalised to [0, 1]."""
        raw = self.bm25.get_scores(query_tokens)
        max_val = raw.max()
        return raw / max_val if max_val > 0 else raw

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def search(self, query: str, limit: int = 10) -> list[dict]:
        """
        Search movies by free-text query.

        Returns a list of result dicts:
        [{"title", "overview", "release_year", "vote_average", "score"}, ...]
        """
        if not query or not query.strip():
            return []

        cleaned = self.normalize_query(query)
        if not cleaned:
            return []

        corrected = self._spell_correct(cleaned)

        # ── TF-IDF scores ──────────────────────────────────────────────
        tfidf_orig = cosine_similarity(
            self.vectorizer.transform([cleaned]), self.tfidf_matrix
        ).flatten()

        if corrected != cleaned:
            tfidf_corr = cosine_similarity(
                self.vectorizer.transform([corrected]), self.tfidf_matrix
            ).flatten()
            tfidf_scores = np.maximum(tfidf_orig, tfidf_corr)
        else:
            tfidf_scores = tfidf_orig

        # ── BM25 scores ────────────────────────────────────────────────
        bm25_orig = self._bm25_normalised(cleaned.split())
        if corrected != cleaned:
            bm25_corr = self._bm25_normalised(corrected.split())
            bm25_scores = np.maximum(bm25_orig, bm25_corr)
        else:
            bm25_scores = bm25_orig

        query_tokens   = self._tokenize(cleaned)
        corrected_tokens = self._tokenize(corrected)

        # ── Per-movie scoring ──────────────────────────────────────────
        final_scores: list[float] = []

        for i, row in self.df.iterrows():
            title_lower = row["title"].lower()

            # Hybrid base
            score = 0.5 * float(tfidf_scores[i]) + 0.5 * float(bm25_scores[i])

            # Exact substring in title
            if cleaned in title_lower or corrected in title_lower:
                score += 0.55

            # Token overlap (original + corrected union)
            title_tokens = self._tokenize(title_lower)
            overlap = len((query_tokens | corrected_tokens) & title_tokens)
            if overlap:
                score += overlap * 0.12

            # Fuzzy title match — catches one-character typos
            fuzzy_ratio = fuzz.partial_ratio(cleaned, title_lower) / 100.0
            if fuzzy_ratio > 0.75:
                score += fuzzy_ratio * 0.25

            # Franchise alias boost
            if cleaned in row["alias_text"] or corrected in row["alias_text"]:
                score += 0.45

            # Small quality signal
            score += float(row["vote_average"]) / 100.0

            final_scores.append(score)

        # ── Filter, sort, deduplicate ──────────────────────────────────
        ranked = sorted(
            [i for i, s in enumerate(final_scores) if s >= _SCORE_FLOOR],
            key=lambda i: final_scores[i],
            reverse=True,
        )

        seen: set[str] = set()
        results: list[dict] = []

        for i in ranked:
            if len(results) >= limit:
                break
            row = self.df.iloc[i]
            title = row["title"]
            if title in seen:
                continue
            seen.add(title)
            results.append({
                "title":        title,
                "overview":     row["overview"],
                "release_year": None if pd.isna(row["release_year"]) else int(row["release_year"]),
                "vote_average": float(row["vote_average"]) if not pd.isna(row["vote_average"]) else 0.0,
                "score":        round(float(final_scores[i]), 4),
            })

        return results
