"""
Layer 2 — Integration tests for all 19 CineMatch API endpoints.

HOW THIS WORKS
  starlette.testclient.TestClient wraps the FastAPI app as an ASGI transport.
  Requests travel through the full middleware stack (rate limiter, CORS, logging)
  but never touch a network socket. No uvicorn process required.

WHAT THESE TEST
  Every public endpoint: status codes, response envelope shape, basic business
  rules (unknown movie → 404, empty message → 422, seed not in its own recs, etc.)

WHAT THEY PREVENT
  - A route rename or removal breaking callers silently
  - Pydantic model changes that loosen/tighten validation unexpectedly
  - Business logic regressions (e.g. seed movie appearing in its own results)

HOW TO MAINTAIN
  - When a new endpoint is added, add a corresponding test class here.
  - Keep fixture titles consistent with tests/fixtures/tmdb_5000_movies.csv.
  - /chat uses a mock for send_message so no GROQ_API_KEY is needed locally.
  - Run with: pytest tests/integration/test_endpoints.py -v
"""

from unittest.mock import patch

from starlette.testclient import TestClient

from src.api.main import app

# One client for the entire module — app initialises once, rate-limit counters reset.
_client = TestClient(app, raise_server_exceptions=True)


# ── System endpoints ──────────────────────────────────────────────────────────

class TestSystemEndpoints:

    def test_root_returns_success(self):
        r = _client.get("/")
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_root_contains_message(self):
        r = _client.get("/")
        assert "message" in r.json()

    def test_health_returns_200(self):
        r = _client.get("/health")
        assert r.status_code == 200

    def test_health_success_flag_true(self):
        assert _client.get("/health").json()["success"] is True

    def test_stats_returns_200(self):
        assert _client.get("/stats").json()["success"] is True

    def test_stats_contains_stats_key(self):
        assert "stats" in _client.get("/stats").json()


# ── Browse endpoints ──────────────────────────────────────────────────────────

class TestBrowseEndpoints:

    def test_genres_returns_non_empty_list(self):
        r = _client.get("/genres")
        assert r.status_code == 200
        genres = r.json()["genres"]
        assert isinstance(genres, list)
        assert len(genres) > 0

    def test_movies_requires_genre_param(self):
        # Missing required query param → FastAPI 422 validation error
        r = _client.get("/movies")
        assert r.status_code == 422

    def test_movies_valid_genre_returns_200(self):
        genre = _client.get("/genres").json()["genres"][0]
        r = _client.get("/movies", params={"genre": genre})
        assert r.status_code == 200

    def test_movies_response_has_data_key(self):
        genre = _client.get("/genres").json()["genres"][0]
        r = _client.get("/movies", params={"genre": genre})
        assert "data" in r.json()

    def test_movies_unknown_genre_returns_404(self):
        r = _client.get("/movies", params={"genre": "ZZZNotAGenre"})
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"

    def test_trending_returns_200(self):
        r = _client.get("/trending")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_movie_detail_known_title(self):
        r = _client.get("/movie/Avatar")
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert "movie" in body

    def test_movie_detail_unknown_title_returns_404(self):
        r = _client.get("/movie/ZZZNonExistentMovie99999")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"

    def test_person_endpoint_returns_valid_response(self):
        # Director present in fixture credits data
        r = _client.get("/person/Christopher Nolan")
        assert r.status_code in (200, 404)
        body = r.json()
        if r.status_code == 200:
            assert "person" in body
        else:
            assert "error" in body


# ── Search endpoints ──────────────────────────────────────────────────────────

class TestSearchEndpoints:

    def test_search_returns_results_for_known_title(self):
        r = _client.get("/search", params={"query": "Avatar"})
        assert r.status_code == 200
        body = r.json()
        assert body["count"] > 0
        assert len(body["results"]) > 0

    def test_search_response_envelope(self):
        r = _client.get("/search", params={"query": "Inception"})
        body = r.json()
        assert body["success"] is True
        assert "query" in body
        assert "count" in body
        assert "results" in body

    def test_search_limit_param_respected(self):
        r = _client.get("/search", params={"query": "the", "limit": 2})
        assert len(r.json()["results"]) <= 2

    def test_search_empty_query_returns_422(self):
        r = _client.get("/search", params={"query": ""})
        assert r.status_code == 422

    def test_search_results_each_have_title(self):
        r = _client.get("/search", params={"query": "dark"})
        for item in r.json()["results"]:
            assert "title" in item

    def test_semantic_search_returns_results(self):
        r = _client.get("/semantic-search", params={"query": "space adventure"})
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert body["count"] > 0

    def test_semantic_search_results_have_title(self):
        r = _client.get("/semantic-search", params={"query": "crime thriller"})
        for item in r.json()["results"]:
            assert "title" in item

    def test_different_queries_give_different_top_results(self):
        r1 = _client.get("/search", params={"query": "Avatar"})
        r2 = _client.get("/search", params={"query": "Titanic"})
        top1 = r1.json()["results"][0]["title"]
        top2 = r2.json()["results"][0]["title"]
        assert top1 != top2


# ── Recommendation endpoints ──────────────────────────────────────────────────

class TestRecommendEndpoints:

    def test_recommend_known_movie_returns_200(self):
        r = _client.get("/recommend", params={"movie": "Inception"})
        assert r.status_code == 200

    def test_recommend_response_envelope(self):
        r = _client.get("/recommend", params={"movie": "Avatar"})
        body = r.json()
        assert body["success"] is True
        assert "movie" in body
        assert "count" in body
        assert "recommendations" in body
        assert "posters" in body

    def test_recommend_returns_at_least_one_result(self):
        r = _client.get("/recommend", params={"movie": "The Dark Knight"})
        assert r.json()["count"] > 0

    def test_recommend_n_param_caps_results(self):
        r = _client.get("/recommend", params={"movie": "Avatar", "n": 2})
        assert len(r.json()["recommendations"]) <= 2

    def test_seed_movie_not_in_its_own_results(self):
        r = _client.get("/recommend", params={"movie": "Avatar"})
        titles_lower = [rec["title"].lower() for rec in r.json()["recommendations"]]
        assert "avatar" not in titles_lower

    def test_each_recommendation_has_title(self):
        r = _client.get("/recommend", params={"movie": "Inception"})
        for rec in r.json()["recommendations"]:
            assert "title" in rec
            assert isinstance(rec["title"], str)
            assert len(rec["title"]) > 0

    def test_different_seeds_produce_different_results(self):
        r1 = _client.get("/recommend", params={"movie": "The Shining"})
        r2 = _client.get("/recommend", params={"movie": "Toy Story"})
        titles1 = {rec["title"] for rec in r1.json()["recommendations"]}
        titles2 = {rec["title"] for rec in r2.json()["recommendations"]}
        assert titles1 != titles2

    def test_recommend_unknown_movie_returns_404(self):
        r = _client.get("/recommend", params={"movie": "ZZZNotInDataset99999"})
        assert r.status_code == 404
        body = r.json()
        assert body["success"] is False
        assert body["error"]["code"] == "NOT_FOUND"

    def test_watchlist_recommend_returns_200(self):
        r = _client.post(
            "/recommend/watchlist",
            json={"titles": ["Inception", "The Dark Knight"], "n": 5},
        )
        assert r.status_code == 200
        body = r.json()
        assert "recommendations" in body
        assert "posters" in body

    def test_watchlist_recommend_empty_titles_rejected(self):
        r = _client.post("/recommend/watchlist", json={"titles": []})
        assert r.status_code == 400


# ── Chat endpoint ─────────────────────────────────────────────────────────────

class TestChatEndpoint:
    """
    send_message is mocked in every test here so no GROQ_API_KEY is required.
    The mock is applied at the module level (src.services.chatbot_service.send_message)
    which is where main.py's deferred `from ... import send_message` resolves.
    """

    _MOCK_REPLY    = "I recommend Inception — a mind-bending sci-fi thriller!"
    _MOCK_MESSAGES = [{"role": "assistant", "content": _MOCK_REPLY}]

    def test_chat_returns_200_with_mocked_llm(self):
        with patch(
            "src.services.chatbot_service.send_message",
            return_value=(self._MOCK_REPLY, self._MOCK_MESSAGES),
        ):
            r = _client.post("/chat", json={"message": "Suggest a good sci-fi movie"})
        assert r.status_code == 200

    def test_chat_response_envelope(self):
        with patch(
            "src.services.chatbot_service.send_message",
            return_value=(self._MOCK_REPLY, self._MOCK_MESSAGES),
        ):
            r = _client.post("/chat", json={"message": "Recommend something"})
        body = r.json()
        assert body["success"] is True
        assert "reply" in body
        assert "suggested_movies" in body
        assert "messages" in body

    def test_chat_reply_is_non_empty_string(self):
        with patch(
            "src.services.chatbot_service.send_message",
            return_value=(self._MOCK_REPLY, self._MOCK_MESSAGES),
        ):
            r = _client.post("/chat", json={"message": "What's a good action movie?"})
        reply = r.json()["reply"]
        assert isinstance(reply, str)
        assert len(reply) > 0

    def test_chat_suggested_movies_is_list_of_strings(self):
        with patch(
            "src.services.chatbot_service.send_message",
            return_value=(self._MOCK_REPLY, self._MOCK_MESSAGES),
        ):
            r = _client.post("/chat", json={"message": "movies like Inception"})
        movies = r.json()["suggested_movies"]
        assert isinstance(movies, list)
        for title in movies:
            assert isinstance(title, str)

    def test_chat_with_context_titles_returns_200(self):
        with patch(
            "src.services.chatbot_service.send_message",
            return_value=(self._MOCK_REPLY, self._MOCK_MESSAGES),
        ):
            r = _client.post(
                "/chat",
                json={
                    "message": "What should I watch next?",
                    "context_titles": ["Avatar", "Inception"],
                },
            )
        assert r.status_code == 200

    def test_chat_empty_message_returns_422(self):
        r = _client.post("/chat", json={"message": ""})
        assert r.status_code == 422

    def test_chat_message_too_long_returns_422(self):
        r = _client.post("/chat", json={"message": "x" * 1001})
        assert r.status_code == 422
