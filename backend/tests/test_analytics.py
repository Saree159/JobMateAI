"""
Tests for the /api/analytics/dashboard endpoint.
"""
import pytest
from tests.conftest import make_user, login, auth_headers


def make_job(client, user_id, title="Dev", status="saved"):
    resp = client.post(
        f"/api/users/{user_id}/jobs",
        json={"title": title, "company": "Corp", "description": "Desc"},
    )
    assert resp.status_code == 201
    job_id = resp.json()["id"]
    if status != "saved":
        client.put(f"/api/jobs/{job_id}", json={"status": status})
    return resp.json()


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------

def test_analytics_requires_auth(client):
    resp = client.get("/api/analytics/dashboard")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Empty dashboard
# ---------------------------------------------------------------------------

def test_analytics_empty(client):
    make_user(client)
    token = login(client)
    resp = client.get("/api/analytics/dashboard", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["stats"]["total_applications"] == 0
    assert data["stats"]["success_rate"] == 0.0
    assert data["monthly_trends"] == []
    assert data["top_companies"] == []


# ---------------------------------------------------------------------------
# With data
# ---------------------------------------------------------------------------

def test_analytics_counts_all_jobs(client):
    user = make_user(client)
    token = login(client)
    for i in range(5):
        make_job(client, user["id"], title=f"Job {i}")

    resp = client.get("/api/analytics/dashboard", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["stats"]["total_applications"] == 5


def test_analytics_status_breakdown(client):
    user = make_user(client)
    token = login(client)
    make_job(client, user["id"], title="Saved Job", status="saved")
    make_job(client, user["id"], title="Applied Job", status="applied")
    make_job(client, user["id"], title="Offer Job", status="offer")

    resp = client.get("/api/analytics/dashboard", headers=auth_headers(token))
    data = resp.json()
    by_status = data["stats"]["by_status"]
    assert by_status.get("saved", 0) >= 1
    assert by_status.get("applied", 0) >= 1
    assert by_status.get("offer", 0) >= 1


def test_analytics_success_rate_with_offer(client):
    user = make_user(client)
    token = login(client)
    make_job(client, user["id"], status="applied")
    make_job(client, user["id"], status="offer")  # 1 out of 2 = 50%

    resp = client.get("/api/analytics/dashboard", headers=auth_headers(token))
    rate = resp.json()["stats"]["success_rate"]
    assert rate == 50.0


def test_analytics_isolation(client):
    """User A's jobs don't appear in User B's dashboard."""
    u1 = make_user(client, "u1@test.com")
    u2 = make_user(client, "u2@test.com")
    t2 = login(client, "u2@test.com")

    for i in range(3):
        make_job(client, u1["id"], title=f"U1 Job {i}")

    resp = client.get("/api/analytics/dashboard", headers=auth_headers(t2))
    assert resp.json()["stats"]["total_applications"] == 0


def test_analytics_top_companies(client):
    user = make_user(client)
    token = login(client)
    for company in ["Google", "Google", "Meta"]:
        client.post(
            f"/api/users/{user['id']}/jobs",
            json={"title": "SWE", "company": company, "description": "Desc"},
        )

    resp = client.get("/api/analytics/dashboard", headers=auth_headers(token))
    top = resp.json()["top_companies"]
    assert len(top) > 0
    companies = [c["company"] for c in top]
    assert "Google" in companies


def test_analytics_response_shape(client):
    """Verify the response includes all expected top-level keys."""
    make_user(client)
    token = login(client)
    resp = client.get("/api/analytics/dashboard", headers=auth_headers(token))
    data = resp.json()
    assert "stats" in data
    assert "monthly_trends" in data
    assert "match_score_distribution" in data
    assert "top_companies" in data
    assert "status_funnel" in data
