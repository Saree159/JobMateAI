"""
Simple smoke tests for the JobMate AI backend.
Run with: pytest test_api.py -v
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root endpoint returns API info."""
    response = client.get("/")
    assert response.status_code == 200
    assert "JobMate AI API" in response.json()["message"]


def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_user():
    """Test user creation."""
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


def test_create_duplicate_user():
    """Test that creating a duplicate user fails."""
    user_data = {
        "email": "duplicate@example.com",
        "password": "testpass123"
    }
    
    # First creation should succeed
    response1 = client.post("/api/users", json=user_data)
    assert response1.status_code == 201
    
    # Second creation should fail
    response2 = client.post("/api/users", json=user_data)
    assert response2.status_code == 400


def test_get_user():
    """Test fetching a user by ID."""
    # Create a user first
    user_data = {
        "email": "gettest@example.com",
        "password": "testpass123",
        "full_name": "Get Test User"
    }
    create_response = client.post("/api/users", json=user_data)
    user_id = create_response.json()["id"]
    
    # Fetch the user
    response = client.get(f"/api/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["email"] == user_data["email"]


def test_update_user():
    """Test updating a user profile."""
    # Create a user
    user_data = {
        "email": "updatetest@example.com",
        "password": "testpass123"
    }
    create_response = client.post("/api/users", json=user_data)
    user_id = create_response.json()["id"]
    
    # Update the user
    update_data = {
        "full_name": "Updated Name",
        "skills": ["JavaScript", "TypeScript"]
    }
    response = client.put(f"/api/users/{user_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == update_data["full_name"]
    assert data["skills"] == update_data["skills"]


def test_create_job():
    """Test creating a job for a user."""
    # Create a user first
    user_data = {
        "email": "jobtest@example.com",
        "password": "testpass123",
        "skills": ["Python", "Django"]
    }
    user_response = client.post("/api/users", json=user_data)
    user_id = user_response.json()["id"]
    
    # Create a job
    job_data = {
        "title": "Backend Developer",
        "company": "Tech Corp",
        "location": "Remote",
        "description": "Looking for a Python developer with Django experience.",
        "apply_url": "https://example.com/apply"
    }
    response = client.post(f"/api/users/{user_id}/jobs", json=job_data)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == job_data["title"]
    assert data["company"] == job_data["company"]
    assert data["user_id"] == user_id


def test_list_user_jobs():
    """Test listing jobs for a user."""
    # Create a user
    user_data = {
        "email": "listjobs@example.com",
        "password": "testpass123"
    }
    user_response = client.post("/api/users", json=user_data)
    user_id = user_response.json()["id"]
    
    # Create multiple jobs
    for i in range(3):
        job_data = {
            "title": f"Job {i}",
            "company": f"Company {i}",
            "description": f"Description {i}"
        }
        client.post(f"/api/users/{user_id}/jobs", json=job_data)
    
    # List jobs
    response = client.get(f"/api/users/{user_id}/jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) == 3


def test_update_job_status():
    """Test updating a job's status."""
    # Create user and job
    user_data = {
        "email": "jobstatus@example.com",
        "password": "testpass123"
    }
    user_response = client.post("/api/users", json=user_data)
    user_id = user_response.json()["id"]
    
    job_data = {
        "title": "Test Job",
        "company": "Test Company",
        "description": "Test description"
    }
    job_response = client.post(f"/api/users/{user_id}/jobs", json=job_data)
    job_id = job_response.json()["id"]
    
    # Update status
    update_data = {"status": "applied"}
    response = client.put(f"/api/jobs/{job_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["status"] == "applied"


def test_calculate_match_score():
    """Test match score calculation."""
    # Create user with skills
    user_data = {
        "email": "matchtest@example.com",
        "password": "testpass123",
        "skills": ["Python", "FastAPI", "SQL"],
        "target_role": "Backend Developer"
    }
    user_response = client.post("/api/users", json=user_data)
    user_id = user_response.json()["id"]
    
    # Create job with matching skills
    job_data = {
        "title": "Python Backend Developer",
        "company": "Tech Company",
        "description": "We need a Python developer with FastAPI and SQL experience."
    }
    job_response = client.post(f"/api/users/{user_id}/jobs", json=job_data)
    job_id = job_response.json()["id"]
    
    # Calculate match score
    response = client.post(f"/api/jobs/{job_id}/match")
    assert response.status_code == 200
    data = response.json()
    assert "match_score" in data
    assert data["match_score"] > 0
    assert "matched_skills" in data
    assert "missing_skills" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
