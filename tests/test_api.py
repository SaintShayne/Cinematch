"""
API smoke tests.

Before running:
python -m uvicorn src.api.main:app --reload
"""

import requests

BASE_URL = "http://127.0.0.1:8000"


def test_health():
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    print("HEALTH:", response.status_code, response.json())


def test_genres():
    response = requests.get(f"{BASE_URL}/genres", timeout=5)
    print("GENRES:", response.status_code, response.json())


def test_movies():
    response = requests.get(
        f"{BASE_URL}/movies",
        params={"genre": "Action", "page": 1, "page_size": 5},
        timeout=10
    )
    print("MOVIES:", response.status_code, response.json())


def test_search():
    response = requests.get(
        f"{BASE_URL}/search",
        params={"query": "Avatar", "limit": 5},
        timeout=10
    )
    print("SEARCH:", response.status_code, response.json())


def test_semantic_search():
    response = requests.get(
        f"{BASE_URL}/semantic-search",
        params={"query": "space war movie", "limit": 5},
        timeout=10
    )
    print("SEMANTIC SEARCH:", response.status_code, response.json())


def test_movie_details():
    response = requests.get(
        f"{BASE_URL}/movie/Avatar",
        timeout=10
    )
    print("DETAILS:", response.status_code, response.json())


def test_recommend():
    response = requests.get(
        f"{BASE_URL}/recommend",
        params={"movie": "Avatar", "n": 5},
        timeout=10
    )
    print("RECOMMEND:", response.status_code, response.json())


if __name__ == "__main__":
    test_health()
    test_genres()
    test_movies()
    test_search()
    test_semantic_search()
    test_movie_details()
    test_recommend()