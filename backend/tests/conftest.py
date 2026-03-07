"""
Shared test fixtures for the JobMate AI backend.
Uses an isolated in-memory SQLite database so tests never touch production data.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db
from app.models import Base

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def client():
    """
    Provide a TestClient backed by a fresh in-memory SQLite DB for every test.
    StaticPool ensures all sessions share the same connection so tables created
    at setup are visible to route handlers.
    """
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# ---------------------------------------------------------------------------
# Helpers shared across test modules
# ---------------------------------------------------------------------------

def make_user(client, email="user@test.com", password="pass1234", **kwargs):
    """Create a user and return the response JSON."""
    payload = {"email": email, "password": password, **kwargs}
    resp = client.post("/api/users", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def login(client, email="user@test.com", password="pass1234"):
    """Log in and return the JWT access token."""
    resp = client.post("/api/users/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(token):
    """Return Authorization headers dict for a token."""
    return {"Authorization": f"Bearer {token}"}
