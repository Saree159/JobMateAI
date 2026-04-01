"""
Ingestion endpoints for external collectors (n8n).
"""
import json
import logging
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

from fastapi import APIRouter, Header, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session

from pydantic import BaseModel

from app.config import settings
from app.database import get_db
from app.models import IngestEvent, IngestJob
from app.schemas import IngestEmailRequest, IngestEmailResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


def normalize_url(url: str) -> str:
    """Normalize URL by trimming and removing common tracking params."""
    if not url:
        return ""
    url = url.strip()
    try:
        parsed = urlparse(url)
        if not parsed.scheme:
            # assume https
            parsed = urlparse("https://" + url)
        # remove tracking params
        q = parse_qsl(parsed.query, keep_blank_values=True)
        filtered = [(k, v) for (k, v) in q if not k.startswith("utm_") and k not in ("fbclid", "gclid")]
        new_query = urlencode(sorted(filtered))
        new_parsed = parsed._replace(query=new_query)
        # canonical string
        canon = urlunparse(new_parsed)
        return canon
    except Exception:
        return url


@router.post("/linkedin-email", response_model=IngestEmailResponse)
def ingest_linkedin_email(
    req: IngestEmailRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-KEY"),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Simple auth
    if x_api_key != settings.ingestion_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    # Basic validation
    email = req.email
    if not email or not email.get("emailId") or not email.get("receivedAt"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing email.emailId or receivedAt")

    email_id = email.get("emailId")
    received_at_raw = email.get("receivedAt")
    try:
        received_at = datetime.fromisoformat(received_at_raw.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid receivedAt datetime")

    # Check already ingested
    existing = db.query(IngestEvent).filter(IngestEvent.email_id == email_id).first()
    if existing:
        return IngestEmailResponse(emailId=email_id, alreadyProcessed=True, inserted=0, updated=0, skipped=0)

    # create ingest event record
    ingest_event = IngestEvent(
        source=req.source,
        run_id=req.runId,
        email_id=email_id,
        received_at=received_at,
        subject=email.get("subject"),
        snippet=email.get("snippet"),
        payload=json.dumps(req.model_dump()),
        processed=0
    )
    db.add(ingest_event)
    db.flush()

    inserted = 0
    updated = 0
    skipped = 0

    jobs = req.jobs or []
    for item in jobs:
        # validate minimal fields
        if not (item.title or item.company or item.url):
            skipped += 1
            continue

        url = item.url or ""
        canonical = ""
        if url:
            canonical = normalize_url(url)
            parsed = urlparse(canonical)
            if not parsed.scheme or not parsed.netloc:
                skipped += 1
                continue
        else:
            # fallback canonical key from title+company
            canonical = (item.title or "") + "|" + (item.company or "")

        # try find existing ingest job by canonical_key
        job = db.query(IngestJob).filter(IngestJob.canonical_key == canonical).first()
        now = received_at
        raw_json = json.dumps({"title": item.title, "company": item.company, "location": item.location, "url": item.url, "raw": item.raw or {}})

        if job:
            # update last seen and refresh fields if missing
            job.last_seen_at = now
            if item.title and not job.title:
                job.title = item.title
            if item.company and not job.company:
                job.company = item.company
            if item.location and not job.location:
                job.location = item.location
            if url and not job.url:
                job.url = canonical
            job.raw = raw_json
            job.source = req.source
            updated += 1
            db.add(job)
        else:
            new_job = IngestJob(
                canonical_key=canonical,
                title=item.title or "",
                company=item.company or "",
                location=item.location or "",
                url=canonical if url else None,
                raw=raw_json,
                source=req.source,
                status="new",
                first_seen_at=now,
                last_seen_at=now
            )
            db.add(new_job)
            inserted += 1

    ingest_event.inserted = inserted
    ingest_event.updated = updated
    ingest_event.skipped = skipped
    ingest_event.processed = 1
    db.commit()

    return IngestEmailResponse(emailId=email_id, alreadyProcessed=False, inserted=inserted, updated=updated, skipped=skipped)


# ── n8n jobs ingest ──────────────────────────────────────────────────────────

class _JobItem(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    url: str = ""
    description: str = ""
    skills: List[str] = []


class _JobsPayload(BaseModel):
    source: str = "n8n"
    jobs: List[_JobItem] = []


@router.post("/jobs")
def ingest_jobs(
    payload: _JobsPayload,
    x_api_key: Optional[str] = Header(None, alias="X-API-KEY"),
    db: Session = Depends(get_db),
):
    """Accept a batch of jobs pushed by n8n (or any external collector)."""
    if x_api_key != settings.ingestion_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    inserted = updated = skipped = 0
    now = datetime.utcnow()
    source = payload.source or "n8n"

    for item in payload.jobs:
        if not item.url and not item.title:
            skipped += 1
            continue

        canonical = normalize_url(item.url) if item.url else f"{item.title}|{item.company}"
        if not canonical:
            skipped += 1
            continue

        raw_data = json.dumps({
            "title": item.title,
            "company": item.company,
            "location": item.location,
            "url": item.url,
            "description": item.description,
            "skills": item.skills,
        })

        existing = db.query(IngestJob).filter(IngestJob.canonical_key == canonical).first()
        if existing:
            existing.last_seen_at = now
            existing.raw = raw_data
            db.add(existing)
            updated += 1
        else:
            db.add(IngestJob(
                canonical_key=canonical,
                title=item.title,
                company=item.company,
                location=item.location,
                url=item.url or None,
                raw=raw_data,
                source=source,
                status="new",
                first_seen_at=now,
                last_seen_at=now,
            ))
            inserted += 1

    db.commit()
    logger.info(f"[ingest/jobs] source={source} inserted={inserted} updated={updated} skipped={skipped}")
    return {"inserted": inserted, "updated": updated, "skipped": skipped}
