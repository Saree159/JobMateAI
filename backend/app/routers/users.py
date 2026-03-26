"""
User API router.
Handles user registration, profile management, and authentication.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
import bcrypt
from jose import JWTError, jwt

logger = logging.getLogger(__name__)
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, UserSession
from app.schemas import UserCreate, UserUpdate, UserResponse, Token, LoginRequest
from app.config import settings


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


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
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
    
    # Create new user
    db_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        target_role=user_data.target_role,
        skills=",".join(user_data.skills) if user_data.skills else None,
        location_preference=user_data.location_preference,
        work_mode_preference=user_data.work_mode_preference
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Convert skills back to list for response
    response = UserResponse.model_validate(db_user)
    response.skills = db_user.skills_list
    
    return response


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
    if any(f in update_data for f in PROFILE_CACHE_FIELDS):
        get_cache().delete(user_cache_key(user_id))
        logger.info(f"Invalidated top-matches cache for user {user_id}")

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

        user.linkedin_li_at = li_at
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
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
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
    
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})

    try:
        db.add(UserSession(user_id=user.id))
        db.commit()
    except Exception:
        db.rollback()

    return Token(access_token=access_token)
