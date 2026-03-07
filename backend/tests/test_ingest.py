"""
Tests for the /api/ingest/linkedin-email endpoint.
"""
import pytest
from tests.conftest import make_user

API_KEY = "changeme"
INGEST_HEADERS = {"X-API-KEY": API_KEY}


def _email_payload(email_id="email-001", jobs=None):
    # Use `is not None` so an explicitly passed [] stays empty ([] is falsy)
    job_list = jobs if jobs is not None else [
        {"title": "Backend Engineer", "company": "Tech Corp", "location": "Remote",
         "url": "https://linkedin.com/jobs/view/123"}
    ]
    return {
        "source": "linkedin",
        "runId": "run-001",
        "email": {
            "emailId": email_id,
            "receivedAt": "2024-01-15T10:00:00Z",
            "subject": "3 new jobs for Backend Engineer",
            "snippet": "Check out these jobs...",
        },
        "jobs": job_list,
    }


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def test_ingest_no_api_key_rejected(client):
    resp = client.post("/api/ingest/linkedin-email", json=_email_payload())
    assert resp.status_code == 401


def test_ingest_wrong_api_key_rejected(client):
    resp = client.post(
        "/api/ingest/linkedin-email",
        json=_email_payload(),
        headers={"X-API-KEY": "wrongkey"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

def test_ingest_creates_jobs(client):
    resp = client.post(
        "/api/ingest/linkedin-email",
        json=_email_payload(jobs=[
            {"title": "SWE", "company": "Acme", "url": "https://li.com/jobs/1"},
            {"title": "Backend Dev", "company": "Beta", "url": "https://li.com/jobs/2"},
        ]),
        headers=INGEST_HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["inserted"] == 2
    assert body["skipped"] == 0
    assert body["updated"] == 0


def test_ingest_deduplicates_same_email(client):
    payload = _email_payload()
    resp1 = client.post("/api/ingest/linkedin-email", json=payload, headers=INGEST_HEADERS)
    assert resp1.status_code == 200

    resp2 = client.post("/api/ingest/linkedin-email", json=payload, headers=INGEST_HEADERS)
    assert resp2.status_code == 200
    body = resp2.json()
    assert body["alreadyProcessed"] is True


def test_ingest_missing_email_id(client):
    payload = {
        "source": "linkedin",
        "email": {"receivedAt": "2024-01-15T10:00:00Z"},  # missing emailId
        "jobs": [],
    }
    resp = client.post("/api/ingest/linkedin-email", json=payload, headers=INGEST_HEADERS)
    assert resp.status_code == 400


def test_ingest_url_deduplication(client):
    """Two different emails with same job URL → second is skipped/updated."""
    payload1 = _email_payload(email_id="email-A", jobs=[
        {"title": "Dev", "company": "Co", "url": "https://linkedin.com/jobs/view/999"}
    ])
    payload2 = _email_payload(email_id="email-B", jobs=[
        {"title": "Dev", "company": "Co", "url": "https://linkedin.com/jobs/view/999"}
    ])
    resp1 = client.post("/api/ingest/linkedin-email", json=payload1, headers=INGEST_HEADERS)
    assert resp1.json()["inserted"] == 1

    resp2 = client.post("/api/ingest/linkedin-email", json=payload2, headers=INGEST_HEADERS)
    body2 = resp2.json()
    # The job already exists → should be updated or skipped, NOT inserted again
    assert body2["inserted"] == 0


def test_ingest_empty_jobs_list(client):
    resp = client.post(
        "/api/ingest/linkedin-email",
        json=_email_payload(jobs=[]),
        headers=INGEST_HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["inserted"] == 0


# ---------------------------------------------------------------------------
# Feed jobs after ingest
# ---------------------------------------------------------------------------

def test_feed_jobs_appear_after_ingest(client):
    payload = _email_payload(jobs=[
        {"title": "Full Stack Dev", "company": "Startup", "url": "https://linkedin.com/jobs/view/555"}
    ])
    client.post("/api/ingest/linkedin-email", json=payload, headers=INGEST_HEADERS)

    resp = client.get("/api/jobs")
    assert resp.status_code == 200
    jobs = resp.json()
    assert any(j["title"] == "Full Stack Dev" for j in jobs)


def test_feed_jobs_search_filter(client):
    payload = _email_payload(jobs=[
        {"title": "Python Developer", "company": "Alpha", "url": "https://li.com/jobs/11"},
        {"title": "Java Developer", "company": "Beta", "url": "https://li.com/jobs/22"},
    ])
    client.post("/api/ingest/linkedin-email", json=payload, headers=INGEST_HEADERS)

    resp = client.get("/api/jobs?q=Python")
    results = resp.json()
    assert all("python" in j["title"].lower() for j in results)


def test_feed_job_status_update(client):
    payload = _email_payload(jobs=[
        {"title": "QA Engineer", "company": "Corp", "url": "https://li.com/jobs/33"}
    ])
    client.post("/api/ingest/linkedin-email", json=payload, headers=INGEST_HEADERS)

    jobs = client.get("/api/jobs").json()
    job_id = jobs[0]["id"]

    resp = client.patch(f"/api/jobs/{job_id}/status", json={"status": "saved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "saved"


def test_feed_job_status_invalid(client):
    payload = _email_payload(jobs=[
        {"title": "PM", "company": "Co", "url": "https://li.com/jobs/44"}
    ])
    client.post("/api/ingest/linkedin-email", json=payload, headers=INGEST_HEADERS)
    jobs = client.get("/api/jobs").json()
    job_id = jobs[0]["id"]

    resp = client.patch(f"/api/jobs/{job_id}/status", json={"status": "flying"})
    assert resp.status_code == 422
