"""
Background job scrape scheduler.

Runs at :00 and :30 of every hour. For each user with a target_role,
checks whether their per-user top-matches cache has expired; if so,
re-scrapes and refreshes it.

The per-user cache key is:  jobs:top_matches:u{user_id}
"""
import asyncio
import logging
import re as _re
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Fields whose change should invalidate the top-matches cache
PROFILE_CACHE_FIELDS = {"skills", "target_role", "location_preference", "work_mode_preference"}

ROLE_CATEGORY_MAP = [
    (["data scientist", "data science", "machine learning", "ml", "ai"], "75"),
    (["product manager", "product management"], "73"),
    (["qa", "quality", "testing"], "72"),
    (["security", "cybersecurity"], "236"),
    (["frontend", "backend", "full stack", "fullstack", "software", "developer",
      "devops", "cloud", "engineer"], "71"),
]

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


def user_cache_key(user_id: int) -> str:
    return f"jobs:top_matches:u{user_id}"


async def fetch_and_cache_top_matches(user_id: int) -> Optional[dict]:
    """
    Run the full scrape + score pipeline for a user and store the result
    in the per-user cache.  Returns the result dict or None on failure.
    """
    from app.database import SessionLocal
    from app.models import User
    from app.services.cache import get_cache, make_jobs_cache_key
    from app.services.scrapers import DrushimScraper, LinkedInJobSearchScraper

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.target_role:
            return None

        user_skills = user.skills_list
        target_role = (user.target_role or "").lower()

        # Determine Drushim category
        category = "71"
        for keywords, cat in ROLE_CATEGORY_MAP:
            if any(kw in target_role for kw in keywords):
                category = cat
                break

        location = user.location_preference or ""
        drushim_url = f"https://www.drushim.co.il/jobs/subcat/{category}"
        cache = get_cache()

        # ── Drushim ──────────────────────────────────────────────────────────
        drushim_role_key = _re.sub(r'\W+', '_', f"{user.target_role}_{category}").lower().strip('_')
        cache_key_drushim = make_jobs_cache_key("drushim", drushim_role_key)
        drushim_jobs = cache.get(cache_key_drushim)
        if not drushim_jobs:
            logger.info(f"[scheduler] drushim scrape for user {user_id} role={user.target_role} category={category}")
            try:
                scraper = DrushimScraper()
                drushim_jobs = await scraper.scrape_listing_async(drushim_url)
                if drushim_jobs:
                    cache.set(cache_key_drushim, drushim_jobs, ttl=1800)
            except Exception as e:
                logger.warning(f"[scheduler] drushim scrape failed for user {user_id}: {e}")
                drushim_jobs = []
        drushim_jobs = drushim_jobs or []
        for j in drushim_jobs:
            j.setdefault("source", "drushim")

        # ── LinkedIn ─────────────────────────────────────────────────────────
        linkedin_jobs = []
        if user.target_role:
            li_at = user.linkedin_li_at
            li_role_key = _re.sub(r'\W+', '_', f"{user.target_role}_{location}").lower().strip('_')
            cache_key_li = make_jobs_cache_key("linkedin", li_role_key)
            linkedin_jobs = cache.get(cache_key_li)
            if not linkedin_jobs:
                logger.info(f"[scheduler] linkedin scrape for user {user_id} role={user.target_role}")
                try:
                    li_scraper = LinkedInJobSearchScraper()
                    linkedin_jobs = await li_scraper.search_async(user.target_role, location, li_at=li_at)
                    if linkedin_jobs:
                        cache.set(cache_key_li, linkedin_jobs, ttl=1800)
                except Exception as e:
                    logger.warning(f"[scheduler] linkedin scrape failed for user {user_id}: {e}")
                    linkedin_jobs = []
        linkedin_jobs = linkedin_jobs or []
        for j in linkedin_jobs:
            j.setdefault("source", "linkedin")

        jobs = drushim_jobs + linkedin_jobs
        if not jobs:
            return None

        # ── Score ────────────────────────────────────────────────────────────
        seen: set = set()
        deduped_skills = []
        for s in user_skills:
            k = s.lower()
            if k not in seen:
                seen.add(k)
                deduped_skills.append(s)
        user_set = {s.lower() for s in deduped_skills}
        role_keywords = [w for w in target_role.split() if len(w) > 3]

        def score_job(job):
            if not user_set:
                return 0
            job_title = (job.get("title") or "").lower()
            job_desc  = (job.get("description") or "").lower()
            job_skills_listed = {s.lower() for s in (job.get("skills") or [])}
            job_tech = _extract_tech(f"{job_title} {job_desc}") | job_skills_listed
            forward  = len(user_set & job_tech) / len(user_set) if user_set else 0
            backward = len(user_set & job_tech) / len(job_tech) if job_tech else 0
            role_bonus = 0.12 if any(rk in job_title for rk in role_keywords) else 0
            return round(min((forward * 0.50 + backward * 0.38 + role_bonus) * 100, 100))

        scored = sorted(
            [{**j, "match_score": score_job(j)} for j in jobs],
            key=lambda x: x["match_score"],
            reverse=True,
        )

        result = {
            "jobs": scored,
            "user_skills": deduped_skills,
            "category": category,
            "total_scraped": len(jobs),
            "cached_at": datetime.utcnow().isoformat(),
        }

        cache.set(user_cache_key(user_id), result, ttl=1800)
        logger.info(f"[scheduler] cached {len(scored)} jobs for user {user_id}")
        return result

    except Exception as e:
        logger.error(f"[scheduler] fetch_and_cache_top_matches user={user_id}: {e}")
        return None
    finally:
        db.close()


async def run_scheduler():
    """
    Background loop: sleep until the next :00 or :30 wall-clock minute,
    then refresh the top-matches cache for every user whose cache has expired.
    """
    logger.info("[scheduler] started — will refresh at :00 and :30 each hour")
    while True:
        # Compute seconds until next :00 or :30
        now = datetime.utcnow()
        m, s = now.minute, now.second
        if m < 30:
            wait = (30 - m) * 60 - s
        else:
            wait = (60 - m) * 60 - s
        logger.info(f"[scheduler] sleeping {wait}s until next window")
        await asyncio.sleep(wait)

        # Collect all users with a target_role
        from app.database import SessionLocal
        from app.models import User
        from app.services.cache import get_cache

        db = SessionLocal()
        try:
            user_ids = [
                u.id for u in db.query(User.id).filter(User.target_role.isnot(None)).all()
            ]
        finally:
            db.close()

        cache = get_cache()
        stale = [uid for uid in user_ids if cache.get(user_cache_key(uid)) is None]
        logger.info(f"[scheduler] {len(stale)}/{len(user_ids)} users need refresh")

        for uid in stale:
            try:
                await fetch_and_cache_top_matches(uid)
            except Exception as e:
                logger.error(f"[scheduler] error refreshing user {uid}: {e}")
