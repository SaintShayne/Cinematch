"""
Layer 5 — API contract tests: every endpoint must match its declared JSON schema.

WHAT THESE TEST
  The *shape* of every response, not just the status code. If someone renames
  a key, removes a required field, or changes a type (e.g. count from int to
  string), these tests fail immediately.

WHAT THEY PREVENT
  - Frontend breaking silently because a backend key was renamed
  - Adding a new field is fine (schemas use additionalProperties: true by default)
  - Removing a required field or changing a type is caught at the contract boundary

HOW TO MAINTAIN
  - When an endpoint's response shape changes intentionally, update the schema
    constant in this file and record it in the PR description.
  - Add a new schema + test class when a new endpoint is introduced.
  - Run with: pytest tests/integration/test_contracts.py -v
"""

from unittest.mock import patch

import jsonschema
import pytest
from starlette.testclient import TestClient

from src.api.main import app

_client = TestClient(app, raise_server_exceptions=True)


# ── Schema definitions ────────────────────────────────────────────────────────

_SUCCESS_ENVELOPE = {
    "type": "object",
    "required": ["success"],
    "properties": {
        "success": {"type": "boolean", "const": True},
    },
}

_ERROR_ENVELOPE = {
    "type": "object",
    "required": ["success", "error"],
    "properties": {
        "success": {"type": "boolean", "const": False},
        "error": {
            "type": "object",
            "required": ["code", "message"],
            "properties": {
                "code":    {"type": "string"},
                "message": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
}

_HEALTH_SCHEMA = {
    "type": "object",
    "required": ["success"],
    "properties": {
        "success": {"type": "boolean", "const": True},
        "status":  {"type": "string"},
    },
}

_STATS_SCHEMA = {
    "type": "object",
    "required": ["success", "stats"],
    "properties": {
        "success": {"type": "boolean"},
        "stats":   {"type": "object"},
    },
}

_GENRES_SCHEMA = {
    "type": "object",
    "required": ["success", "count", "genres"],
    "properties": {
        "success": {"type": "boolean"},
        "count":   {"type": "integer", "minimum": 0},
        "genres":  {"type": "array", "items": {"type": "string"}},
    },
}

_SEARCH_SCHEMA = {
    "type": "object",
    "required": ["success", "query", "count", "results"],
    "properties": {
        "success": {"type": "boolean"},
        "query":   {"type": "string"},
        "count":   {"type": "integer", "minimum": 0},
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["title"],
                "properties": {"title": {"type": "string"}},
            },
        },
    },
}

_RECOMMEND_SCHEMA = {
    "type": "object",
    "required": ["success", "movie", "count", "recommendations", "posters"],
    "properties": {
        "success":         {"type": "boolean"},
        "movie":           {"type": "string"},
        "count":           {"type": "integer", "minimum": 0},
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["title"],
                "properties": {"title": {"type": "string"}},
            },
        },
        "posters": {"type": "object"},
    },
}

_WATCHLIST_RECS_SCHEMA = {
    "type": "object",
    "required": ["success", "count", "recommendations", "posters"],
    "properties": {
        "success":         {"type": "boolean"},
        "count":           {"type": "integer", "minimum": 0},
        "recommendations": {"type": "array"},
        "posters":         {"type": "object"},
    },
}

_CHAT_SCHEMA = {
    "type": "object",
    "required": ["success", "reply", "suggested_movies", "messages"],
    "properties": {
        "success":          {"type": "boolean"},
        "reply":            {"type": "string"},
        "suggested_movies": {"type": "array", "items": {"type": "string"}},
        "messages":         {"type": "array"},
    },
}

_MOVIE_DETAIL_SCHEMA = {
    "type": "object",
    "required": ["success", "movie"],
    "properties": {
        "success": {"type": "boolean"},
        "movie":   {"type": "object"},
    },
}


def _assert_schema(data: dict, schema: dict, label: str = ""):
    try:
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.ValidationError as exc:
        pytest.fail(f"Schema validation failed{' for ' + label if label else ''}: {exc.message}")


# ── Contract test classes ─────────────────────────────────────────────────────

class TestHealthContract:
    def test_health_response_matches_schema(self):
        _assert_schema(_client.get("/health").json(), _HEALTH_SCHEMA, "/health")


class TestStatsContract:
    def test_stats_response_matches_schema(self):
        _assert_schema(_client.get("/stats").json(), _STATS_SCHEMA, "/stats")


class TestGenresContract:
    def test_genres_response_matches_schema(self):
        _assert_schema(_client.get("/genres").json(), _GENRES_SCHEMA, "/genres")

    def test_genres_items_are_strings(self):
        genres = _client.get("/genres").json()["genres"]
        for g in genres:
            assert isinstance(g, str), f"Genre {g!r} is not a string"


class TestSearchContract:
    def test_search_success_matches_schema(self):
        r = _client.get("/search", params={"query": "Avatar"})
        _assert_schema(r.json(), _SEARCH_SCHEMA, "/search success")

    def test_search_result_items_have_string_titles(self):
        results = _client.get("/search", params={"query": "dark"}).json()["results"]
        for item in results:
            assert isinstance(item["title"], str)


class TestRecommendContract:
    def test_recommend_success_matches_schema(self):
        r = _client.get("/recommend", params={"movie": "Inception"})
        _assert_schema(r.json(), _RECOMMEND_SCHEMA, "/recommend success")

    def test_recommend_404_matches_error_schema(self):
        r = _client.get("/recommend", params={"movie": "ZZZNotInDataset99999"})
        _assert_schema(r.json(), _ERROR_ENVELOPE, "/recommend 404")

    def test_watchlist_recommend_matches_schema(self):
        r = _client.post(
            "/recommend/watchlist",
            json={"titles": ["Inception", "Avatar"], "n": 3},
        )
        _assert_schema(r.json(), _WATCHLIST_RECS_SCHEMA, "/recommend/watchlist")


class TestChatContract:
    def test_chat_success_matches_schema(self):
        mock_reply = "Check out The Matrix — a groundbreaking sci-fi!"
        with patch(
            "src.services.chatbot_service.send_message",
            return_value=(mock_reply, [{"role": "assistant", "content": mock_reply}]),
        ):
            r = _client.post("/chat", json={"message": "Suggest a movie"})
        _assert_schema(r.json(), _CHAT_SCHEMA, "/chat success")

    def test_chat_suggested_movies_all_strings(self):
        mock_reply = "I recommend Inception and Avatar."
        with patch(
            "src.services.chatbot_service.send_message",
            return_value=(mock_reply, []),
        ):
            r = _client.post("/chat", json={"message": "movies like The Matrix"})
        for title in r.json()["suggested_movies"]:
            assert isinstance(title, str)


class TestMovieDetailContract:
    def test_movie_detail_success_matches_schema(self):
        r = _client.get("/movie/Avatar")
        _assert_schema(r.json(), _MOVIE_DETAIL_SCHEMA, "/movie/{title} success")

    def test_movie_not_found_matches_error_schema(self):
        r = _client.get("/movie/ZZZNonExistentMovie99999")
        _assert_schema(r.json(), _ERROR_ENVELOPE, "/movie/{title} 404")


class TestErrorEnvelopeConsistency:
    """Every endpoint that returns an error must use the standard error envelope."""

    @pytest.mark.parametrize("path,params", [
        ("/movie/ZZZBadTitle99",        {}),
        ("/recommend?movie=ZZZBad99",   {}),
        ("/movies?genre=ZZZBadGenre99", {}),
    ])
    def test_error_responses_use_standard_envelope(self, path, params):
        r = _client.get(path)
        assert r.status_code in (400, 404, 422)
        if r.status_code != 422:   # 422 is FastAPI's own format, not our envelope
            _assert_schema(r.json(), _ERROR_ENVELOPE, path)
