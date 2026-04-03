"""
Real integration tests for the /search and /semantic-search endpoints.

Requirements:
    pip install pytest httpx
    Backend must be running: uvicorn src.api.main:app --port 8000

Run:
    pytest tests/test_api_search.py -v
"""

import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"
TIMEOUT = 15


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        yield c


# ── /search ───────────────────────────────────────────────────────────────────

class TestSearch:
    def test_status_200(self, client):
        r = client.get("/search", params={"query": "Avatar"})
        assert r.status_code == 200

    def test_response_structure(self, client):
        r = client.get("/search", params={"query": "Avatar"})
        body = r.json()
        assert body.get("success") is True
        assert "query" in body
        assert "count" in body
        assert "results" in body

    def test_results_non_empty(self, client):
        r = client.get("/search", params={"query": "Avatar"})
        body = r.json()
        assert body["count"] > 0
        assert len(body["results"]) > 0

    def test_result_has_required_fields(self, client):
        r = client.get("/search", params={"query": "Inception"})
        results = r.json()["results"]
        first = results[0]
        assert "title" in first

    def test_limit_respected(self, client):
        r = client.get("/search", params={"query": "action", "limit": 3})
        body = r.json()
        assert len(body["results"]) <= 3

    def test_empty_query_rejected(self, client):
        r = client.get("/search", params={"query": ""})
        assert r.status_code == 422  # FastAPI validation

    def test_query_too_long_rejected(self, client):
        long_query = "a" * 201
        r = client.get("/search", params={"query": long_query})
        assert r.status_code in (400, 422)

    def test_different_query_returns_different_results(self, client):
        r1 = client.get("/search", params={"query": "Avatar"})
        r2 = client.get("/search", params={"query": "Titanic"})
        titles1 = {m["title"] for m in r1.json()["results"]}
        titles2 = {m["title"] for m in r2.json()["results"]}
        # The top result should differ between the two searches
        assert r1.json()["results"][0]["title"] != r2.json()["results"][0]["title"]


# ── /semantic-search ──────────────────────────────────────────────────────────

class TestSemanticSearch:
    def test_status_200(self, client):
        r = client.get("/semantic-search", params={"query": "space war epic"})
        assert r.status_code == 200

    def test_response_structure(self, client):
        r = client.get("/semantic-search", params={"query": "romantic comedy paris"})
        body = r.json()
        assert body.get("success") is True
        assert "query" in body
        assert "count" in body
        assert "results" in body

    def test_results_non_empty(self, client):
        r = client.get("/semantic-search", params={"query": "scary horror movie"})
        body = r.json()
        assert body["count"] > 0
        assert len(body["results"]) > 0

    def test_result_has_title(self, client):
        r = client.get("/semantic-search", params={"query": "heist thriller"})
        results = r.json()["results"]
        for item in results:
            assert "title" in item

    def test_limit_respected(self, client):
        r = client.get("/semantic-search", params={"query": "comedy", "limit": 3})
        body = r.json()
        assert len(body["results"]) <= 3

    def test_vague_query_returns_results(self, client):
        """Semantic search should handle vague natural-language queries."""
        r = client.get("/semantic-search", params={"query": "something with good visuals"})
        assert r.status_code == 200
        body = r.json()
        assert body["count"] > 0
