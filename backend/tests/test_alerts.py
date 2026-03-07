"""
Tests for the /api/alerts endpoints (authenticated).
"""
import pytest
from tests.conftest import make_user, login, auth_headers


def _alert_payload(**kwargs):
    base = {"keywords": "Python developer", "min_match_score": 70, "frequency": "daily"}
    return {**base, **kwargs}


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------

def test_create_alert_without_auth(client):
    resp = client.post("/api/alerts", json=_alert_payload())
    assert resp.status_code == 403


def test_get_alerts_without_auth(client):
    resp = client.get("/api/alerts")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def test_create_alert(client):
    make_user(client)
    token = login(client)
    resp = client.post("/api/alerts", json=_alert_payload(), headers=auth_headers(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["keywords"] == "Python developer"
    assert data["min_match_score"] == 70
    assert data["frequency"] == "daily"
    assert data["is_active"] is True


def test_create_alert_with_location(client):
    make_user(client)
    token = login(client)
    resp = client.post(
        "/api/alerts",
        json=_alert_payload(keywords="React engineer", location="Tel Aviv"),
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    assert resp.json()["location"] == "Tel Aviv"


def test_create_alert_all_frequencies(client):
    make_user(client)
    token = login(client)
    for freq in ("immediate", "daily", "weekly"):
        resp = client.post(
            "/api/alerts",
            json=_alert_payload(keywords=f"dev {freq}", frequency=freq),
            headers=auth_headers(token),
        )
        assert resp.status_code == 201, f"frequency={freq}: {resp.text}"
        assert resp.json()["frequency"] == freq


def test_create_alert_invalid_frequency(client):
    make_user(client)
    token = login(client)
    resp = client.post(
        "/api/alerts",
        json=_alert_payload(frequency="monthly"),
        headers=auth_headers(token),
    )
    assert resp.status_code == 422


def test_create_alert_score_out_of_range(client):
    make_user(client)
    token = login(client)
    resp = client.post(
        "/api/alerts",
        json=_alert_payload(min_match_score=150),
        headers=auth_headers(token),
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

def test_list_alerts_empty(client):
    make_user(client)
    token = login(client)
    resp = client.get("/api/alerts", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_alerts_returns_own_only(client):
    make_user(client, "u1@test.com")
    make_user(client, "u2@test.com")
    t1 = login(client, "u1@test.com")
    t2 = login(client, "u2@test.com")

    client.post("/api/alerts", json=_alert_payload(keywords="U1 job"), headers=auth_headers(t1))
    client.post("/api/alerts", json=_alert_payload(keywords="U2 job"), headers=auth_headers(t2))

    alerts_u1 = client.get("/api/alerts", headers=auth_headers(t1)).json()
    assert len(alerts_u1) == 1
    assert alerts_u1[0]["keywords"] == "U1 job"


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

def test_update_alert_keywords(client):
    make_user(client)
    token = login(client)
    alert = client.post("/api/alerts", json=_alert_payload(), headers=auth_headers(token)).json()
    resp = client.put(
        f"/api/alerts/{alert['id']}",
        json={"keywords": "Django backend"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    assert resp.json()["keywords"] == "Django backend"


def test_pause_and_resume_alert(client):
    make_user(client)
    token = login(client)
    alert = client.post("/api/alerts", json=_alert_payload(), headers=auth_headers(token)).json()

    # Pause
    resp = client.put(
        f"/api/alerts/{alert['id']}",
        json={"is_active": False},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    # Resume
    resp = client.put(
        f"/api/alerts/{alert['id']}",
        json={"is_active": True},
        headers=auth_headers(token),
    )
    assert resp.json()["is_active"] is True


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def test_delete_alert(client):
    make_user(client)
    token = login(client)
    alert = client.post("/api/alerts", json=_alert_payload(), headers=auth_headers(token)).json()
    resp = client.delete(f"/api/alerts/{alert['id']}", headers=auth_headers(token))
    assert resp.status_code == 204
    # Confirm gone
    alerts = client.get("/api/alerts", headers=auth_headers(token)).json()
    assert not any(a["id"] == alert["id"] for a in alerts)


def test_cannot_delete_other_users_alert(client):
    make_user(client, "owner@test.com")
    make_user(client, "other@test.com")
    t_owner = login(client, "owner@test.com")
    t_other = login(client, "other@test.com")

    alert = client.post("/api/alerts", json=_alert_payload(), headers=auth_headers(t_owner)).json()
    resp = client.delete(f"/api/alerts/{alert['id']}", headers=auth_headers(t_other))
    assert resp.status_code in (403, 404)
