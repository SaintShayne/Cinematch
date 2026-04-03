"""
Real integration tests for the /recommend endpoint.

Requirements:
    pip install pytest httpx
    Backend must be running: uvicorn src.api.main:app --port 8000

Run:
    pytest tests/test_api_recommend.py -v
"""

import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"
TIMEOUT = 15


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        yield c


class TestRecommend:
    def test_status_200_known_movie(self, client):
        r = client.get("/recommend", params={"movie": "Avatar"})
        assert r.status_code == 200

    def test_response_envelope(self, client):
        r = client.get("/recommend", params={"movie": "Inception"})
        body = r.json()
        assert body.get("success") is True
        assert "movie" in body
        assert "count" in body
        assert "recommendations" in body

    def test_results_non_empty(self, client):
        r = client.get("/recommend", params={"movie": "The Dark Knight"})
        body = r.json()
        assert body["count"] > 0
        assert len(body["recommendations"]) > 0

    def test_each_recommendation_has_title(self, client):
        r = client.get("/recommend", params={"movie": "Avatar"})
        recs = r.json()["recommendations"]
        for rec in recs:
            assert "title" in rec

    def test_seed_movie_not_in_results(self, client):
        """Recommendations should not include the seed movie itself."""
        r = client.get("/recommend", params={"movie": "Avatar"})
        titles = [rec["title"].lower() for rec in r.json()["recommendations"]]
        assert "avatar" not in titles

    def test_n_param_respected(self, client):
        r = client.get("/recommend", params={"movie": "Titanic", "n": 3})
        body = r.json()
        assert len(body["recommendations"]) <= 3

    def test_unknown_movie_returns_error(self, client):
        r = client.get("/recommend", params={"movie": "ZZZNonExistentMovie12345"})
        assert r.status_code == 404
        body = r.json()
        assert body.get("success") is False
        assert "error" in body
        assert body["error"]["code"] == "NOT_FOUND"

    def test_different_seeds_give_different_recs(self, client):
        r1 = client.get("/recommend", params={"movie": "Avatar"})
        r2 = client.get("/recommend", params={"movie": "The Notebook"})
        titles1 = {rec["title"] for rec in r1.json()["recommendations"]}
        titles2 = {rec["title"] for rec in r2.json()["recommendations"]}
        # Two very different genres → almost no overlap expected
        assert titles1 != titles2

    def test_posters_key_present(self, client):
        r = client.get("/recommend", params={"movie": "Interstellar"})
        body = r.json()
        assert "posters" in body
