"""
Job API router.
Handles job CRUD operations, match scoring, and cover letter generation.
"""
import asyncio
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import User, Job, JobStatus
from app.models import IngestJob, UserJobFeedStatus
from app.schemas import JobCreate, JobUpdate, JobResponse, MatchScoreResponse, CoverLetterResponse
from app.schemas import FeedJobResponse, StatusUpdateRequest
from app.services.ai import calculate_match_score, generate_cover_letter, generate_opening_sentence
from app.routers.users import get_current_user, make_usage_gate

_gate_cover_letter       = make_usage_gate("cover_letter")
_gate_interview          = make_usage_gate("interview_questions")
_gate_salary             = make_usage_gate("salary_estimate")

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["jobs"])
_bearer = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return the authenticated user when a Bearer token is present; otherwise None."""
    if not credentials:
        return None
    from app.config import settings
    from jose import JWTError, jwt
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if not email:
            return None
        return db.query(User).filter(User.email == email).first()
    except JWTError:
        return None


def _require_job_ownership(job: Job, current_user: User) -> None:
    """Raise 403 if current_user does not own the job."""
    if job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this job",
        )


@router.get("/jobs", response_model=List[FeedJobResponse])
def list_feed_jobs(
    status: Optional[str] = None,
    q: Optional[str] = None,
    days: int = 0,
    sort: str = "recent",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    List ingested jobs for the UI feed.
    When authenticated, status reflects the calling user's personal status
    (new / saved / applied / ignored) rather than a global value.
    """
    from datetime import datetime, timedelta

    query = db.query(IngestJob)

    if q:
        like_q = f"%{q}%"
        query = query.filter((IngestJob.title.ilike(like_q)) | (IngestJob.company.ilike(like_q)))

    if days and days > 0:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.filter(IngestJob.first_seen_at >= cutoff)

    if sort == "recent":
        query = query.order_by(IngestJob.last_seen_at.desc())

    results = query.limit(100).all()

    if current_user:
        # Build a lookup of this user's personal statuses
        job_ids = [j.id for j in results]
        user_statuses = {
            row.ingest_job_id: row.status
            for row in db.query(UserJobFeedStatus).filter(
                UserJobFeedStatus.user_id == current_user.id,
                UserJobFeedStatus.ingest_job_id.in_(job_ids),
            ).all()
        }
        # Inject per-user status (transient override)
        for job in results:
            if job.id in user_statuses:
                job.status = user_statuses[job.id]
            else:
                job.status = "new"

        # If caller filtered by status, apply that filter post-hydration
        if status:
            results = [j for j in results if j.status == status]

    return results


@router.patch("/jobs/{job_id}/status", response_model=FeedJobResponse)
def update_feed_job_status(
    job_id: int,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the per-user status of a feed job (new → saved / applied / ignored).
    Each user has their own status for every feed job — changes do not affect other users.
    """
    job = db.query(IngestJob).filter(IngestJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Upsert per-user status
    user_status = (
        db.query(UserJobFeedStatus)
        .filter(
            UserJobFeedStatus.user_id == current_user.id,
            UserJobFeedStatus.ingest_job_id == job_id,
        )
        .first()
    )
    if user_status:
        user_status.status = body.status
    else:
        user_status = UserJobFeedStatus(
            user_id=current_user.id,
            ingest_job_id=job_id,
            status=body.status,
        )
        db.add(user_status)
    db.commit()

    # Return the job with the user's personal status injected
    job.status = body.status  # transient override for serialization
    return job


@router.get("/jobs/today-count")
def jobs_today_count(db: Session = Depends(get_db)):
    from datetime import datetime, time
    today_start = datetime.combine(datetime.utcnow().date(), time(0, 0))
    count = db.query(IngestJob).filter(IngestJob.first_seen_at >= today_start).filter(IngestJob.status == "new").count()
    return {"newToday": count}


async def _generate_opening_bg(job_id: int, user_name: str, user_skills: list, target_role: str, job_title: str, company: str):
    """Background task: generate bilingual opening sentence and save to job row."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        sentence = await generate_opening_sentence(user_name, user_skills, target_role, job_title, company)
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.opening_sentence = sentence
            db.commit()
            logger.info(f"Opening sentence generated for job {job_id}")
    except Exception as e:
        logger.error(f"Failed to generate opening sentence for job {job_id}: {e}")
    finally:
        db.close()


@router.post("/users/{user_id}/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    user_id: int,
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new job posting for a user.
    
    - **user_id**: ID of the user creating the job
    - **title**: Job title
    - **company**: Company name
    - **location**: Job location (optional)
    - **description**: Job description
    - **apply_url**: Application URL (optional)
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create jobs for this user",
        )

    # Create job — optionally linked back to its IngestJob source
    db_job = Job(
        user_id=user_id,
        ingest_job_id=job_data.ingest_job_id,  # may be None for manually-added jobs
        title=job_data.title,
        company=job_data.company,
        location=job_data.location,
        description=job_data.description,
        apply_url=job_data.apply_url,
        status=JobStatus.SAVED,
    )
    
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Generate bilingual opening sentence in the background
    background_tasks.add_task(
        _generate_opening_bg,
        db_job.id,
        current_user.full_name or "",
        current_user.skills_list,
        current_user.target_role or "",
        job_data.title,
        job_data.company,
    )

    return db_job


@router.get("/users/{user_id}/jobs", response_model=List[JobResponse])
def list_user_jobs(
    user_id: int,
    status_filter: Optional[JobStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all jobs for a user.

    - **user_id**: ID of the user
    - **status**: Optional filter by job status (saved, applied, interview, offer, rejected)
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to list jobs for this user",
        )

    # Build query — user is already verified via JWT
    query = db.query(Job).filter(Job.user_id == user_id)
    
    if status_filter:
        query = query.filter(Job.status == status_filter)
    
    jobs = query.order_by(Job.created_at.desc()).all()
    
    return jobs


@router.get("/jobs/top-matches")
async def get_top_matching_jobs(
    user_id: int = Query(..., description="User ID"),
    limit: int = Query(9999, description="Max results to return (default: all)"),
    force_refresh: bool = Query(False, description="Bypass cache and re-scrape"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return top job matches for a user based on their profile.

    Results are cached per-user (25 h TTL).  The cache is automatically
    invalidated when the user updates their profile (skills, role, location,
    work mode).  A profile hash validates the cached result on every request
    as a safety net.  A background scheduler also does a full refresh daily
    at 07:30 Israel time.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view top matches for this user",
        )

    from app.services.cache import get_cache
    from app.services.scrape_scheduler import fetch_and_cache_top_matches, user_cache_key

    user = current_user

    cache = get_cache()
    key = user_cache_key(user_id)

    if not force_refresh:
        cached = cache.get(key)
        if cached:
            from app.services.scrape_scheduler import profile_hash
            if cached.get("profile_hash") == profile_hash(user):
                logger.info(f"Cache HIT top-matches for user {user_id}")
                return {**cached, "jobs": cached["jobs"][:limit], "cached": True}
            logger.info(f"Profile changed for user {user_id} — invalidating cache")
            cache.delete(key)

    # ── Daily scrape rate limit for free users ────────────────────────────────
    FREE_DAILY_SCRAPE_LIMIT = 2
    if (user.subscription_tier or "free") == "free":
        from datetime import date
        scrape_count_key = f"scrape_count:u{user_id}:{date.today().isoformat()}"
        count = cache.get(scrape_count_key) or 0
        if count >= FREE_DAILY_SCRAPE_LIMIT:
            # Return cached result if available, else empty
            cached = cache.get(key)
            if cached:
                return {**cached, "jobs": cached["jobs"][:limit], "cached": True, "rate_limited": True}
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Free plan is limited to {FREE_DAILY_SCRAPE_LIMIT} job refreshes per day. Upgrade to Pro for unlimited refreshes.",
            )
        # Increment counter (TTL = 25 h to safely span midnight)
        cache.set(scrape_count_key, count + 1, ttl=25 * 3600)

    logger.info(f"Cache MISS top-matches for user {user_id} — scraping...")
    result = await fetch_and_cache_top_matches(user_id)

    if not result:
        return {
            "jobs": [],
            "user_skills": user.skills_list,
            "category": "71",
            "total_scraped": 0,
            "cached": False,
        }

    return {**result, "jobs": result["jobs"][:limit], "cached": False}


@router.get("/jobs/description")
async def fetch_job_full_description(
    url: str = Query(..., description="URL of the individual job detail page (Drushim or LinkedIn)"),
    user_id: Optional[int] = Query(None, description="User ID — used to load the user's li_at session cookie"),
    db: Session = Depends(get_db),
):
    """
    Fetch the full description from a Drushim or LinkedIn job detail page.
    LinkedIn + li_at: uses plain httpx (authenticated SSR pages, no Playwright needed).
    LinkedIn no token: uses Crawl4AI stealth mode (may hit login-wall).
    Drushim: always uses Crawl4AI.
    """
    from bs4 import BeautifulSoup
    import re as _re

    is_linkedin = "linkedin.com" in url

    _UA = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )

    try:
        # ── Fetch user's li_at ────────────────────────────────────────────────
        li_at = None
        if is_linkedin and user_id:
            user_obj = db.query(User).filter(User.id == user_id).first()
            if user_obj:
                from app.crypto import decrypt_field_safe
                li_at = decrypt_field_safe(user_obj.linkedin_li_at)

        logger.info(f"description fetch: linkedin={is_linkedin} auth={'yes' if li_at else 'no'} url={url[:80]}")

        # ── LinkedIn + li_at → Playwright with cookie (JS rendering required) ──
        if is_linkedin and li_at:
            from playwright.async_api import async_playwright

            body_text = None
            try:
                async with async_playwright() as pw:
                    browser = await pw.chromium.launch(headless=True)
                    ctx = await browser.new_context(
                        user_agent=_UA,
                        locale="en-US",
                        extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
                    )
                    await ctx.add_cookies([{
                        "name": "li_at",
                        "value": li_at,
                        "domain": ".linkedin.com",
                        "path": "/",
                        "secure": True,
                        "httpOnly": True,
                        "sameSite": "None",
                    }])
                    page = await ctx.new_page()
                    await page.goto(url, wait_until="domcontentloaded", timeout=25000)

                    # Check for login wall
                    page_url = page.url
                    if any(p in page_url for p in ["/login", "/authwall", "/checkpoint"]):
                        await browser.close()
                        raise HTTPException(
                            status_code=403,
                            detail="LinkedIn session expired — please reconnect LinkedIn in your Profile"
                        )

                    # Wait for content + click "show more" to expand truncated description
                    await asyncio.sleep(2)
                    for btn_sel in [
                        "button[aria-label*='more']",
                        "button.show-more-less-html__button",
                        "button[data-tracking-control-name*='description']",
                    ]:
                        try:
                            btn = await page.query_selector(btn_sel)
                            if btn:
                                await btn.click()
                                await asyncio.sleep(0.5)
                                break
                        except Exception:
                            pass

                    body_text = await page.inner_text("body")
                    await browser.close()
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Playwright LinkedIn error: {e}")
                raise HTTPException(status_code=503, detail=f"Failed to load LinkedIn page: {e}")

            # LinkedIn uses hashed CSS classes — extract via text markers instead
            # "אודות העבודה" = "About the job" in Hebrew (shown on il.linkedin.com)
            # English fallback: "About the job"
            _START_MARKERS = ["אודות העבודה", "About the job", "About this job"]
            _STOP_MARKERS = [
                "הגדרת התראה לעבודות דומות",
                "על אודות החברה",
                "חיפוש עבודה מהיר יותר",
                "Set alert for similar jobs",
                "About the company",
                "Get AI-powered advice",
                "Similar jobs",
                "How you match",
            ]

            text = None
            for marker in _START_MARKERS:
                idx = body_text.find(marker)
                if idx != -1:
                    text = body_text[idx + len(marker):].lstrip()
                    break

            if text:
                # Trim at first stop-marker
                for stop in _STOP_MARKERS:
                    stop_idx = text.find(stop)
                    if stop_idx != -1:
                        text = text[:stop_idx]
                        break

                # Remove trailing "... more" truncation artifacts
                text = _re.sub(r'\s*[…\.]{1,3}\s*עוד\s*$', '', text).strip()
                text = _re.sub(r'\n{3,}', '\n\n', text).strip()

                if len(text) >= 80:
                    return {"description": text}

            raise HTTPException(status_code=404, detail="Could not extract description from LinkedIn page")

        # ── LinkedIn without li_at → suggest connecting ───────────────────────
        if is_linkedin and not li_at:
            raise HTTPException(
                status_code=403,
                detail="Connect your LinkedIn account in Profile to view full job descriptions"
            )

        # ── Drushim / other → Crawl4AI ────────────────────────────────────────
        try:
            from crawl4ai import AsyncWebCrawler, CacheMode
        except ImportError:
            raise HTTPException(status_code=503, detail="Crawl4AI not available on this server")

        css_sel = "div.job-details, div.job-requirements, div.jobDes, div.job-details-wrap"

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(
                url=url,
                css_selector=css_sel,
                cache_mode=CacheMode.BYPASS,
                screenshot=False,
                verbose=False,
                magic=True,
                simulate_user=True,
                user_agent=_UA,
            )

        if not result.success:
            raise HTTPException(status_code=502, detail="Failed to fetch job page")

        soup = BeautifulSoup(result.html, "html.parser")
        for el in soup.select("button, svg, script, style, [aria-hidden='true']"):
            el.decompose()

        parts = []
        desc_block = soup.select_one("div.job-details")
        if desc_block:
            texts = [t.get_text(separator=" ").strip() for t in desc_block.select("p, li") if t.get_text(strip=True)]
            if texts:
                parts.append("\n".join(texts))
        req_block = soup.select_one("div.job-requirements")
        if req_block:
            texts = [t.get_text(separator=" ").strip() for t in req_block.select("p, li") if t.get_text(strip=True)]
            if texts:
                parts.append("Requirements:\n" + "\n".join(texts))
        if not parts:
            wrap = soup.select_one("div.jobDes, div.job-details-wrap")
            if wrap:
                parts.append(wrap.get_text(separator="\n").strip())

        description = "\n\n".join(parts) if parts else None
        if not description:
            raise HTTPException(status_code=404, detail="Could not extract description from page")

        return {"description": description}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job description from {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching description: {str(e)}")


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single tracked job by ID (owner only)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    _require_job_ownership(job, current_user)
    return job


@router.put("/jobs/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a job's details or status (owner only)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    _require_job_ownership(job, current_user)

    for field, value in job_data.model_dump(exclude_unset=True).items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a tracked job (owner only)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    _require_job_ownership(job, current_user)
    db.delete(job)
    db.commit()
    return None


@router.post("/jobs/{job_id}/match", response_model=MatchScoreResponse)
def compute_match_score(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate and store a match score for a job based on the user's profile.
    
    The score is based on:
    - Skills overlap between user and job description
    - Semantic similarity using TF-IDF

    Returns a score from 0-100 and lists of matched/missing skills.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    _require_job_ownership(job, current_user)
    user = current_user
    
    # Calculate match score
    score, matched_skills, missing_skills = calculate_match_score(
        user_skills=user.skills_list,
        target_role=user.target_role or "",
        job_title=job.title,
        job_description=job.description
    )
    
    # Update job with score
    job.match_score = score
    db.commit()
    db.refresh(job)
    
    return MatchScoreResponse(
        job_id=job.id,
        match_score=score,
        matched_skills=matched_skills,
        missing_skills=missing_skills
    )


@router.post("/jobs/{job_id}/cover-letter", response_model=CoverLetterResponse)
async def generate_job_cover_letter(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_gate_cover_letter),
):
    """
    Generate an AI-powered cover letter for a job.
    
    Uses OpenAI GPT to create a tailored cover letter based on:
    - User's profile (name, skills, target role)
    - Job details (title, company, description)
    
    The cover letter is stored in the database and returned.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    _require_job_ownership(job, current_user)
    user = current_user

    # Generate cover letter
    try:
        cover_letter = await generate_cover_letter(
            user_name=user.full_name or user.email.split('@')[0],
            user_skills=user.skills_list,
            target_role=user.target_role or "Professional",
            job_title=job.title,
            company=job.company,
            job_description=job.description
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cover letter: {str(e)}"
        )
    
    # Store cover letter
    job.cover_letter = cover_letter
    db.commit()
    db.refresh(job)
    
    return CoverLetterResponse(
        job_id=job.id,
        cover_letter=cover_letter
    )


@router.get("/jobs/{job_id}/interview-questions")
async def generate_interview_questions(
    job_id: int,
    lang: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(_gate_interview),
):
    """
    Generate AI-powered interview preparation questions for a job.
    
    Returns behavioral, technical, and company-specific questions based on:
    - Job title and description
    - Required skills and experience
    - Company information
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    _require_job_ownership(job, current_user)

    try:
        from app.services.ai import generate_interview_questions

        questions = await generate_interview_questions(
            job_title=job.title,
            company=job.company,
            job_description=job.description,
            user_skills=current_user.skills_list,
            language=lang,
        )
        
        return {
            "job_id": job.id,
            "job_title": job.title,
            "company": job.company,
            "questions": questions
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate interview questions: {str(e)}"
        )


@router.get("/jobs/{job_id}/salary-estimate")
async def estimate_job_salary(
    job_id: int,
    lang: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(_gate_salary),
):
    """
    Generate AI-powered salary estimation for a job.
    
    Returns salary range and insights based on:
    - Job title and location
    - Required experience and skills
    - Market conditions
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    _require_job_ownership(job, current_user)

    try:
        from app.services.ai import estimate_salary

        salary_data = await estimate_salary(
            job_title=job.title,
            location=job.location or "Remote",
            experience_years=current_user.years_of_experience or 5,
            skills=current_user.skills_list,
            company_size="medium",
            language=lang,
        )
        
        return {
            "job_id": job.id,
            "job_title": job.title,
            "company": job.company,
            "location": job.location,
            "salary_estimate": salary_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to estimate salary: {str(e)}"
        )


@router.post("/jobs/scrape-url")
async def scrape_job_from_url(
    url: str = Query(..., description="URL of the job posting to scrape"),
    user_id: int = Query(..., description="User ID to associate with the scraped job"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Scrape job details from a URL and optionally save it.
    
    Supports:
    - LinkedIn
    - Indeed
    - Glassdoor
    - Drushim.co.il
    - AllJobs.co.il
    
    Returns the extracted job data which can be reviewed before saving.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to scrape on behalf of this user",
        )
    
    try:
        from app.services.scrapers import ScraperFactory
        
        # Scrape the job data
        scraped_data = ScraperFactory.scrape_job(url)
        
        if not scraped_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to scrape job data from URL. The site may be blocking automated access or the URL format is not supported."
            )
        
        if not scraped_data.get('title'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract job title from URL. Please check the URL and try again."
            )
        
        # Return the scraped data for frontend to review
        return {
            "success": True,
            "url": url,
            "data": {
                "title": scraped_data.get('title'),
                "company": scraped_data.get('company'),
                "location": scraped_data.get('location'),
                "description": scraped_data.get('description'),
                "job_type": scraped_data.get('job_type', 'Full-time'),
                "work_mode": scraped_data.get('work_mode', 'Onsite'),
                "skills": ', '.join(scraped_data.get('skills', [])) if scraped_data.get('skills') else None,
                "salary_min": scraped_data.get('salary_min'),
                "salary_max": scraped_data.get('salary_max'),
                "apply_url": url
            },
            "message": "Job details extracted successfully. Review and save if correct."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scraping URL: {str(e)}"
        )


@router.get("/jobs/scrape/drushim")
async def scrape_drushim_jobs(
    url: str = Query(..., description="Drushim listing page URL"),
    user_id: Optional[int] = Query(None, description="User ID to calculate match scores"),
    force_refresh: bool = Query(False, description="Force refresh cache")
):
    """
    Scrape jobs from a Drushim.co.il listing page.
    Returns an array of job objects that can be displayed in the UI.
    Uses Redis caching (30 min TTL) for performance.
    """
    try:
        from app.services.scrapers import DrushimScraper
        from app.services.cache import get_cache, make_jobs_cache_key
        from urllib.parse import urlparse, parse_qs
        
        # Extract category from URL for cache key
        parsed_url = urlparse(url)
        path_parts = parsed_url.path.split('/')
        category = path_parts[-1] if path_parts else 'unknown'
        
        cache_key = make_jobs_cache_key('drushim', category)
        cache = get_cache()
        
        # Try to get from cache
        if not force_refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Cache HIT for {cache_key}")
                return {
                    "success": True,
                    "count": len(cached_data),
                    "jobs": cached_data,
                    "source": "drushim.co.il",
                    "cached": True
                }
        
        # Cache miss or force refresh - scrape
        logger.info(f"Cache MISS for {cache_key} - scraping...")
        scraper = DrushimScraper()
        jobs = await scraper.scrape_listing_async(url)
        
        if not jobs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No jobs found on this page"
            )
        
        # Store in cache (30 minutes TTL)
        cache.set(cache_key, jobs, ttl=1800)
        logger.info(f"Cached {len(jobs)} jobs for {cache_key}")
        
        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs,
            "source": "drushim.co.il",
            "cached": False
        }
        
    except Exception as e:
        logger.error(f"Error scraping Drushim: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scraping Drushim: {str(e)}"
        )


@router.get("/jobs/scrape/gotfriends")
async def scrape_gotfriends_jobs(
    url: str = Query(..., description="GotFriends.co.il job listing URL"),
    force_refresh: bool = Query(False, description="Force refresh cache")
):
    """
    Scrape jobs from GotFriends.co.il listing page.
    Results are cached for 30 minutes unless force_refresh=true.
    """
    try:
        from app.services.scrapers import GotFriendsScraper
        from app.services.cache import get_cache, make_jobs_cache_key
        
        # Generate cache key from URL
        cache_key = make_jobs_cache_key("gotfriends", url)
        cache = get_cache()
        
        # Check cache first
        if not force_refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Cache HIT for {cache_key}")
                return {
                    "success": True,
                    "count": len(cached_data),
                    "jobs": cached_data,
                    "source": "gotfriends.co.il",
                    "cached": True
                }
        
        # Cache miss or force refresh - scrape
        logger.info(f"Cache MISS for {cache_key} - scraping...")
        scraper = GotFriendsScraper()
        jobs = await scraper.scrape_listing_async(url)
        
        if not jobs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No jobs found on this page"
            )
        
        # Store in cache (30 minutes TTL)
        cache.set(cache_key, jobs, ttl=1800)
        logger.info(f"Cached {len(jobs)} jobs for {cache_key}")
        
        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs,
            "source": "gotfriends.co.il",
            "cached": False
        }
        
    except Exception as e:
        logger.error(f"Error scraping GotFriends: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scraping GotFriends: {str(e)}"
        )


@router.get("/jobs/scrape/linkedin")
async def scrape_linkedin_jobs(
    role: str = Query(..., description="Job title / keyword to search"),
    location: str = Query("", description="City, country, or 'Remote'"),
    user_id: Optional[int] = Query(None, description="User ID — used to load the user's li_at session cookie"),
    start: int = Query(0, description="Pagination offset (0, 25, 50, …)"),
    force_refresh: bool = Query(False, description="Force refresh cache"),
    db: Session = Depends(get_db),
):
    """
    Search LinkedIn public job listings by role and location.
    When user_id is provided and the user has a stored li_at token, the search
    runs as an authenticated LinkedIn session (no login-wall, full descriptions).
    Results are cached for 30 minutes unless force_refresh=true.
    Each page returns up to 25 jobs; use start=0, 25, 50, … for pagination.
    """
    try:
        import re
        from app.services.scrapers import LinkedInJobSearchScraper
        from app.services.cache import get_cache, make_jobs_cache_key

        # Fetch user's li_at token and tier if available
        li_at = None
        job_limit = LinkedInJobSearchScraper.FREE_LIMIT  # default: free tier
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                from app.crypto import decrypt_field_safe
                li_at = decrypt_field_safe(user.linkedin_li_at)
                if getattr(user, "subscription_tier", "free") == "pro":
                    job_limit = LinkedInJobSearchScraper.PRO_LIMIT

        slug = re.sub(r'\W+', '_', f"{role}_{location}").lower().strip('_')
        cache_key = make_jobs_cache_key("linkedin", f"{slug}_s{start}_l{job_limit}")
        cache = get_cache()

        if not force_refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Cache HIT for {cache_key}")
                return {
                    "success": True,
                    "count": len(cached_data),
                    "jobs": cached_data,
                    "source": "linkedin.com",
                    "cached": True,
                    "start": start,
                    "has_more": len(cached_data) >= job_limit,
                }

        logger.info(f"Cache MISS for {cache_key} - scraping LinkedIn start={start} limit={job_limit} (auth={'yes' if li_at else 'no'})...")
        scraper = LinkedInJobSearchScraper()
        jobs = await scraper.search_async(role, location, li_at=li_at, start=start, limit=job_limit)

        if not jobs and start == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No jobs found — LinkedIn may be blocking the request or no results exist for this search",
            )

        cache.set(cache_key, jobs, ttl=1800)
        logger.info(f"Cached {len(jobs)} LinkedIn jobs for {cache_key}")

        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs,
            "source": "linkedin.com",
            "cached": False,
            "start": start,
            "has_more": len(jobs) >= job_limit,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scraping LinkedIn: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scraping LinkedIn: {str(e)}",
        )


@router.get("/jobs/cache/stats")
def get_cache_stats():
    """Get cache statistics for monitoring."""
    try:
        from app.services.cache import get_cache
        cache = get_cache()
        return cache.get_stats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting cache stats: {str(e)}"
        )


@router.delete("/jobs/cache/clear")
def clear_cache(current_user: User = Depends(get_current_user)):
    """Clear the calling user's cached job matches (authenticated users only)."""
    try:
        from app.services.cache import get_cache
        from app.services.scrape_scheduler import user_cache_key
        cache = get_cache()
        cache.delete(user_cache_key(current_user.id))
        return {"success": True, "message": "Your job match cache has been cleared"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing cache: {str(e)}",
        )
