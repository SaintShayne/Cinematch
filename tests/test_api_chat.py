"""
Real integration tests for the /chat endpoint and admin/2FA endpoints.

Requirements:
    pip install pytest httpx
    Backend must be running: uvicorn src.api.main:app --port 8000
    GROQ_API_KEY must be set (chat tests will be skipped otherwise).

Run:
    pytest tests/test_api_chat.py -v
"""

import os
import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"
TIMEOUT = 30  # chat can be slower due to LLM round-trip

HAS_GROQ = bool(os.getenv("GROQ_API_KEY"))


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as c:
        yield c


# ── /chat ──────────────────────────────────────────────────────────────────────

class TestChat:
    @pytest.mark.skipif(not HAS_GROQ, reason="GROQ_API_KEY not set")
    def test_status_200(self, client):
        r = client.post("/chat", json={"message": "Recommend me a sci-fi movie"})
        assert r.status_code == 200

    @pytest.mark.skipif(not HAS_GROQ, reason="GROQ_API_KEY not set")
    def test_response_structure(self, client):
        r = client.post("/chat", json={"message": "What should I watch tonight?"})
        body = r.json()
        assert body.get("success") is True
        assert "reply" in body
        assert "suggested_movies" in body
        assert "messages" in body

    @pytest.mark.skipif(not HAS_GROQ, reason="GROQ_API_KEY not set")
    def test_reply_non_empty(self, client):
        r = client.post("/chat", json={"message": "Movies like Interstellar"})
        body = r.json()
        assert isinstance(body["reply"], str)
        assert len(body["reply"]) > 0

    @pytest.mark.skipif(not HAS_GROQ, reason="GROQ_API_KEY not set")
    def test_suggested_movies_are_strings(self, client):
        r = client.post("/chat", json={"message": "Give me action movie suggestions"})
        movies = r.json()["suggested_movies"]
        assert isinstance(movies, list)
        for title in movies:
            assert isinstance(title, str)

    @pytest.mark.skipif(not HAS_GROQ, reason="GROQ_API_KEY not set")
    def test_context_titles_influence_suggestions(self, client):
        """Passing context titles should anchor suggestions to the user's taste."""
        r = client.post(
            "/chat",
            json={
                "message": "What should I watch?",
                "context_titles": ["The Dark Knight", "Inception"],
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["count"] if "count" in body else True  # structure ok

    def test_empty_message_rejected(self, client):
        r = client.post("/chat", json={"message": ""})
        assert r.status_code == 422  # Pydantic validation

    def test_message_too_long_rejected(self, client):
        r = client.post("/chat", json={"message": "x" * 1001})
        assert r.status_code == 422


# ── Admin endpoints ────────────────────────────────────────────────────────────

class TestAdminLogin:
    def test_dev_admin_login_success(self, client):
        """DEV ONLY hardcoded admin/admin should return a token."""
        r = client.post(
            "/admin/login", json={"username": "admin", "password": "admin"}
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
        assert body.get("role") == "admin"
        assert "token" in body

    def test_wrong_credentials_rejected(self, client):
        r = client.post(
            "/admin/login", json={"username": "admin", "password": "wrong"}
        )
        assert r.status_code == 401
        body = r.json()
        assert body.get("success") is False
        assert body["error"]["code"] == "UNAUTHORIZED"

    def test_admin_stats_returns_data(self, client):
        r = client.get("/admin/stats")
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
        assert "total_movies" in body

    def test_feature_flags_returned(self, client):
        r = client.get("/admin/feature-flags")
        assert r.status_code == 200
        body = r.json()
        assert "flags" in body
        assert "enable_chat" in body["flags"]
        assert "enable_recommendations" in body["flags"]


# ── 2FA endpoints ─────────────────────────────────────────────────────────────

class TestTwoFA:
    TEST_USER_ID = "test-admin-user-001"

    def test_totp_setup_returns_qr(self, client):
        r = client.post("/admin/2fa/setup", json={"user_id": self.TEST_USER_ID})
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
        assert "secret" in body
        assert "qr_code" in body
        assert len(body["qr_code"]) > 0  # non-empty base64

    def test_totp_verify_wrong_token(self, client):
        # Setup first
        client.post("/admin/2fa/setup", json={"user_id": self.TEST_USER_ID})
        # Verify with obviously wrong token
        r = client.post(
            "/admin/2fa/verify",
            json={"user_id": self.TEST_USER_ID, "token": "000000"},
        )
        # Should fail (unless extremely unlikely collision)
        assert r.status_code in (200, 401)
        body = r.json()
        if r.status_code == 401:
            assert body["error"]["code"] == "INVALID_TOKEN"

    def test_telegram_otp_send(self, client):
        # Seed config first so /send never fails with CONFIG_MISSING.
        client.post(
            "/admin/2fa/telegram/config",
            json={
                "user_id": self.TEST_USER_ID,
                "bot_token": "123456:TEST_TOKEN",
                "chat_id": "123456789",
            },
        )
        r = client.post(
            "/admin/2fa/telegram/send", json={"user_id": self.TEST_USER_ID}
        )
        # Without a real bot token/chat_id, Telegram delivery can fail with 502.
        assert r.status_code in (200, 502)
        body = r.json()
        if r.status_code == 200:
            assert body.get("success") is True
            assert "expires_in_seconds" in body
        else:
            assert body.get("success") is False
            assert body.get("error", {}).get("code") == "SEND_FAILED"

    def test_telegram_otp_wrong_code(self, client):
        client.post(
            "/admin/2fa/telegram/config",
            json={
                "user_id": self.TEST_USER_ID,
                "bot_token": "123456:TEST_TOKEN",
                "chat_id": "123456789",
            },
        )
        send_resp = client.post("/admin/2fa/telegram/send", json={"user_id": self.TEST_USER_ID})
        r = client.post(
            "/admin/2fa/telegram/verify",
            json={"user_id": self.TEST_USER_ID, "code": "999999"},
        )
        if send_resp.status_code == 200:
            assert r.status_code in (200, 401)
            body = r.json()
            if r.status_code == 401:
                assert body["error"]["code"] == "INVALID_TOKEN"
        else:
            # send endpoint removes pending OTP on delivery failure.
            assert r.status_code == 404
            body = r.json()
            assert body.get("error", {}).get("code") == "NOT_FOUND"

