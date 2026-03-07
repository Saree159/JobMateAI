"""
Job API router.
Handles job CRUD operations, match scoring, and cover letter generation.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import User, Job, JobStatus
from app.models import IngestJob
from app.schemas import JobCreate, JobUpdate, JobResponse, MatchScoreResponse, CoverLetterResponse
from app.schemas import FeedJobResponse, StatusUpdateRequest
from app.services.ai import calculate_match_score, generate_cover_letter

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["jobs"])


@router.get("/jobs", response_model=List[FeedJobResponse])
def list_feed_jobs(
    status: Optional[str] = None,
    q: Optional[str] = None,
    days: int = 0,
    sort: str = "recent",
    db: Session = Depends(get_db)
):
    """List ingested jobs for the UI feed."""
    query = db.query(IngestJob)

    if status:
        query = query.filter(IngestJob.status == status)

    if q:
        like_q = f"%{q}%"
        query = query.filter((IngestJob.title.ilike(like_q)) | (IngestJob.company.ilike(like_q)))

    from datetime import datetime, timedelta

    if days and days > 0:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.filter(IngestJob.first_seen_at >= cutoff)

    if sort == "recent":
        query = query.order_by(IngestJob.last_seen_at.desc())

    results = query.limit(100).all()
    return results


@router.patch("/jobs/{job_id}/status", response_model=FeedJobResponse)
def update_feed_job_status(job_id: int, body: StatusUpdateRequest, db: Session = Depends(get_db)):
    job = db.query(IngestJob).filter(IngestJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = body.status
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs/today-count")
def jobs_today_count(db: Session = Depends(get_db)):
    from datetime import datetime, time
    today_start = datetime.combine(datetime.utcnow().date(), time(0, 0))
    count = db.query(IngestJob).filter(IngestJob.first_seen_at >= today_start).filter(IngestJob.status == "new").count()
    return {"newToday": count}


@router.post("/users/{user_id}/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(user_id: int, job_data: JobCreate, db: Session = Depends(get_db)):
    """
    Create a new job posting for a user.
    
    - **user_id**: ID of the user creating the job
    - **title**: Job title
    - **company**: Company name
    - **location**: Job location (optional)
    - **description**: Job description
    - **apply_url**: Application URL (optional)
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    # Create job
    db_job = Job(
        user_id=user_id,
        title=job_data.title,
        company=job_data.company,
        location=job_data.location,
        description=job_data.description,
        apply_url=job_data.apply_url,
        status=JobStatus.SAVED
    )
    
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    return db_job


@router.get("/users/{user_id}/jobs", response_model=List[JobResponse])
def list_user_jobs(
    user_id: int,
    status_filter: Optional[JobStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    """
    List all jobs for a user.
    
    - **user_id**: ID of the user
    - **status**: Optional filter by job status (saved, applied, interview, offer, rejected)
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    # Build query
    query = db.query(Job).filter(Job.user_id == user_id)
    
    if status_filter:
        query = query.filter(Job.status == status_filter)
    
    jobs = query.order_by(Job.created_at.desc()).all()
    
    return jobs


@router.get("/jobs/top-matches")
async def get_top_matching_jobs(
    user_id: int = Query(..., description="User ID"),
    limit: int = Query(10, description="Number of top matches"),
    db: Session = Depends(get_db)
):
    """
    Fetch Israeli jobs from Drushim and rank them by skill match against the user's profile.
    Uses Redis caching (30 min TTL) for the scraped results.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_skills = user.skills_list
    target_role = (user.target_role or "").lower()

    ROLE_CATEGORY_MAP = [
        (["data scientist", "data science", "machine learning", "ml", "ai"], "75"),
        (["product manager", "product management"], "73"),
        (["qa", "quality", "testing"], "72"),
        (["security", "cybersecurity", "אבטחה"], "236"),
        (["frontend", "backend", "full stack", "fullstack", "software", "developer",
          "devops", "cloud", "engineer"], "71"),
    ]
    category = "71"
    for keywords, cat in ROLE_CATEGORY_MAP:
        if any(kw in target_role for kw in keywords):
            category = cat
            break

    drushim_url = f"https://www.drushim.co.il/jobs/subcat/{category}"

    try:
        from app.services.scrapers import DrushimScraper
        from app.services.cache import get_cache, make_jobs_cache_key

        cache_key = make_jobs_cache_key("drushim", category)
        cache = get_cache()

        jobs = cache.get(cache_key)
        if not jobs:
            logger.info(f"Cache MISS for top-matches category={category} — scraping...")
            scraper = DrushimScraper()
            jobs = await scraper.scrape_listing_async(drushim_url)
            if jobs:
                cache.set(cache_key, jobs, ttl=1800)

        if not jobs:
            return {"jobs": [], "user_skills": user_skills, "category": category, "total_scraped": 0}

        # ── Improved matching ──────────────────────────────────────────────────
        import re as _re

        # Patterns to extract tech skills from any text (title, description)
        _SKILL_PATTERNS = [
            r'\b(Python|JavaScript|TypeScript|Java|C\+\+|C#|Ruby|PHP|Swift|Kotlin|Go|Rust|Scala|R)\b',
            r'\b(React|Angular|Vue|Node\.?js|Django|Flask|Spring|\.NET|Laravel|Rails|Express|FastAPI|Next\.js)\b',
            r'\b(SQL|MySQL|PostgreSQL|MongoDB|Redis|Oracle|SQLite|Cassandra|Elasticsearch)\b',
            r'\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|Git|CI/CD|Terraform|Ansible|Linux)\b',
            r'\b(HTML|CSS|REST|GraphQL|Machine Learning|AI|DevOps|Agile|Scrum)\b',
        ]

        def _extract_tech(text: str) -> set:
            found = set()
            for pat in _SKILL_PATTERNS:
                for m in _re.findall(pat, text, _re.IGNORECASE):
                    found.add(m.lower())
            return found

        # Deduplicate user skills (case-insensitive) — preserves order
        seen = set()
        deduped_skills = []
        for s in user_skills:
            key = s.lower()
            if key not in seen:
                seen.add(key)
                deduped_skills.append(s)
        user_set = {s.lower() for s in deduped_skills}

        # Role keywords (words longer than 3 chars) for title bonus
        role_keywords = [w for w in target_role.split() if len(w) > 3]

        def score_job(job):
            if not user_set:
                return 0

            job_title = (job.get("title") or "").lower()
            job_desc  = (job.get("description") or "").lower()
            job_skills_listed = {s.lower() for s in (job.get("skills") or [])}

            # Re-extract tech skills from title + description to fill gaps
            job_tech = _extract_tech(f"{job_title} {job_desc}") | job_skills_listed

            # ── Three scoring signals ─────────────────────────────────────────
            # 1. Forward: fraction of YOUR skills that appear in job
            forward = len(user_set & job_tech) / len(user_set) if user_set else 0

            # 2. Backward: fraction of job's tech that you cover
            #    (rewards jobs where you cover most of the required stack)
            backward = len(user_set & job_tech) / len(job_tech) if job_tech else 0

            # 3. Role title bonus — job title contains your target-role keywords
            role_bonus = 0.12 if any(rk in job_title for rk in role_keywords) else 0

            # Weighted combination (forward=50%, backward=38%, role=12%)
            combined = (forward * 0.50) + (backward * 0.38) + role_bonus
            return round(min(combined * 100, 100))
        # ── End improved matching ──────────────────────────────────────────────

        scored = sorted(
            [{**job, "match_score": score_job(job)} for job in jobs],
            key=lambda x: x["match_score"],
            reverse=True
        )

        return {
            "jobs": scored[:limit],
            "user_skills": deduped_skills,
            "category": category,
            "total_scraped": len(jobs),
        }

    except Exception as e:
        logger.error(f"Error in top-matches: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching matches: {str(e)}")


@router.get("/jobs/description")
async def fetch_job_full_description(
    url: str = Query(..., description="URL of the individual Drushim job detail page"),
):
    """
    Fetch the full description from a Drushim.co.il individual job detail page.
    The listing-page scraper only captures a teaser snippet; this endpoint
    lazily retrieves the complete description for a specific job.
    """
    try:
        from crawl4ai import AsyncWebCrawler, CacheMode
        from bs4 import BeautifulSoup

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(
                url=url,
                cache_mode=CacheMode.BYPASS,
                screenshot=False,
                verbose=False,
            )

        if not result.success:
            raise HTTPException(status_code=502, detail="Failed to fetch job page")

        soup = BeautifulSoup(result.html, "html.parser")

        # Collect all text parts from Drushim's job details structure:
        # - div.job-details p  → role description
        # - div.job-requirements p  → requirements
        parts = []

        desc_block = soup.select_one("div.job-details")
        if desc_block:
            # Grab all <p> and <li> text under the description block
            texts = [t.get_text(separator=" ").strip() for t in desc_block.select("p, li") if t.get_text(strip=True)]
            if texts:
                parts.append("\n".join(texts))

        req_block = soup.select_one("div.job-requirements")
        if req_block:
            texts = [t.get_text(separator=" ").strip() for t in req_block.select("p, li") if t.get_text(strip=True)]
            if texts:
                parts.append("Requirements:\n" + "\n".join(texts))

        description = "\n\n".join(parts) if parts else None

        # Fallback: try the wider jobDes wrapper
        if not description:
            wrap = soup.select_one("div.jobDes, div.job-details-wrap")
            if wrap:
                description = wrap.get_text(separator="\n").strip()

        # Last-resort: largest text block on the page
        if not description:
            candidates = soup.find_all(["div", "section", "article"])
            best = max(candidates, key=lambda e: len(e.get_text()), default=None)
            if best:
                description = best.get_text(separator="\n").strip()

        if not description:
            raise HTTPException(status_code=404, detail="Could not extract description from page")

        return {"description": description}

    except ImportError:
        raise HTTPException(status_code=503, detail="Crawl4AI not available on this server")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job description from {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching description: {str(e)}")


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """
    Get a single job by ID.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found"
        )
    
    return job


@router.put("/jobs/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job_data: JobUpdate, db: Session = Depends(get_db)):
    """
    Update a job's details or status.
    
    Only provided fields will be updated.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found"
        )
    
    # Update fields
    update_data = job_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(job, field, value)
    
    db.commit()
    db.refresh(job)
    
    return job


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """
    Delete a job posting.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found"
        )
    
    db.delete(job)
    db.commit()
    
    return None


@router.post("/jobs/{job_id}/match", response_model=MatchScoreResponse)
def compute_match_score(job_id: int, db: Session = Depends(get_db)):
    """
    Calculate and store a match score for a job based on the user's profile.
    
    The score is based on:
    - Skills overlap between user and job description
    - Semantic similarity using TF-IDF
    
    Returns a score from 0-100 and lists of matched/missing skills.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found"
        )
    
    user = db.query(User).filter(User.id == job.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found"
        )
    
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
async def generate_job_cover_letter(job_id: int, db: Session = Depends(get_db)):
    """
    Generate an AI-powered cover letter for a job.
    
    Uses OpenAI GPT to create a tailored cover letter based on:
    - User's profile (name, skills, target role)
    - Job details (title, company, description)
    
    The cover letter is stored in the database and returned.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found"
        )
    
    user = db.query(User).filter(User.id == job.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found"
        )
    
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
async def generate_interview_questions(job_id: int, db: Session = Depends(get_db)):
    """
    Generate AI-powered interview preparation questions for a job.
    
    Returns behavioral, technical, and company-specific questions based on:
    - Job title and description
    - Required skills and experience
    - Company information
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found"
        )
    
    user = db.query(User).filter(User.id == job.user_id).first()
    
    # Generate questions using AI
    try:
        from app.services.ai import generate_interview_questions
        
        questions = await generate_interview_questions(
            job_title=job.title,
            company=job.company,
            job_description=job.description,
            user_skills=user.skills_list if user else []
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
async def estimate_job_salary(job_id: int, db: Session = Depends(get_db)):
    """
    Generate AI-powered salary estimation for a job.
    
    Returns salary range and insights based on:
    - Job title and location
    - Required experience and skills
    - Market conditions
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found"
        )
    
    user = db.query(User).filter(User.id == job.user_id).first()
    
    # Generate salary estimate using AI
    try:
        from app.services.ai import estimate_salary
        
        # Extract experience years from job description if available
        experience_years = None
        if user:
            # Could add experience_years field to User model
            experience_years = 5  # Default mid-level
        
        salary_data = await estimate_salary(
            job_title=job.title,
            location=job.location or "Remote",
            experience_years=experience_years,
            skills=user.skills_list if user else [],
            company_size="medium"
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
    db: Session = Depends(get_db)
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
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
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
def clear_cache():
    """Clear all cached jobs (admin endpoint)."""
    try:
        from app.services.cache import get_cache
        cache = get_cache()
        cache.clear()
        return {"success": True, "message": "Cache cleared"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing cache: {str(e)}"
        )
