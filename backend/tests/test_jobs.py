"""
Tests for job CRUD (/api/users/{id}/jobs, /api/jobs/{id}),
feed jobs (/api/jobs), and today-count endpoint.
"""
import pytest
from tests.conftest import make_user, login, auth_headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_job(client, user_id, title="Dev", company="Corp", description="Desc"):
    resp = client.post(
        f"/api/users/{user_id}/jobs",
        json={"title": title, "company": company, "description": description},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Create job
# ---------------------------------------------------------------------------

def test_create_job_minimal(client):
    user = make_user(client)
    job = make_job(client, user["id"])
    assert job["title"] == "Dev"
    assert job["user_id"] == user["id"]
    assert job["status"] == "saved"


def test_create_job_full(client):
    user = make_user(client)
    resp = client.post(
        f"/api/users/{user['id']}/jobs",
        json={
            "title": "Full Stack Engineer",
            "company": "TechCo",
            "location": "Remote",
            "description": "We need a full-stack dev.",
            "apply_url": "https://techco.com/apply",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["location"] == "Remote"
    assert data["apply_url"] == "https://techco.com/apply"


def test_create_job_missing_description_fails(client):
    user = make_user(client)
    resp = client.post(
        f"/api/users/{user['id']}/jobs",
        json={"title": "Dev", "company": "Corp"},
    )
    assert resp.status_code == 422


def test_create_job_unknown_user(client):
    resp = client.post(
        "/api/users/99999/jobs",
        json={"title": "Dev", "company": "Corp", "description": "Desc"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# List jobs
# ---------------------------------------------------------------------------

def test_list_jobs_empty(client):
    user = make_user(client)
    resp = client.get(f"/api/users/{user['id']}/jobs")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_jobs_multiple(client):
    user = make_user(client)
    for i in range(4):
        make_job(client, user["id"], title=f"Job {i}", company=f"Co {i}")
    resp = client.get(f"/api/users/{user['id']}/jobs")
    assert resp.status_code == 200
    assert len(resp.json()) == 4


def test_list_jobs_isolation(client):
    """Jobs from user A should not appear in user B's list."""
    u1 = make_user(client, "u1@test.com")
    u2 = make_user(client, "u2@test.com")
    make_job(client, u1["id"], title="User1 Job")
    resp = client.get(f"/api/users/{u2['id']}/jobs")
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Update job
# ---------------------------------------------------------------------------

def test_update_job_status(client):
    user = make_user(client)
    job = make_job(client, user["id"])
    for new_status in ("applied", "interview", "offer", "rejected"):
        resp = client.put(f"/api/jobs/{job['id']}", json={"status": new_status})
        assert resp.status_code == 200, f"{new_status}: {resp.text}"
        assert resp.json()["status"] == new_status


def test_update_job_notes(client):
    user = make_user(client)
    job = make_job(client, user["id"])
    resp = client.put(f"/api/jobs/{job['id']}", json={"notes": "Great culture!"})
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Great culture!"


def test_update_job_invalid_status(client):
    user = make_user(client)
    job = make_job(client, user["id"])
    resp = client.put(f"/api/jobs/{job['id']}", json={"status": "flying"})
    assert resp.status_code == 422


def test_update_nonexistent_job(client):
    resp = client.put("/api/jobs/99999", json={"status": "applied"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete job
# ---------------------------------------------------------------------------

def test_delete_job(client):
    user = make_user(client)
    job = make_job(client, user["id"])
    resp = client.delete(f"/api/jobs/{job['id']}")
    assert resp.status_code == 204
    resp2 = client.get(f"/api/users/{user['id']}/jobs")
    assert resp2.json() == []


# ---------------------------------------------------------------------------
# Feed jobs (IngestJob)
# ---------------------------------------------------------------------------

def test_feed_jobs_empty(client):
    resp = client.get("/api/jobs")
    assert resp.status_code == 200
    assert resp.json() == []


def test_today_count_zero(client):
    resp = client.get("/api/jobs/today-count")
    assert resp.status_code == 200
    assert resp.json()["newToday"] == 0


# ---------------------------------------------------------------------------
# Match score
# ---------------------------------------------------------------------------

def test_match_score_with_matching_skills(client):
    user = make_user(client, skills=["Python", "FastAPI", "SQL"])
    job = make_job(
        client,
        user["id"],
        description="We need Python and FastAPI experience.",
    )
    resp = client.post(f"/api/jobs/{job['id']}/match")
    assert resp.status_code == 200
    data = resp.json()
    assert "match_score" in data
    assert data["match_score"] >= 0
    assert isinstance(data["matched_skills"], list)
    assert isinstance(data["missing_skills"], list)


def test_match_score_no_skills(client):
    """User with no skills should get a low/zero score."""
    user = make_user(client)
    job = make_job(client, user["id"], description="Requires Python and Go.")
    resp = client.post(f"/api/jobs/{job['id']}/match")
    assert resp.status_code == 200
    assert resp.json()["match_score"] == 0
