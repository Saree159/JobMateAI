"""
Tests for the /api/users endpoints: registration, login, profile CRUD, delete.
"""
import pytest
from tests.conftest import make_user, login, auth_headers


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def test_register_minimal(client):
    data = make_user(client, "a@test.com", "secret99")
    assert data["email"] == "a@test.com"
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_full_profile(client):
    data = make_user(
        client,
        email="full@test.com",
        password="secret99",
        full_name="Alice Smith",
        target_role="Backend Engineer",
        skills=["Python", "FastAPI"],
        location_preference="Tel Aviv",
        work_mode_preference="remote",
    )
    assert data["full_name"] == "Alice Smith"
    assert data["target_role"] == "Backend Engineer"
    assert "Python" in data["skills"]
    assert data["location_preference"] == "Tel Aviv"
    assert data["work_mode_preference"] == "remote"


def test_register_duplicate_email_fails(client):
    make_user(client, "dup@test.com", "pass1234")
    resp = client.post("/api/users", json={"email": "dup@test.com", "password": "pass1234"})
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


def test_register_invalid_email_fails(client):
    resp = client.post("/api/users", json={"email": "not-an-email", "password": "pass1234"})
    assert resp.status_code == 422


def test_register_short_password_fails(client):
    resp = client.post("/api/users", json={"email": "short@test.com", "password": "abc"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------

def test_unverified_user_cannot_login(client):
    """Registering without verifying should block login."""
    resp = client.post("/api/users", json={"email": "unverified@test.com", "password": "pass1234"})
    assert resp.status_code == 201
    login_resp = client.post("/api/users/login", json={"email": "unverified@test.com", "password": "pass1234"})
    assert login_resp.status_code == 403
    assert "EMAIL_NOT_VERIFIED" in login_resp.json()["detail"]


def test_verify_email_flow(client):
    """Register → extract token → verify → login succeeds."""
    resp = client.post("/api/users", json={"email": "verify@test.com", "password": "pass1234"})
    assert resp.status_code == 201
    user_id = resp.json()["id"]

    # Get token from DB via the test override
    from app.main import app as _app
    from app.database import get_db
    from app.models import User as UserModel
    override = _app.dependency_overrides.get(get_db)
    assert override, "No DB override in test"
    gen = override()
    db = next(gen)
    try:
        db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
        token = db_user.verification_token
    finally:
        db.close()

    verify_resp = client.get(f"/api/users/verify-email?token={token}")
    assert verify_resp.status_code == 200

    login_resp = client.post("/api/users/login", json={"email": "verify@test.com", "password": "pass1234"})
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_verify_invalid_token_fails(client):
    verify_resp = client.get("/api/users/verify-email?token=totallywrongtoken")
    assert verify_resp.status_code == 400


def test_resend_verification_always_200(client):
    """Resend endpoint returns 200 regardless of whether email exists."""
    resp = client.post("/api/users/resend-verification", json={"email": "nobody@test.com"})
    assert resp.status_code == 200


def test_resend_verification_works(client):
    """After resend, new token works."""
    client.post("/api/users", json={"email": "resend@test.com", "password": "pass1234"})

    # Call resend — generates a new token
    resp = client.post("/api/users/resend-verification", json={"email": "resend@test.com"})
    assert resp.status_code == 200

    # Fetch new token from DB
    from app.main import app as _app
    from app.database import get_db
    from app.models import User as UserModel
    override = _app.dependency_overrides.get(get_db)
    gen = override()
    db = next(gen)
    try:
        db_user = db.query(UserModel).filter(UserModel.email == "resend@test.com").first()
        new_token = db_user.verification_token
    finally:
        db.close()

    verify_resp = client.get(f"/api/users/verify-email?token={new_token}")
    assert verify_resp.status_code == 200


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_success(client):
    make_user(client, "login@test.com", "mypassword")
    resp = client.post("/api/users/login", json={"email": "login@test.com", "password": "mypassword"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client):
    make_user(client, "wp@test.com", "correct")
    resp = client.post("/api/users/login", json={"email": "wp@test.com", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/api/users/login", json={"email": "nobody@test.com", "password": "pass"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Get user (requires auth)
# ---------------------------------------------------------------------------

def test_get_user(client):
    user = make_user(client, "get@test.com", "pass1234", full_name="Get Me")
    token = login(client, "get@test.com")
    resp = client.get(f"/api/users/{user['id']}", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Get Me"


def test_get_other_users_profile_forbidden(client):
    make_user(client, "u1@test.com")
    u2 = make_user(client, "u2@test.com")
    token = login(client, "u1@test.com")
    resp = client.get(f"/api/users/{u2['id']}", headers=auth_headers(token))
    assert resp.status_code == 403


def test_get_user_no_auth(client):
    user = make_user(client, "noauth@test.com")
    resp = client.get(f"/api/users/{user['id']}")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Update user (requires auth)
# ---------------------------------------------------------------------------

def test_update_target_role(client):
    user = make_user(client, "upd@test.com", "pass1234")
    token = login(client, "upd@test.com")
    resp = client.put(f"/api/users/{user['id']}", json={"target_role": "Senior Engineer"}, headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["target_role"] == "Senior Engineer"


def test_update_skills_as_list(client):
    user = make_user(client, "skills@test.com", "pass1234")
    token = login(client, "skills@test.com")
    resp = client.put(f"/api/users/{user['id']}", json={"skills": ["Go", "Rust"]}, headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["skills"] == ["Go", "Rust"]


def test_update_work_mode(client):
    user = make_user(client, "wm@test.com", "pass1234")
    token = login(client, "wm@test.com")
    for mode in ("remote", "hybrid", "onsite"):
        resp = client.put(f"/api/users/{user['id']}", json={"work_mode_preference": mode}, headers=auth_headers(token))
        assert resp.status_code == 200, f"mode={mode} failed: {resp.text}"
        assert resp.json()["work_mode_preference"] == mode


def test_update_invalid_work_mode(client):
    user = make_user(client, "iwm@test.com", "pass1234")
    token = login(client, "iwm@test.com")
    resp = client.put(f"/api/users/{user['id']}", json={"work_mode_preference": "moonbase"}, headers=auth_headers(token))
    assert resp.status_code == 422


def test_update_other_users_profile_forbidden(client):
    make_user(client, "a@test.com")
    u2 = make_user(client, "b@test.com")
    token_a = login(client, "a@test.com")
    resp = client.put(f"/api/users/{u2['id']}", json={"target_role": "X"}, headers=auth_headers(token_a))
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Delete user (requires auth)
# ---------------------------------------------------------------------------

def test_delete_user(client):
    user = make_user(client, "del@test.com", "pass1234")
    token = login(client, "del@test.com")
    resp = client.delete(f"/api/users/{user['id']}", headers=auth_headers(token))
    assert resp.status_code == 204
    # Verify gone — even auth can't find it
    resp2 = client.get(f"/api/users/{user['id']}", headers=auth_headers(token))
    assert resp2.status_code in (401, 403, 404)


def test_delete_other_users_account_forbidden(client):
    make_user(client, "owner@test.com")
    u2 = make_user(client, "victim@test.com")
    token_owner = login(client, "owner@test.com")
    resp = client.delete(f"/api/users/{u2['id']}", headers=auth_headers(token_owner))
    assert resp.status_code == 403
