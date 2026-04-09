"""
User API router.
Handles user registration, profile management, and authentication.
"""
import logging
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
import bcrypt
from jose import JWTError, jwt
from app.limiter import limiter

logger = logging.getLogger(__name__)
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, UserSession
from app.schemas import UserCreate, UserUpdate, UserResponse, Token, LoginRequest
from app.config import settings
from app.services.email import send_verification_email


router = APIRouter(prefix="/api/users", tags=["users"])
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    # Bcrypt has a 72-byte password limit
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.
    Used as a dependency in protected routes.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user


FREE_DAILY_LIMIT = 5


def _quota_increment(db: Session, user_id: int, feature: str) -> int:
    """
    Atomically increment today's usage count for (user_id, feature).
    Returns the NEW count after incrementing.
    Uses an upsert pattern that works on both SQLite and PostgreSQL.
    """
    from datetime import date as _date
    from app.models import UsageQuota
    today = _date.today().isoformat()
    row = (
        db.query(UsageQuota)
        .filter(
            UsageQuota.user_id == user_id,
            UsageQuota.feature == feature,
            UsageQuota.date == today,
        )
        .with_for_update()
        .first()
    )
    if row:
        row.count += 1
    else:
        row = UsageQuota(user_id=user_id, feature=feature, date=today, count=1)
        db.add(row)
    db.commit()
    return row.count


def make_usage_gate(feature: str):
    """
    FastAPI dependency factory.
    Free users: enforces FREE_DAILY_LIMIT uses/day tracked in the DB.
    Pro users: unlimited.
    Increments the counter BEFORE calling the AI endpoint so partial failures
    still count (prevents abuse via repeated retries).
    """
    async def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if getattr(current_user, "subscription_tier", "free") == "pro":
            return current_user
        new_count = _quota_increment(db, current_user.id, feature)
        if new_count > FREE_DAILY_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"daily_limit_reached:{feature}",
            )
        return current_user
    return _check


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def create_user(request: Request, user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Create a new user account.
    
    - **email**: User's email address (must be unique)
    - **password**: Password (min 6 characters)
    - **full_name**: Optional full name
    - **target_role**: Optional target job role
    - **skills**: List of skills
    - **location_preference**: Preferred work location
    - **work_mode_preference**: remote/hybrid/onsite
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate verification token
    verification_token = secrets.token_urlsafe(32)

    # Create new user (unverified)
    db_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        target_role=user_data.target_role,
        skills=",".join(user_data.skills) if user_data.skills else None,
        location_preference=user_data.location_preference,
        work_mode_preference=user_data.work_mode_preference,
        is_verified=False,
        verification_token=verification_token,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Send verification email in the background so registration returns immediately
    background_tasks.add_task(
        send_verification_email,
        db_user.email,
        db_user.full_name or "",
        verification_token,
    )

    response = UserResponse.model_validate(db_user)
    response.skills = db_user.skills_list
    return response


class ResendVerificationRequest(BaseModel):
    email: str


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Verify user email using the token from the verification link.
    Marks the user as verified and clears the token.
    """
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    user.is_verified = True
    user.verification_token = None
    user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(
    body: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Resend the verification email.
    Always returns 200 to avoid leaking whether the email is registered.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if user and not user.is_verified:
        token = secrets.token_urlsafe(32)
        user.verification_token = token
        user.updated_at = datetime.utcnow()
        db.commit()
        background_tasks.add_task(
            send_verification_email,
            user.email,
            user.full_name or "",
            token,
        )
    return {"message": "If the email exists, a verification link was sent"}


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a user's profile by ID.  Callers may only fetch their own profile.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this profile",
        )

    response = UserResponse.model_validate(current_user)
    response.skills = current_user.skills_list
    return response


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a user's profile.  Callers may only update their own profile.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this profile",
        )
    user = current_user
    
    # Update fields if provided
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Handle skills specially (convert list to comma-separated string)
    if "skills" in update_data and update_data["skills"] is not None:
        update_data["skills"] = ",".join(update_data["skills"])
    
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    # Invalidate the per-user top-matches cache whenever a profile field that
    # affects job matching has changed.
    from app.services.scrape_scheduler import PROFILE_CACHE_FIELDS, user_cache_key
    from app.services.cache import get_cache
    cache_fields_changed = [f for f in PROFILE_CACHE_FIELDS if f in update_data]
    if cache_fields_changed:
        cache = get_cache()
        cache.delete(user_cache_key(user_id))
        logger.info(f"Invalidated top-matches cache for user {user_id} (changed: {cache_fields_changed})")
        # When the fields that determine the LinkedIn/Drushim search query change,
        # also wipe the shared role-level caches so the next scrape uses the new role/location.
        if "target_role" in cache_fields_changed or "location_preference" in cache_fields_changed:
            for source in ("linkedin", "drushim", "techmap"):
                cleared = cache.delete_pattern(f"jobs:{source}:")
                if cleared:
                    logger.info(f"Cleared {cleared} role-level cache entries for source '{source}' due to profile change by user {user_id}")

    response = UserResponse.model_validate(user)
    response.skills = user.skills_list

    return response


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a user account.  Callers may only delete their own account.
    This will also delete all associated jobs (cascade delete).
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this account",
        )

    db.delete(current_user)
    db.commit()
    return None


class LinkedInLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/{user_id}/linkedin/connect")
async def linkedin_connect_headless(
    user_id: int,
    creds: LinkedInLoginRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Headless Playwright login: fills LinkedIn email/password, waits for li_at cookie,
    saves it to the user profile. Credentials are never stored.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to connect LinkedIn for this user",
        )
    user = current_user

    try:
        from playwright.async_api import async_playwright, TimeoutError as PWTimeout

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
            )
            page = await context.new_page()

            try:
                await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=30000)

                await page.fill("#username", creds.email)
                await page.fill("#password", creds.password)
                await page.click('[type="submit"]')

                # Wait for redirect away from /login — means login succeeded or 2FA
                await page.wait_for_url(lambda url: "/login" not in url and "/checkpoint" not in url, timeout=20000)

            except PWTimeout:
                await browser.close()
                # Check if we're stuck on checkpoint (2FA / security verification)
                if "/checkpoint" in page.url or "/challenge" in page.url:
                    raise HTTPException(
                        status_code=400,
                        detail="LinkedIn requires additional verification (2FA or CAPTCHA). Please disable 2FA temporarily or use the manual cookie method."
                    )
                raise HTTPException(status_code=408, detail="Login timed out — check your credentials and try again")

            # Extract li_at cookie
            cookies = await context.cookies("https://www.linkedin.com")
            await browser.close()

        li_at = next((c["value"] for c in cookies if c["name"] == "li_at"), None)
        if not li_at:
            raise HTTPException(status_code=401, detail="Login failed — wrong email or password")

        from app.crypto import encrypt_field
        user.linkedin_li_at = encrypt_field(li_at)
        user.updated_at = datetime.utcnow()
        db.commit()

        return {"success": True, "message": "LinkedIn connected successfully"}

    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(status_code=503, detail="Playwright not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LinkedIn login error: {str(e)}")


@router.post("/login", response_model=Token)
@limiter.limit("20/hour")
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Simple login endpoint (for testing).
    
    In production, use a more secure authentication flow.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if getattr(user, "is_blocked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_BLOCKED",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )
    
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})

    try:
        db.add(UserSession(user_id=user.id))
        db.commit()
    except Exception:
        db.rollback()

    return Token(access_token=access_token)


# ---------------------------------------------------------------------------
# Usage today
# ---------------------------------------------------------------------------

@router.get("/me/usage-today")
async def get_usage_today(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return today's AI feature usage counts for the calling user (DB-backed)."""
    from datetime import date
    from app.models import UsageQuota
    today = date.today().isoformat()
    features = ["cover_letter", "interview_questions", "salary_estimate", "resume_gaps", "resume_rewrite"]
    rows = (
        db.query(UsageQuota)
        .filter(
            UsageQuota.user_id == current_user.id,
            UsageQuota.date == today,
            UsageQuota.feature.in_(features),
        )
        .all()
    )
    usage = {f: 0 for f in features}
    for row in rows:
        usage[row.feature] = row.count
    return {
        "tier": current_user.subscription_tier,
        "limit": None if current_user.subscription_tier == "pro" else FREE_DAILY_LIMIT,
        "usage": usage,
    }


# ---------------------------------------------------------------------------
# Waitlist
# ---------------------------------------------------------------------------

@router.post("/waitlist", status_code=201)
def join_waitlist(
    body: dict,
    db: Session = Depends(get_db),
):
    """Add an email to the Pro waitlist. Idempotent — duplicate emails are ignored."""
    from app.models import WaitlistEntry
    email = (body.get("email") or "").strip().lower()
    name  = (body.get("full_name") or "").strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    existing = db.query(WaitlistEntry).filter(WaitlistEntry.email == email).first()
    if existing:
        return {"message": "Already on the waitlist", "already_exists": True}
    db.add(WaitlistEntry(email=email, full_name=name or None))
    db.commit()
    return {"message": "You're on the waitlist!", "already_exists": False}


# ---------------------------------------------------------------------------
# Forgot / Reset Password
# ---------------------------------------------------------------------------

@router.post("/forgot-password")
def forgot_password(
    body: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Send a password-reset email. Always returns 200 to avoid email enumeration.
    """
    from app.services.email import send_password_reset_email
    email = (body.get("email") or "").strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        background_tasks.add_task(send_password_reset_email, user.email, user.full_name or "", token)
    return {"message": "If that email is registered you'll receive a reset link shortly."}


@router.post("/reset-password")
def reset_password(
    body: dict,
    db: Session = Depends(get_db),
):
    """Consume a reset token and update the password."""
    token = (body.get("token") or "").strip()
    new_password = body.get("new_password") or ""
    if not token or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Invalid request.")
    user = db.query(User).filter(User.reset_token == token).first()
    if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired.")
    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    return {"message": "Password updated successfully."}
