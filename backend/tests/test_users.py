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
# Get user
# ---------------------------------------------------------------------------

def test_get_user(client):
    user = make_user(client, "get@test.com", "pass1234", full_name="Get Me")
    resp = client.get(f"/api/users/{user['id']}")
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Get Me"


def test_get_nonexistent_user(client):
    resp = client.get("/api/users/99999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update user
# ---------------------------------------------------------------------------

def test_update_target_role(client):
    user = make_user(client, "upd@test.com", "pass1234")
    resp = client.put(f"/api/users/{user['id']}", json={"target_role": "Senior Engineer"})
    assert resp.status_code == 200
    assert resp.json()["target_role"] == "Senior Engineer"


def test_update_skills_as_list(client):
    user = make_user(client, "skills@test.com", "pass1234")
    resp = client.put(f"/api/users/{user['id']}", json={"skills": ["Go", "Rust"]})
    assert resp.status_code == 200
    assert resp.json()["skills"] == ["Go", "Rust"]


def test_update_work_mode(client):
    user = make_user(client, "wm@test.com", "pass1234")
    for mode in ("remote", "hybrid", "onsite"):
        resp = client.put(f"/api/users/{user['id']}", json={"work_mode_preference": mode})
        assert resp.status_code == 200, f"mode={mode} failed: {resp.text}"
        assert resp.json()["work_mode_preference"] == mode


def test_update_invalid_work_mode(client):
    user = make_user(client, "iwm@test.com", "pass1234")
    resp = client.put(f"/api/users/{user['id']}", json={"work_mode_preference": "moonbase"})
    assert resp.status_code == 422


def test_update_nonexistent_user(client):
    resp = client.put("/api/users/99999", json={"target_role": "X"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete user
# ---------------------------------------------------------------------------

def test_delete_user(client):
    user = make_user(client, "del@test.com", "pass1234")
    resp = client.delete(f"/api/users/{user['id']}")
    assert resp.status_code == 204
    # Verify gone
    assert client.get(f"/api/users/{user['id']}").status_code == 404


def test_delete_nonexistent_user(client):
    resp = client.delete("/api/users/99999")
    assert resp.status_code == 404
