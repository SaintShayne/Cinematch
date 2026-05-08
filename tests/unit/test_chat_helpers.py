"""
Layer 1 — Unit tests for the pure chatbot helper functions in src/api/main.py.

WHAT THESE TEST
  _find_seed_movie      — regex extracts the seed movie title from user messages
  _extract_genre        — maps genre keywords to TMDB genre names (longest-match wins)
  _best_search_match    — prefers exact title over contains-match in search results
  _is_next_to_watch_query — detects "what should I watch next?" intent

WHAT THEY PREVENT
  Silent regressions when regex patterns are edited — the patterns are the most
  fragile code in the chatbot and break in non-obvious ways (e.g. the 'Dark Knight'
  vs 'Dark Knight Rises' bug fixed by _best_search_match).

HOW TO MAINTAIN
  - Add a new input/expected row to the @parametrize list whenever a new pattern
    or genre alias is added. One matching case + one non-matching case minimum.
  - These are pure-function tests: no network, no database, no mocks needed.
  - Run with: pytest tests/unit/test_chat_helpers.py -v
"""

import pytest

# conftest.py copies fixture CSVs to data/raw/ before this import runs,
# so RecommendationService initialises cleanly from the small fixture dataset.
from src.api.main import (
    _find_seed_movie,
    _extract_genre,
    _best_search_match,
    _is_next_to_watch_query,
)


# ── _find_seed_movie ──────────────────────────────────────────────────────────

class TestFindSeedMovie:

    @pytest.mark.parametrize("message, expected", [
        # "movies/films like X"
        ("movies like Inception",               "Inception"),
        ("films like The Dark Knight",           "The Dark Knight"),
        # "similar to X" / "more like X" / "something like X"
        ("similar to Interstellar",              "Interstellar"),
        ("more like Avatar",                     "Avatar"),
        ("something like Titanic",               "Titanic"),
        # "I loved/liked/enjoyed/watched X"
        ("I loved The Matrix",                   "The Matrix"),
        ("I watched Goodfellas last night",      "Goodfellas"),
        ("I enjoyed Toy Story",                  "Toy Story"),
        # "after watching X" / "after X"
        ("after watching Inception",             "Inception"),
        ("after Avatar, what next?",             "Avatar"),
        # "fans/fan of X"
        ("fans of Pulp Fiction",                 "Pulp Fiction"),
        ("fan of The Shining",                   "The Shining"),
        # "X vibes"
        ("Inception vibes",                      "Inception"),
        # "recommend/suggest something like X"
        ("recommend something like Fight Club",  "Fight Club"),
        # "watch after X"
        ("what to watch after Forrest Gump",     "Forrest Gump"),
        # "just finished/watched/seen X"
        ("just finished The Notebook",           "The Notebook"),
        ("just watched Goodfellas",              "Goodfellas"),
        ("just seen Psycho",                     "Psycho"),
        # "done with X" / "done watching X"
        ("done with Inception",                  "Inception"),
        ("done watching Avatar",                 "Avatar"),
        # "finished X" (without "just")
        ("finished Titanic",                     "Titanic"),
        # multi-word title
        ("I loved The Silence of the Lambs",     "The Silence of the Lambs"),
        # curly/smart quotes around title
        ("“Inception” vibes",           "Inception"),
        # case-insensitive matching
        ("Movies Like Avatar",                   "Avatar"),
    ])
    def test_extracts_title_from_known_patterns(self, message, expected):
        result = _find_seed_movie(message)
        assert result is not None, f"Expected '{expected}' but got None for: {message!r}"
        assert result.strip().lower() == expected.lower()

    @pytest.mark.parametrize("message", [
        "what's a good movie?",
        "I want to watch something tonight",
        "suggest me anything good",
        "recommend a movie",        # no "something like X"
        "give me some action films",
        "",
    ])
    def test_returns_none_when_no_seed_present(self, message):
        assert _find_seed_movie(message) is None


# ── _extract_genre ────────────────────────────────────────────────────────────

class TestExtractGenre:

    @pytest.mark.parametrize("message, expected", [
        ("show me a horror movie",         "Horror"),
        ("something scary tonight",        "Horror"),
        ("I want a funny comedy film",     "Comedy"),
        ("a romantic film please",         "Romance"),
        ("some action films",              "Action"),
        # "science fiction" (15 chars) wins over shorter terms
        ("epic science fiction adventure", "Science Fiction"),
        ("sci-fi recommendations",         "Science Fiction"),
        ("animated movie for kids",        "Animation"),
        ("a good documentary",             "Documentary"),
        # "historical" (10 chars) beats "drama" (5 chars)
        ("historical drama",               "History"),
        ("biopic about a musician",        "History"),
        ("superhero film",                 "Action"),
        ("war film from the 1940s",        "War"),
        ("western shootout",               "Western"),
    ])
    def test_extracts_known_genre_keywords(self, message, expected):
        assert _extract_genre(message) == expected

    @pytest.mark.parametrize("message", [
        "something good to watch",
        "I need a recommendation",
        "what's popular right now",
        "",
    ])
    def test_returns_none_when_no_genre_keyword(self, message):
        assert _extract_genre(message) is None

    def test_longer_term_beats_shorter_when_both_present(self):
        # "science fiction" (15 chars) must beat "sci-fi" (6 chars)
        # when only "science fiction" appears in the text
        assert _extract_genre("a science fiction epic") == "Science Fiction"

    def test_term_matching_is_case_insensitive(self):
        assert _extract_genre("HORROR film") == "Horror"
        assert _extract_genre("COMEDY movie") == "Comedy"


# ── _best_search_match ────────────────────────────────────────────────────────

class TestBestSearchMatch:

    _DARK_KNIGHT        = {"title": "The Dark Knight"}
    _DARK_KNIGHT_RISES  = {"title": "The Dark Knight Rises"}
    _BATMAN_BEGINS      = {"title": "Batman Begins"}
    _AVATAR             = {"title": "Avatar"}

    def test_returns_exact_match_when_present(self):
        # Simulates the real bug: str.contains returns Rises before Knight
        results = [self._DARK_KNIGHT_RISES, self._DARK_KNIGHT]
        assert _best_search_match(results, "The Dark Knight") == self._DARK_KNIGHT

    def test_falls_back_to_first_result_when_no_exact_match(self):
        results = [self._DARK_KNIGHT_RISES, self._BATMAN_BEGINS]
        assert _best_search_match(results, "The Dark Knight") == self._DARK_KNIGHT_RISES

    def test_returns_none_for_empty_list(self):
        assert _best_search_match([], "Avatar") is None

    def test_match_is_case_insensitive(self):
        results = [self._AVATAR]
        assert _best_search_match(results, "avatar") == self._AVATAR

    def test_strips_whitespace_from_candidate(self):
        results = [{"title": "Inception"}]
        assert _best_search_match(results, "  Inception  ") == {"title": "Inception"}

    def test_first_exact_match_wins_when_duplicates(self):
        r1 = {"title": "Avatar", "year": 2009}
        r2 = {"title": "Avatar", "year": 2022}
        assert _best_search_match([r1, r2], "Avatar") == r1


# ── _is_next_to_watch_query ───────────────────────────────────────────────────

class TestIsNextToWatchQuery:

    @pytest.mark.parametrize("message", [
        "what should I watch next",
        "what should i watch next?",
        "What Should I Watch Next",      # case-insensitive
        "just finished Inception",
        "just watched Avatar",
        "just seen Parasite",
        "done with The Matrix",
        "done watching Titanic",
        "what should I watch after Inception",
        "what else should i watch",
        "next movie to watch",
        "what do I watch tonight",
        "what's next on my list",
    ])
    def test_detects_next_to_watch_intent(self, message):
        assert _is_next_to_watch_query(message) is True

    @pytest.mark.parametrize("message", [
        "movies like Inception",
        "recommend me a horror movie",
        "give me action films",
        "tell me about Avatar",
        "who directed Pulp Fiction",
        "I loved Titanic",
        "show me sci-fi films",
        "",
    ])
    def test_does_not_trigger_on_unrelated_messages(self, message):
        assert _is_next_to_watch_query(message) is False
