"""
Tests for the LinkedIn OAuth 2.0 router (/api/auth/linkedin).
All external HTTP calls are mocked — no real LinkedIn requests.
"""
import pytest
from tests.conftest import make_user, login, auth_headers


# ---------------------------------------------------------------------------
# State store helpers (_store_state / _consume_state)
# ---------------------------------------------------------------------------

def test_store_and_consume_state():
    from app.routers.linkedin_auth import _store_state, _consume_state
    state = _store_state(42)
    assert isinstance(state, str) and len(state) > 0
    user_id = _consume_state(state)
    assert user_id == 42


def test_consume_state_once_only():
    """State must be single-use."""
    from app.routers.linkedin_auth import _store_state, _consume_state
    state = _store_state(7)
    assert _consume_state(state) == 7
    assert _consume_state(state) is None  # already consumed


def test_consume_unknown_state_returns_none():
    from app.routers.linkedin_auth import _consume_state
    assert _consume_state("nonexistent-state-xyz") is None


# ---------------------------------------------------------------------------
# GET /api/auth/linkedin — initiate OAuth
# ---------------------------------------------------------------------------

def test_linkedin_authorize_redirects_when_configured(client):
    """When client_id is set, should redirect to LinkedIn consent URL."""
    from app.config import settings
    original = settings.linkedin_client_id
    try:
        settings.linkedin_client_id = "test-client-id"
        resp = client.get("/api/auth/linkedin?user_id=1", follow_redirects=False)
        assert resp.status_code in (302, 307)
        location = resp.headers.get("location", "")
        assert "linkedin.com/oauth/v2/authorization" in location
        assert "test-client-id" in location
        assert "openid" in location
    finally:
        settings.linkedin_client_id = original


def test_linkedin_authorize_redirects_to_error_when_not_configured(client):
    """When client_id is empty, redirect to frontend with error."""
    from app.config import settings
    original = settings.linkedin_client_id
    try:
        settings.linkedin_client_id = ""
        resp = client.get("/api/auth/linkedin?user_id=1", follow_redirects=False)
        assert resp.status_code in (302, 307)
        assert "linkedin_error=not_configured" in resp.headers.get("location", "")
    finally:
        settings.linkedin_client_id = original


def test_linkedin_authorize_missing_user_id(client):
    """user_id query param is required."""
    resp = client.get("/api/auth/linkedin")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/auth/linkedin/callback — handle OAuth response
# ---------------------------------------------------------------------------

def test_callback_missing_code_redirects_with_error(client):
    resp = client.get("/api/auth/linkedin/callback", follow_redirects=False)
    assert resp.status_code in (302, 307)
    assert "linkedin_error" in resp.headers.get("location", "")


def test_callback_with_error_param_redirects(client):
    resp = client.get(
        "/api/auth/linkedin/callback?error=access_denied&state=xyz",
        follow_redirects=False,
    )
    assert resp.status_code in (302, 307)
    assert "access_denied" in resp.headers.get("location", "")


def test_callback_invalid_state_redirects_with_error(client):
    resp = client.get(
        "/api/auth/linkedin/callback?code=abc&state=invalid-state-xyz",
        follow_redirects=False,
    )
    assert resp.status_code in (302, 307)
    assert "invalid_state" in resp.headers.get("location", "")


def test_callback_valid_flow_updates_user(client):
    """Full happy-path: valid state → token exchange → user updated."""
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.routers.linkedin_auth import _store_state

    user = make_user(client)
    state = _store_state(user["id"])

    token_resp = MagicMock()
    token_resp.status_code = 200
    token_resp.json.return_value = {"access_token": "fake-oauth-token"}

    profile_resp = MagicMock()
    profile_resp.status_code = 200
    profile_resp.json.return_value = {"name": "Test User", "email": "test@test.com"}

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=token_resp)
    mock_client.get = AsyncMock(return_value=profile_resp)

    with patch("app.routers.linkedin_auth.httpx.AsyncClient") as MockHTTP:
        MockHTTP.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        MockHTTP.return_value.__aexit__ = AsyncMock(return_value=False)

        resp = client.get(
            f"/api/auth/linkedin/callback?code=fake-code&state={state}",
            follow_redirects=False,
        )

    assert resp.status_code in (302, 307)
    assert "linkedin_connected=true" in resp.headers.get("location", "")

    # Verify token was stored in DB
    from app.main import app as _app
    from app.database import get_db
    from app.models import User as UserModel
    override = _app.dependency_overrides.get(get_db)
    gen = override()
    db = next(gen)
    try:
        db_user = db.query(UserModel).filter(UserModel.id == user["id"]).first()
        assert db_user.linkedin_oauth_token == "fake-oauth-token"
    finally:
        db.close()


def test_callback_token_exchange_failure_redirects(client):
    """When LinkedIn token exchange fails, redirect with error."""
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.routers.linkedin_auth import _store_state

    user = make_user(client)
    state = _store_state(user["id"])

    token_resp = MagicMock()
    token_resp.status_code = 400
    token_resp.json.return_value = {}

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=token_resp)

    with patch("app.routers.linkedin_auth.httpx.AsyncClient") as MockHTTP:
        MockHTTP.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        MockHTTP.return_value.__aexit__ = AsyncMock(return_value=False)

        resp = client.get(
            f"/api/auth/linkedin/callback?code=bad-code&state={state}",
            follow_redirects=False,
        )

    assert resp.status_code in (302, 307)
    assert "token_exchange" in resp.headers.get("location", "")


# ---------------------------------------------------------------------------
# DELETE /api/auth/linkedin/{user_id} — disconnect
# ---------------------------------------------------------------------------

def test_disconnect_clears_oauth_token(client):
    from unittest.mock import AsyncMock, patch, MagicMock
    from app.routers.linkedin_auth import _store_state

    user = make_user(client)
    state = _store_state(user["id"])

    # First connect
    token_resp = MagicMock()
    token_resp.status_code = 200
    token_resp.json.return_value = {"access_token": "token-to-clear"}

    profile_resp = MagicMock()
    profile_resp.status_code = 200
    profile_resp.json.return_value = {}

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=token_resp)
    mock_client.get = AsyncMock(return_value=profile_resp)

    with patch("app.routers.linkedin_auth.httpx.AsyncClient") as MockHTTP:
        MockHTTP.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        MockHTTP.return_value.__aexit__ = AsyncMock(return_value=False)
        client.get(f"/api/auth/linkedin/callback?code=c&state={state}", follow_redirects=False)

    # Now disconnect
    resp = client.delete(f"/api/auth/linkedin/{user['id']}")
    assert resp.status_code == 200

    # Verify token cleared in DB
    from app.main import app as _app
    from app.database import get_db
    from app.models import User as UserModel
    override = _app.dependency_overrides.get(get_db)
    gen = override()
    db = next(gen)
    try:
        db_user = db.query(UserModel).filter(UserModel.id == user["id"]).first()
        assert db_user.linkedin_oauth_token is None
    finally:
        db.close()


def test_disconnect_nonexistent_user_still_200(client):
    """Disconnect is idempotent — non-existent user returns 200."""
    resp = client.delete("/api/auth/linkedin/99999")
    assert resp.status_code == 200
