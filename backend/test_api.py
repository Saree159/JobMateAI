"""
Simple smoke tests for the JobMate AI backend.
Run with: pytest test_api.py -v
"""
"""
Smoke tests for the JobMate AI backend.
Run with: pytest test_api.py -v
Uses the isolated in-memory DB fixture from conftest.py.
"""
import pytest


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "JobMate AI API" in response.json()["message"]


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_user(client):
    user_data = {
        "email": "test@example.com",
        "password": "testpass123",
        "full_name": "Test User",
        "target_role": "Software Engineer",
        "skills": ["Python", "React", "SQL"],
        "location_preference": "San Francisco",
        "work_mode_preference": "remote"
    }
    response = client.post("/api/users", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert "id" in data


def test_create_duplicate_user(client):
    user_data = {"email": "duplicate@example.com", "password": "testpass123"}
    assert client.post("/api/users", json=user_data).status_code == 201
    assert client.post("/api/users", json=user_data).status_code == 400


def test_get_user(client):
    user_data = {"email": "gettest@example.com", "password": "testpass123", "full_name": "Get Test User"}
    user_id = client.post("/api/users", json=user_data).json()["id"]
    response = client.get(f"/api/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["email"] == user_data["email"]


def test_update_user(client):
    user_id = client.post("/api/users", json={"email": "upd@example.com", "password": "testpass123"}).json()["id"]
    response = client.put(f"/api/users/{user_id}", json={"full_name": "Updated Name", "skills": ["JavaScript", "TypeScript"]})
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Name"
    assert response.json()["skills"] == ["JavaScript", "TypeScript"]


def test_create_job(client):
    user_id = client.post("/api/users", json={"email": "jobtest@example.com", "password": "testpass123", "skills": ["Python", "Django"]}).json()["id"]
    job_data = {"title": "Backend Developer", "company": "Tech Corp", "location": "Remote", "description": "Looking for a Python developer with Django experience.", "apply_url": "https://example.com/apply"}
    response = client.post(f"/api/users/{user_id}/jobs", json=job_data)
    assert response.status_code == 201
    assert response.json()["title"] == job_data["title"]
    assert response.json()["user_id"] == user_id


def test_list_user_jobs(client):
    user_id = client.post("/api/users", json={"email": "listjobs@example.com", "password": "testpass123"}).json()["id"]
    for i in range(3):
        client.post(f"/api/users/{user_id}/jobs", json={"title": f"Job {i}", "company": f"Co {i}", "description": f"Desc {i}"})
    response = client.get(f"/api/users/{user_id}/jobs")
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_update_job_status(client):
    user_id = client.post("/api/users", json={"email": "jobstatus@example.com", "password": "testpass123"}).json()["id"]
    job_id = client.post(f"/api/users/{user_id}/jobs", json={"title": "Test Job", "company": "Test Co", "description": "Desc"}).json()["id"]
    response = client.put(f"/api/jobs/{job_id}", json={"status": "applied"})
    assert response.status_code == 200
    assert response.json()["status"] == "applied"


def test_calculate_match_score(client):
    user_id = client.post("/api/users", json={"email": "match@example.com", "password": "testpass123", "skills": ["Python", "FastAPI", "SQL"], "target_role": "Backend Developer"}).json()["id"]
    job_id = client.post(f"/api/users/{user_id}/jobs", json={"title": "Python Backend Developer", "company": "Tech Co", "description": "We need a Python developer with FastAPI and SQL experience."}).json()["id"]
    response = client.post(f"/api/jobs/{job_id}/match")
    assert response.status_code == 200
    data = response.json()
    assert "match_score" in data
    assert data["match_score"] > 0
    assert "matched_skills" in data
    assert "missing_skills" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
