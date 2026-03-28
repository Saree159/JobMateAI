"""
LinkedIn OAuth 2.0 (OpenID Connect) integration.

Flow:
  1. GET /api/auth/linkedin?user_id=X  →  redirect to LinkedIn consent page
  2. LinkedIn redirects to GET /api/auth/linkedin/callback?code=...&state=...
  3. Backend exchanges code for access token, fetches profile, updates user
  4. Redirect back to frontend /profile?linkedin_connected=true

Scopes used: openid profile email
What we get: name, email, profile picture, LinkedIn sub (ID)
"""
import secrets
import time
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["linkedin-oauth"])

LINKEDIN_AUTH_URL  = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO  = "https://api.linkedin.com/v2/userinfo"

# Simple in-memory state store: {state: (user_id, expires_at)}
# Good enough for single-instance deployments; use Redis for multi-instance.
_state_store: dict[str, tuple[int, float]] = {}
_STATE_TTL = 600  # 10 minutes


def _store_state(user_id: int) -> str:
    # Purge expired states
    now = time.time()
    expired = [k for k, (_, exp) in _state_store.items() if exp < now]
    for k in expired:
        del _state_store[k]

    state = secrets.token_urlsafe(24)
    _state_store[state] = (user_id, now + _STATE_TTL)
    return state


def _consume_state(state: str) -> "Optional[int]":
    entry = _state_store.pop(state, None)
    if entry is None:
        return None
    user_id, expires_at = entry
    if time.time() > expires_at:
        return None
    return user_id


# ---------------------------------------------------------------------------
# Step 1 — initiate OAuth
# ---------------------------------------------------------------------------

@router.get("/linkedin")
def linkedin_authorize(user_id: int = Query(...)):
    """Redirect the user to LinkedIn's OAuth consent page."""
    if not settings.linkedin_client_id:
        # Not configured — redirect back with error
        return RedirectResponse(f"{settings.frontend_url}/profile?linkedin_error=not_configured")

    state = _store_state(user_id)
    params = "&".join([
        "response_type=code",
        f"client_id={settings.linkedin_client_id}",
        f"redirect_uri={settings.linkedin_redirect_uri}",
        f"state={state}",
        "scope=openid%20profile%20email",
    ])
    return RedirectResponse(f"{LINKEDIN_AUTH_URL}?{params}")


# ---------------------------------------------------------------------------
# Step 2 — OAuth callback
# ---------------------------------------------------------------------------

@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db),
):
    """Handle the LinkedIn OAuth callback, exchange code, update user."""
    frontend_profile = f"{settings.frontend_url}/profile"

    if error:
        return RedirectResponse(f"{frontend_profile}?linkedin_error={error}")

    if not code or not state:
        return RedirectResponse(f"{frontend_profile}?linkedin_error=missing_params")

    user_id = _consume_state(state)
    if user_id is None:
        return RedirectResponse(f"{frontend_profile}?linkedin_error=invalid_state")

    # Exchange authorization code for access token
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token_resp = await client.post(
                LINKEDIN_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.linkedin_redirect_uri,
                    "client_id": settings.linkedin_client_id,
                    "client_secret": settings.linkedin_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if token_resp.status_code != 200:
                return RedirectResponse(f"{frontend_profile}?linkedin_error=token_exchange")

            access_token = token_resp.json().get("access_token")
            if not access_token:
                return RedirectResponse(f"{frontend_profile}?linkedin_error=no_token")

            # Fetch profile via OpenID Connect userinfo endpoint
            profile_resp = await client.get(
                LINKEDIN_USERINFO,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile = profile_resp.json() if profile_resp.status_code == 200 else {}

    except Exception:
        return RedirectResponse(f"{frontend_profile}?linkedin_error=network_error")

    # Update user record
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(f"{frontend_profile}?linkedin_error=user_not_found")

    user.linkedin_oauth_token = access_token

    # Auto-fill profile fields only if they are currently empty
    if not user.full_name and profile.get("name"):
        user.full_name = profile["name"]

    db.commit()

    return RedirectResponse(f"{frontend_profile}?linkedin_connected=true")


# ---------------------------------------------------------------------------
# Disconnect (clear OAuth token only — li_at is managed separately)
# ---------------------------------------------------------------------------

@router.delete("/linkedin/{user_id}")
def linkedin_disconnect(user_id: int, db: Session = Depends(get_db)):
    """Remove the stored OAuth token for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.linkedin_oauth_token = None
        db.commit()
    return {"success": True}
