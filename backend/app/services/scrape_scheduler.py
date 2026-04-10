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
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode


def normalize_url(url: str) -> str:
    """Normalize URL by stripping tracking params and canonicalizing."""
    if not url:
        return ""
    url = url.strip()
    try:
        parsed = urlparse(url)
        if not parsed.scheme:
            parsed = urlparse("https://" + url)
        q = parse_qsl(parsed.query, keep_blank_values=True)
        filtered = [(k, v) for (k, v) in q if not k.startswith("utm_") and k not in ("fbclid", "gclid")]
        new_parsed = parsed._replace(query=urlencode(sorted(filtered)))
        return urlunparse(new_parsed)
    except Exception:
        return url

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


async def _scrape_drushim(user, source_cfg, cache, category: str, drushim_url: str) -> list:
    """Fetch Drushim jobs for a user's role. Returns job list (may be from cache)."""
    from app.services.cache import make_jobs_cache_key
    from app.services.scrapers import DrushimScraper

    if not source_cfg.get("drushim", type("_", (), {"enabled": False})()).enabled:
        logger.info("[scheduler] drushim disabled — skipping")
        return []

    drushim_role_key = _re.sub(r'\W+', '_', f"{user.target_role}_{category}").lower().strip('_')
    cache_key = make_jobs_cache_key("drushim", drushim_role_key)
    cached = cache.get(cache_key)
    if cached:
        for j in cached:
            j.setdefault("source", "drushim")
        return cached

    log_id = _log_fetch_start("drushim")
    logger.info(f"[scheduler] drushim scrape role={user.target_role} category={category}")
    try:
        jobs = await DrushimScraper().scrape_listing_async(drushim_url)
        if jobs:
            cache.set(cache_key, jobs, ttl=CACHE_TTL_ROLE)
            _update_source_run("drushim", len(jobs))
            _log_fetch_end(log_id, "success", len(jobs))
            for j in jobs:
                j.setdefault("source", "drushim")
            n = await _persist_scraped_jobs(jobs, source="drushim")
            logger.info(f"[scheduler] persisted {n} new drushim jobs")
        else:
            _log_fetch_end(log_id, "success", 0)
        return jobs or []
    except Exception as e:
        logger.warning(f"[scheduler] drushim scrape failed: {e}")
        _log_fetch_end(log_id, "error", 0, str(e))
        return []


async def _scrape_linkedin(user, source_cfg, cache, locations: list) -> list:
    """Fetch LinkedIn jobs across all preferred locations in parallel. Returns merged list."""
    from app.services.cache import make_jobs_cache_key
    from app.services.scrapers import LinkedInJobSearchScraper

    if not (source_cfg.get("linkedin", type("_", (), {"enabled": True})()).enabled and user.target_role):
        return []

    from app.crypto import decrypt_field_safe
    li_at = decrypt_field_safe(user.linkedin_li_at)
    LINKEDIN_TOTAL_LIMIT = 20
    per_loc_limit = max(5, LINKEDIN_TOTAL_LIMIT // max(len(locations), 1))
    li_scraper = LinkedInJobSearchScraper()

    async def _fetch_location(location: str) -> list:
        li_role_key = _re.sub(r'\W+', '_', f"{user.target_role}_{location}").lower().strip('_')
        cache_key = make_jobs_cache_key("linkedin", li_role_key)
        cached = cache.get(cache_key)
        if cached:
            return cached
        log_id = _log_fetch_start("linkedin")
        logger.info(f"[scheduler] linkedin scrape role={user.target_role} location={location!r}")
        try:
            loc_jobs = await li_scraper.search_async(
                user.target_role, location,
                li_at=li_at, limit=per_loc_limit,
                years_of_experience=user.years_of_experience,
            )
            if loc_jobs:
                cache.set(cache_key, loc_jobs, ttl=CACHE_TTL_ROLE)
                _update_source_run("linkedin", len(loc_jobs))
                _log_fetch_end(log_id, "success", len(loc_jobs))
            else:
                _log_fetch_end(log_id, "success", 0)
            return loc_jobs or []
        except Exception as e:
            logger.warning(f"[scheduler] linkedin scrape failed location={location!r}: {e}")
            _log_fetch_end(log_id, "error", 0, str(e))
            return []

    # All locations scraped in parallel
    location_results = await asyncio.gather(*[_fetch_location(loc) for loc in locations])

    # Merge + deduplicate across locations
    seen_ids: set = set()
    jobs: list = []
    fresh_any = False
    for loc_jobs in location_results:
        for j in loc_jobs:
            jid = j.get("job_id") or j.get("url")
            if jid and jid not in seen_ids:
                seen_ids.add(jid)
                j.setdefault("source", "linkedin")
                jobs.append(j)
                fresh_any = True

    jobs = jobs[:LINKEDIN_TOTAL_LIMIT]
    if fresh_any and jobs:
        n = await _persist_scraped_jobs(jobs, source="linkedin")
        logger.info(f"[scheduler] persisted {n} new linkedin jobs")
    return jobs


async def _scrape_techmap(user, source_cfg, cache) -> list:
    """Fetch TechMap jobs for a user's role. Returns job list (may be from cache)."""
    from app.services.cache import make_jobs_cache_key

    if not source_cfg.get("techmap", type("_", (), {"enabled": False})()).enabled:
        logger.info("[scheduler] techmap disabled — skipping")
        return []

    from app.services.techmap import fetch_for_role as techmap_fetch
    techmap_role_key = _re.sub(r'\W+', '_', user.target_role).lower().strip('_')
    cache_key = make_jobs_cache_key("techmap", techmap_role_key)
    cached = cache.get(cache_key)
    if cached:
        for j in cached:
            j.setdefault("source", "techmap")
        return cached

    log_id = _log_fetch_start("techmap")
    logger.info(f"[scheduler] techmap fetch role={user.target_role}")
    try:
        jobs = await techmap_fetch(user.target_role)
        if jobs:
            cache.set(cache_key, jobs, ttl=CACHE_TTL_ROLE)
            _update_source_run("techmap", len(jobs))
            _log_fetch_end(log_id, "success", len(jobs))
            for j in jobs:
                j.setdefault("source", "techmap")
            n = await _persist_scraped_jobs(jobs, source="techmap")
            logger.info(f"[scheduler] persisted {n} new techmap jobs")
        else:
            _log_fetch_end(log_id, "success", 0)
        return jobs or []
    except Exception as e:
        logger.warning(f"[scheduler] techmap fetch failed: {e}")
        _log_fetch_end(log_id, "error", 0, str(e))
        return []


FREE_SCRAPE_LIMIT = 2  # max scrapes per day for free-tier users

async def _fetch_and_cache_top_matches_inner(user_id: int) -> Optional[dict]:
    """Inner implementation — called under the semaphore."""
    from app.database import SessionLocal
    from app.models import User, UsageQuota
    from app.services.cache import get_cache
    from datetime import date as _date

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.target_role:
            return None

        # ── Daily scrape quota for free users ────────────────────────────────
        if (user.subscription_tier or "free") == "free":
            today = _date.today().isoformat()
            quota_row = (
                db.query(UsageQuota)
                .filter(UsageQuota.user_id == user_id, UsageQuota.feature == "scrape", UsageQuota.date == today)
                .with_for_update()
                .first()
            )
            used = quota_row.count if quota_row else 0
            if used >= FREE_SCRAPE_LIMIT:
                logger.info(f"[scheduler] user {user_id} hit free scrape limit ({FREE_SCRAPE_LIMIT}/day) — skipping")
                return None
            # Increment counter
            if quota_row:
                quota_row.count += 1
            else:
                db.add(UsageQuota(user_id=user_id, feature="scrape", date=today, count=1))
            db.commit()

        user_skills = user.skills_list
        target_role = (user.target_role or "").lower()

        # Determine Drushim category
        category = "71"
        for keywords, cat in ROLE_CATEGORY_MAP:
            if any(kw in target_role for kw in keywords):
                category = cat
                break

        # Build location list — LinkedIn scrapes Israel only.
        # Filter to known Israeli cities/regions; fall back to "Israel" if none match.
        _ISRAEL_KEYWORDS = {
            "israel", "tel aviv", "jerusalem", "haifa", "beer sheva", "beersheba",
            "netanya", "herzliya", "raanana", "ra'anana", "petah tikva", "petah tiqwa",
            "rishon lezion", "rishon", "rehovot", "holon", "bat yam", "ashdod",
            "ashkelon", "eilat", "modiin", "modi'in", "kfar saba", "ramat gan",
            "givatayim", "bnei brak", "beit shemesh", "nazareth", "hadera",
            "central israel", "north israel", "south israel", "gush dan",
        }
        _raw_locs = [l.strip() for l in (user.location_preference or "").split(",") if l.strip()]
        locations = [
            l for l in _raw_locs
            if any(kw in l.lower() for kw in _ISRAEL_KEYWORDS)
        ] or ["Israel"]
        drushim_url = f"https://www.drushim.co.il/jobs/subcat/{category}"
        cache = get_cache()
        source_cfg = _load_source_configs()

        # ── Parallel source scraping ──────────────────────────────────────────
        # All three sources run concurrently — each is I/O bound (HTTP via ScraperAPI).
        drushim_jobs, linkedin_jobs, techmap_jobs = await asyncio.gather(
            _scrape_drushim(user, source_cfg, cache, category, drushim_url),
            _scrape_linkedin(user, source_cfg, cache, locations),
            _scrape_techmap(user, source_cfg, cache),
            return_exceptions=False,
        )
        # Safety: gather with return_exceptions=False will propagate — ensure lists
        drushim_jobs = drushim_jobs if isinstance(drushim_jobs, list) else []
        linkedin_jobs = linkedin_jobs if isinstance(linkedin_jobs, list) else []
        techmap_jobs  = techmap_jobs  if isinstance(techmap_jobs,  list) else []

        # ── LinkedIn DB fallback when live scrape returned nothing ─────────────
        if not linkedin_jobs:
            from datetime import timedelta
            from app.models import IngestJob
            cutoff = datetime.utcnow() - timedelta(hours=26)
            rows = (
                db.query(IngestJob)
                .filter(IngestJob.source == "linkedin", IngestJob.last_seen_at >= cutoff)
                .order_by(IngestJob.last_seen_at.desc())
                .limit(20)
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
                logger.info(f"[scheduler] LinkedIn blocked — loaded {len(rows)} jobs from DB fallback")

        jobs = drushim_jobs + linkedin_jobs + techmap_jobs
        if not jobs:
            return None

        # ── Batch scoring (single TF-IDF fit for all jobs) ────────────────────
        from app.services.ai import calculate_match_scores_batch

        seen: set = set()
        deduped_skills = []
        for s in user_skills:
            k = s.lower()
            if k not in seen:
                seen.add(k)
                deduped_skills.append(s)

        user_years_exp = getattr(user, "years_of_experience", None)
        scores = calculate_match_scores_batch(deduped_skills, target_role, jobs, user_years_exp)

        scored = sorted(
            [{**j, "match_score": scores[i][0]} for i, j in enumerate(jobs)],
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
            "cached_at":    datetime.utcnow().isoformat(),
            "profile_hash": profile_hash(user),
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

        # Re-populate — all users fan out concurrently under the semaphore
        # (MAX_CONCURRENT_SCRAPES=3 limits actual parallelism).
        # Jitter spreads ScraperAPI bursts; users overlap under the semaphore.
        logger.info(f"[scheduler] re-populating {len(user_ids)} users (concurrency={MAX_CONCURRENT_SCRAPES})...")

        async def _refresh_user(uid: int) -> None:
            await asyncio.sleep(random.uniform(0, 30))  # spread load
            try:
                await fetch_and_cache_top_matches(uid)
            except Exception as e:
                logger.error(f"[scheduler] error refreshing user {uid}: {e}")

        await asyncio.gather(*[_refresh_user(uid) for uid in user_ids])
        logger.info("[scheduler] daily refresh complete")
