"""
Background job scrape scheduler.

Runs ONCE DAILY at 07:30 Israel time.  Clears all role-level and per-user
caches, then re-scrapes for every active user.  Shared role-level caches
(drushim / linkedin / techmap) mean each unique role is scraped only once
per day regardless of how many users share that role — keeping ScraperAPI
usage minimal.

Profile-change invalidation
---------------------------
When a user updates skills / target_role / location / work_mode, the
users router immediately deletes their per-user cache key.  A profile_hash
is also stored with the cached result so the top-matches endpoint can
detect changes that slip through (e.g. a failed cache delete) and
re-scrape on the next request rather than serving stale data.

Cache TTLs
----------
* Per-user top-matches cache : 25 h  (CACHE_TTL_USER)
* Shared role-level caches   : 25 h  (CACHE_TTL_ROLE)
  25 h gives a 1-hour buffer past the 24-h daily cycle so a slightly late
  scheduler run never leaves users with an empty cache.

Concurrency
-----------
A semaphore (MAX_CONCURRENT_SCRAPES) prevents thundering-herd scraping.
Random jitter between users spreads the load across the refresh window.
"""
import asyncio
import hashlib
import json
import logging
import random
import re as _re
from datetime import datetime, timedelta
from typing import Optional

import pytz

IL_TZ = pytz.timezone("Asia/Jerusalem")

# Cache TTLs (seconds)
CACHE_TTL_USER = 25 * 3600   # 25 hours — per-user top-matches result
CACHE_TTL_ROLE = 25 * 3600   # 25 hours — shared role-level scrape results

# Maximum number of users whose scrapes can run concurrently
MAX_CONCURRENT_SCRAPES = 3
_scrape_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SCRAPES)

logger = logging.getLogger(__name__)

# Fields whose change should invalidate the top-matches cache (used by users router)
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


def profile_hash(user) -> str:
    """MD5 of the profile fields that influence job matching.

    Stored alongside each cached result.  If the hash changes between
    requests the endpoint treats the cache as stale and re-scrapes.
    """
    data = {
        "role":     (user.target_role or "").lower().strip(),
        "skills":   sorted(s.lower() for s in (user.skills_list or [])),
        "location": (user.location_preference or "").lower().strip(),
        "work_mode": (user.work_mode_preference or "").lower().strip(),
    }
    return hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()


def seconds_until_next_run(hour: int = 7, minute: int = 30) -> float:
    """Seconds until the next HH:MM Israel time."""
    now_il = datetime.now(IL_TZ)
    target = now_il.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if now_il >= target:
        target += timedelta(days=1)
    return (target - now_il).total_seconds()


# Keep old name for backward compat (used nowhere externally but just in case)
def seconds_until_daily_refresh() -> float:
    return seconds_until_next_run(7, 30)


def _load_source_configs() -> dict:
    """Read source on/off flags and schedule from DB. Returns dict keyed by source name."""
    from app.database import SessionLocal
    from app.models import SourceConfig
    db = SessionLocal()
    try:
        rows = db.query(SourceConfig).all()
        return {r.source: r for r in rows}
    except Exception as e:
        logger.warning(f"[scheduler] could not load source_configs: {e}")
        return {}
    finally:
        db.close()


def _log_fetch_start(source: str, trigger: str = "scheduler") -> int:
    """Insert a fetch_logs row with status=running. Returns the new row id."""
    from app.database import SessionLocal
    from app.models import FetchLog
    db = SessionLocal()
    try:
        row = FetchLog(source=source, started_at=datetime.utcnow(), status="running", trigger=trigger)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.id
    except Exception as e:
        logger.warning(f"[scheduler] _log_fetch_start {source}: {e}")
        db.rollback()
        return 0
    finally:
        db.close()


def _log_fetch_end(log_id: int, status: str, job_count: int = 0, error_msg: str = None):
    """Update a fetch_logs row with the final status."""
    if not log_id:
        return
    from app.database import SessionLocal
    from app.models import FetchLog
    db = SessionLocal()
    try:
        row = db.query(FetchLog).filter(FetchLog.id == log_id).first()
        if row:
            row.finished_at = datetime.utcnow()
            row.status = status
            row.job_count = job_count
            row.error_msg = error_msg
            db.commit()
    except Exception as e:
        logger.warning(f"[scheduler] _log_fetch_end {log_id}: {e}")
        db.rollback()
    finally:
        db.close()


def _update_source_run(source: str, job_count: int):
    """Persist last_run_at and last_job_count for a source after a successful fetch."""
    from app.database import SessionLocal
    from app.models import SourceConfig
    db = SessionLocal()
    try:
        row = db.query(SourceConfig).filter(SourceConfig.source == source).first()
        if row:
            row.last_run_at = datetime.utcnow()
            row.last_job_count = job_count
            db.commit()
    except Exception as e:
        logger.warning(f"[scheduler] _update_source_run {source}: {e}")
        db.rollback()
    finally:
        db.close()


async def _persist_scraped_jobs(jobs: list, source: str) -> int:
    """
    Upsert a batch of scraped job dicts into the ingest_jobs table.
    Returns the number of newly inserted rows.
    """
    from app.database import SessionLocal
    from app.models import IngestJob
    from app.routers.ingest import normalize_url

    if not jobs:
        return 0

    db = SessionLocal()
    inserted = 0
    now = datetime.utcnow()
    try:
        for item in jobs:
            url = item.get("url") or item.get("apply_url") or ""
            canonical = normalize_url(url) if url else ""
            if not canonical:
                title = item.get("title") or ""
                company = item.get("company") or ""
                if not title and not company:
                    continue
                canonical = f"{title}|{company}"

            existing = db.query(IngestJob).filter(IngestJob.canonical_key == canonical).first()
            if existing:
                existing.last_seen_at = now
                existing.source = source
                db.add(existing)
            else:
                new_job = IngestJob(
                    canonical_key=canonical,
                    title=item.get("title") or "",
                    company=item.get("company") or "",
                    location=item.get("location") or "",
                    url=canonical if url else None,
                    raw=json.dumps(item),
                    source=source,
                    status="new",
                    first_seen_at=now,
                    last_seen_at=now,
                )
                db.add(new_job)
                inserted += 1

        db.commit()
    except Exception as e:
        logger.error(f"[scheduler] _persist_scraped_jobs error ({source}): {e}")
        db.rollback()
    finally:
        db.close()

    return inserted


async def fetch_and_cache_top_matches(user_id: int) -> Optional[dict]:
    """
    Run the full scrape + score pipeline for a user and store the result
    in the per-user cache.  Returns the result dict or None on failure.

    Uses _scrape_semaphore to limit concurrent scrapes across all callers.
    """
    async with _scrape_semaphore:
        return await _fetch_and_cache_top_matches_inner(user_id)


async def _fetch_and_cache_top_matches_inner(user_id: int) -> Optional[dict]:
    """Inner implementation — called under the semaphore."""
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

        # location_preference may be comma-separated (multiple locations); use the first for search
        location = (user.location_preference or "").split(",")[0].strip()
        drushim_url = f"https://www.drushim.co.il/jobs/subcat/{category}"
        cache = get_cache()

        source_cfg = _load_source_configs()

        # ── Drushim ──────────────────────────────────────────────────────────
        drushim_jobs = []
        if source_cfg.get("drushim", type("_", (), {"enabled": False})()).enabled:
            drushim_role_key = _re.sub(r'\W+', '_', f"{user.target_role}_{category}").lower().strip('_')
            cache_key_drushim = make_jobs_cache_key("drushim", drushim_role_key)
            drushim_jobs = cache.get(cache_key_drushim)
            fresh_drushim = False
            if not drushim_jobs:
                log_id = _log_fetch_start("drushim")
                logger.info(f"[scheduler] drushim scrape for user {user_id} role={user.target_role} category={category}")
                try:
                    scraper = DrushimScraper()
                    drushim_jobs = await scraper.scrape_listing_async(drushim_url)
                    if drushim_jobs:
                        cache.set(cache_key_drushim, drushim_jobs, ttl=CACHE_TTL_ROLE)
                        fresh_drushim = True
                        _update_source_run("drushim", len(drushim_jobs))
                        _log_fetch_end(log_id, "success", len(drushim_jobs))
                    else:
                        _log_fetch_end(log_id, "success", 0)
                except Exception as e:
                    logger.warning(f"[scheduler] drushim scrape failed for user {user_id}: {e}")
                    _log_fetch_end(log_id, "error", 0, str(e))
                    drushim_jobs = []
            drushim_jobs = drushim_jobs or []
            for j in drushim_jobs:
                j.setdefault("source", "drushim")
            if fresh_drushim and drushim_jobs:
                n = await _persist_scraped_jobs(drushim_jobs, source="drushim")
                logger.info(f"[scheduler] persisted {n} new drushim jobs")
        else:
            logger.info("[scheduler] drushim disabled — skipping")

        # ── LinkedIn ─────────────────────────────────────────────────────────
        linkedin_jobs = []
        fresh_linkedin = False
        if source_cfg.get("linkedin", type("_", (), {"enabled": True})()).enabled and user.target_role:
            li_at = user.linkedin_li_at
            li_role_key = _re.sub(r'\W+', '_', f"{user.target_role}_{location}").lower().strip('_')
            cache_key_li = make_jobs_cache_key("linkedin", li_role_key)
            linkedin_jobs = cache.get(cache_key_li)
            if not linkedin_jobs:
                log_id = _log_fetch_start("linkedin")
                logger.info(f"[scheduler] linkedin scrape for user {user_id} role={user.target_role}")
                try:
                    li_scraper = LinkedInJobSearchScraper()
                    li_limit = (
                        LinkedInJobSearchScraper.PRO_LIMIT
                        if getattr(user, "subscription_tier", "free") == "pro"
                        else LinkedInJobSearchScraper.FREE_LIMIT
                    )
                    linkedin_jobs = await li_scraper.search_async(user.target_role, location, li_at=li_at, limit=li_limit)
                    if linkedin_jobs:
                        cache.set(cache_key_li, linkedin_jobs, ttl=CACHE_TTL_ROLE)
                        fresh_linkedin = True
                        _update_source_run("linkedin", len(linkedin_jobs))
                        _log_fetch_end(log_id, "success", len(linkedin_jobs))
                    else:
                        _log_fetch_end(log_id, "success", 0)
                except Exception as e:
                    logger.warning(f"[scheduler] linkedin scrape failed for user {user_id}: {e}")
                    _log_fetch_end(log_id, "error", 0, str(e))
                    linkedin_jobs = []
        linkedin_jobs = linkedin_jobs or []
        for j in linkedin_jobs:
            j.setdefault("source", "linkedin")

        if fresh_linkedin and linkedin_jobs:
            n = await _persist_scraped_jobs(linkedin_jobs, source="linkedin")
            logger.info(f"[scheduler] persisted {n} new linkedin jobs")

        # ── LinkedIn fallback: use n8n-ingested jobs when scraper is blocked ──
        if not linkedin_jobs:
            from datetime import timedelta
            from app.models import IngestJob
            cutoff = datetime.utcnow() - timedelta(hours=26)
            rows = (
                db.query(IngestJob)
                .filter(IngestJob.source == "linkedin", IngestJob.last_seen_at >= cutoff)
                .order_by(IngestJob.last_seen_at.desc())
                .limit(100)
                .all()
            )
            for row in rows:
                try:
                    raw = json.loads(row.raw or "{}")
                except Exception:
                    raw = {}
                linkedin_jobs.append({
                    "title":       row.title or "",
                    "company":     row.company or "",
                    "location":    row.location or "",
                    "url":         row.url or "",
                    "description": raw.get("description", ""),
                    "skills":      raw.get("skills", []),
                    "source":      "linkedin",
                })
            if rows:
                logger.info(f"[scheduler] LinkedIn blocked — loaded {len(rows)} jobs from ingest_jobs fallback")

        # ── TechMap ──────────────────────────────────────────────────────────
        techmap_jobs = []
        if source_cfg.get("techmap", type("_", (), {"enabled": False})()).enabled:
            from app.services.techmap import fetch_for_role as techmap_fetch
            techmap_role_key = _re.sub(r'\W+', '_', user.target_role).lower().strip('_')
            cache_key_techmap = make_jobs_cache_key("techmap", techmap_role_key)
            techmap_jobs = cache.get(cache_key_techmap)
            fresh_techmap = False
            if not techmap_jobs:
                log_id = _log_fetch_start("techmap")
                logger.info(f"[scheduler] techmap fetch for user {user_id} role={user.target_role}")
                try:
                    techmap_jobs = await techmap_fetch(user.target_role)
                    if techmap_jobs:
                        cache.set(cache_key_techmap, techmap_jobs, ttl=CACHE_TTL_ROLE)
                        fresh_techmap = True
                        _update_source_run("techmap", len(techmap_jobs))
                        _log_fetch_end(log_id, "success", len(techmap_jobs))
                    else:
                        _log_fetch_end(log_id, "success", 0)
                except Exception as e:
                    logger.warning(f"[scheduler] techmap fetch failed for user {user_id}: {e}")
                    _log_fetch_end(log_id, "error", 0, str(e))
                    techmap_jobs = []
            techmap_jobs = techmap_jobs or []
            for j in techmap_jobs:
                j.setdefault("source", "techmap")
            if fresh_techmap and techmap_jobs:
                n = await _persist_scraped_jobs(techmap_jobs, source="techmap")
                logger.info(f"[scheduler] persisted {n} new techmap jobs")
        else:
            logger.info("[scheduler] techmap disabled — skipping")

        jobs = drushim_jobs + linkedin_jobs + techmap_jobs
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
            job_title  = (job.get("title") or "").lower()
            job_desc   = (job.get("description") or "").lower()
            job_skills_listed = {s.lower() for s in (job.get("skills") or [])}
            job_tech   = _extract_tech(f"{job_title} {job_desc}") | job_skills_listed
            forward    = len(user_set & job_tech) / len(user_set) if user_set else 0
            backward   = len(user_set & job_tech) / len(job_tech) if job_tech else 0
            role_bonus = 0.12 if any(rk in job_title for rk in role_keywords) else 0
            return round(min((forward * 0.50 + backward * 0.38 + role_bonus) * 100, 100))

        scored = sorted(
            [{**j, "match_score": score_job(j)} for j in jobs],
            key=lambda x: x["match_score"],
            reverse=True,
        )

        result = {
            "jobs":          scored,
            "user_skills":   deduped_skills,
            "category":      category,
            "total_scraped": len(jobs),
            "source_counts": {
                "linkedin": len(linkedin_jobs),
                "drushim":  len(drushim_jobs),
                "techmap":  len(techmap_jobs),
            },
            "cached_at":     datetime.utcnow().isoformat(),
            "profile_hash":  profile_hash(user),
        }

        cache.set(user_cache_key(user_id), result, ttl=CACHE_TTL_USER)
        logger.info(f"[scheduler] cached {len(scored)} jobs for user {user_id} (TTL={CACHE_TTL_USER}s)")
        return result

    except Exception as e:
        logger.error(f"[scheduler] fetch_and_cache_top_matches user={user_id}: {e}")
        return None
    finally:
        db.close()


async def run_scheduler():
    """
    Background loop: sleep until 07:30 Israel time each day, then:
      1. Clear all shared role-level caches (drushim / linkedin / techmap)
         so fresh job data is fetched for today.
      2. Clear every per-user top-matches cache.
      3. Re-populate all active users under the scrape semaphore.

    Shared role-level caches ensure that users sharing the same target_role
    only trigger ONE ScraperAPI call per source per day — not one per user.
    """
    logger.info("[scheduler] started — daily refresh at 07:30 Israel time")

    while True:
        # Read schedule time from DB (defaults to 07:30 if table not yet populated)
        cfg = _load_source_configs()
        li_cfg = cfg.get("linkedin")
        sched_hour   = li_cfg.schedule_hour   if li_cfg else 7
        sched_minute = li_cfg.schedule_minute if li_cfg else 30

        wait = seconds_until_next_run(sched_hour, sched_minute)
        next_run_il = datetime.now(IL_TZ) + timedelta(seconds=wait)
        logger.info(
            f"[scheduler] next run in {wait/3600:.1f}h "
            f"({next_run_il.strftime('%Y-%m-%d %H:%M %Z')})"
        )
        await asyncio.sleep(wait)

        logger.info("[scheduler] 07:30 IL — starting daily cache refresh")

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

        # Reload config after waking to pick up any admin changes made during sleep
        source_cfg_run = _load_source_configs()

        # Clear shared role-level caches for enabled sources
        source_prefixes = {
            "linkedin": "jobs:linkedin:",
            "drushim":  "jobs:drushim:",
            "techmap":  "jobs:techmap:",
        }
        for src, prefix in source_prefixes.items():
            row = source_cfg_run.get(src)
            if row and row.enabled:
                deleted = cache.delete_pattern(prefix)
                logger.info(f"[scheduler] cleared {deleted} '{prefix}' cache entries")

        # Clear per-user top-matches caches
        for uid in user_ids:
            cache.delete(user_cache_key(uid))
        logger.info(f"[scheduler] cleared top-matches cache for {len(user_ids)} users")

        # Re-populate — shared role caches deduplicate scrapes across users
        logger.info(f"[scheduler] re-populating {len(user_ids)} users...")
        for uid in user_ids:
            try:
                jitter = random.uniform(0, 30)
                await asyncio.sleep(jitter)
                await fetch_and_cache_top_matches(uid)
            except Exception as e:
                logger.error(f"[scheduler] error refreshing user {uid}: {e}")

        logger.info("[scheduler] daily refresh complete")
