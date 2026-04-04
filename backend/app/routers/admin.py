"""
Admin statistics router.
Returns aggregated real data for the HireMatrix admin dashboard.
All endpoints require the X-Admin-Key header to match settings.admin_api_key.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text, cast, Date, extract
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

import json as _json
from app.database import get_db
from app.models import User, Job, JobStatus, JobAlert, Application, IngestJob, IngestEvent, AIUsageLog, UserSession, UserEvent
from app.config import settings
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def verify_admin(x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")):
    """Dependency: reject requests that don't carry the correct admin key."""
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin key",
        )


def verify_admin_user(current_user: User = Depends(get_current_user)):
    """Dependency: allow access only to users whose email is in admin_emails_list."""
    if current_user.email.lower() not in settings.admin_emails_list:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def month_label(dt: datetime) -> str:
    return dt.strftime("%b %Y")


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    """Return all aggregated stats for the admin dashboard."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # ── Users ───────────────────────────────────────────────────────────────
    total_users = db.query(func.count(User.id)).scalar() or 0
    pro_users = db.query(func.count(User.id)).filter(User.subscription_tier == "pro").scalar() or 0
    free_users = total_users - pro_users
    active_subs = db.query(func.count(User.id)).filter(
        User.subscription_status == "active"
    ).scalar() or 0
    new_today = db.query(func.count(User.id)).filter(User.created_at >= today_start).scalar() or 0
    new_week = db.query(func.count(User.id)).filter(User.created_at >= week_start).scalar() or 0
    new_month = db.query(func.count(User.id)).filter(User.created_at >= month_start).scalar() or 0

    # Monthly signups — last 7 months (1 query, grouped in Python)
    seven_months_ago = (now.replace(day=1) - timedelta(days=6 * 30)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    _signup_rows = db.query(User.created_at).filter(User.created_at >= seven_months_ago).all()
    _signup_by_ym = defaultdict(int)
    for (dt,) in _signup_rows:
        _signup_by_ym[dt.strftime("%Y-%m")] += 1
    monthly_signups = []
    for i in range(6, -1, -1):
        m_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        monthly_signups.append({"month": m_start.strftime("%b"), "signups": _signup_by_ym.get(m_start.strftime("%Y-%m"), 0)})

    # Users with completed profiles
    with_skills = db.query(func.count(User.id)).filter(
        User.skills.isnot(None), User.skills != ""
    ).scalar() or 0
    with_role = db.query(func.count(User.id)).filter(
        User.target_role.isnot(None), User.target_role != ""
    ).scalar() or 0

    # ── Jobs ────────────────────────────────────────────────────────────────
    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    jobs_by_status = dict(
        db.query(Job.status, func.count(Job.id))
        .group_by(Job.status)
        .all()
    )
    # Normalize enum keys to strings
    jobs_by_status = {str(k.value if hasattr(k, 'value') else k): v for k, v in jobs_by_status.items()}

    avg_match = db.query(func.avg(Job.match_score)).filter(Job.match_score.isnot(None)).scalar()
    avg_match = round(float(avg_match), 1) if avg_match else 0.0

    with_cover_letter = db.query(func.count(Job.id)).filter(
        Job.cover_letter.isnot(None), Job.cover_letter != ""
    ).scalar() or 0
    with_match_score = db.query(func.count(Job.id)).filter(
        Job.match_score.isnot(None)
    ).scalar() or 0

    # Jobs added this month
    jobs_this_month = db.query(func.count(Job.id)).filter(Job.created_at >= month_start).scalar() or 0

    # ── Applications ─────────────────────────────────────────────────────────
    total_apps = db.query(func.count(Application.id)).scalar() or 0
    apps_by_status = dict(
        db.query(Application.final_status, func.count(Application.id))
        .group_by(Application.final_status)
        .all()
    )
    apps_by_status = {str(k.value if hasattr(k, 'value') else k): v for k, v in apps_by_status.items()}

    avg_time_to_apply = db.query(func.avg(Application.time_to_apply)).filter(
        Application.time_to_apply.isnot(None)
    ).scalar()
    avg_time_to_interview = db.query(func.avg(Application.time_to_interview)).filter(
        Application.time_to_interview.isnot(None)
    ).scalar()
    avg_time_to_offer = db.query(func.avg(Application.time_to_offer)).filter(
        Application.time_to_offer.isnot(None)
    ).scalar()

    # ── Alerts ───────────────────────────────────────────────────────────────
    total_alerts = db.query(func.count(JobAlert.id)).scalar() or 0
    active_alerts = db.query(func.count(JobAlert.id)).filter(JobAlert.is_active == 1).scalar() or 0

    # ── Ingest jobs ──────────────────────────────────────────────────────────
    total_ingest_jobs = db.query(func.count(IngestJob.id)).scalar() or 0
    ingest_by_source = dict(
        db.query(IngestJob.source, func.count(IngestJob.id))
        .group_by(IngestJob.source)
        .all()
    )
    ingest_by_status = dict(
        db.query(IngestJob.status, func.count(IngestJob.id))
        .group_by(IngestJob.status)
        .all()
    )
    ingest_by_status = {str(k.value if hasattr(k, 'value') else k): v for k, v in ingest_by_status.items()}

    # Ingest jobs added today / this week
    ingest_today = db.query(func.count(IngestJob.id)).filter(
        IngestJob.created_at >= today_start
    ).scalar() or 0
    ingest_week = db.query(func.count(IngestJob.id)).filter(
        IngestJob.created_at >= week_start
    ).scalar() or 0

    # ── Ingest events ─────────────────────────────────────────────────────────
    total_events = db.query(func.count(IngestEvent.id)).scalar() or 0
    processed_events = db.query(func.count(IngestEvent.id)).filter(
        IngestEvent.processed == 1
    ).scalar() or 0
    failed_events = db.query(func.count(IngestEvent.id)).filter(
        IngestEvent.error.isnot(None), IngestEvent.error != ""
    ).scalar() or 0

    # ── AI Usage Log ─────────────────────────────────────────────────────────
    ai_total_calls = db.query(func.count(AIUsageLog.id)).scalar() or 0
    ai_total_tokens_in = db.query(func.coalesce(func.sum(AIUsageLog.tokens_in), 0)).scalar() or 0
    ai_total_tokens_out = db.query(func.coalesce(func.sum(AIUsageLog.tokens_out), 0)).scalar() or 0
    ai_total_cost = db.query(func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0)).scalar() or 0.0

    # By feature
    ai_by_feature_raw = (
        db.query(
            AIUsageLog.feature,
            func.count(AIUsageLog.id),
            func.coalesce(func.sum(AIUsageLog.tokens_in), 0),
            func.coalesce(func.sum(AIUsageLog.tokens_out), 0),
            func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0),
        )
        .group_by(AIUsageLog.feature)
        .all()
    )
    ai_by_feature = [
        {"feature": row[0], "calls": row[1], "tokens_in": row[2], "tokens_out": row[3], "cost_usd": round(float(row[4]), 6)}
        for row in ai_by_feature_raw
    ]

    # By model
    ai_by_model_raw = (
        db.query(
            AIUsageLog.model,
            func.count(AIUsageLog.id),
            func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0),
        )
        .group_by(AIUsageLog.model)
        .all()
    )
    ai_by_model = [
        {"model": row[0], "calls": row[1], "cost_usd": round(float(row[2]), 6)}
        for row in ai_by_model_raw
    ]

    # Daily cost — last 30 days (1 query instead of 60)
    _ai_window_start = today_start - timedelta(days=29)
    _ai_daily_rows = (
        db.query(
            cast(AIUsageLog.created_at, Date).label("day"),
            func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0).label("cost"),
            func.coalesce(func.sum(AIUsageLog.tokens_in + AIUsageLog.tokens_out), 0).label("tokens"),
        )
        .filter(AIUsageLog.created_at >= _ai_window_start)
        .group_by(cast(AIUsageLog.created_at, Date))
        .all()
    )
    _ai_daily_lookup = {str(r.day): (float(r.cost), int(r.tokens)) for r in _ai_daily_rows}
    ai_daily = []
    for i in range(29, -1, -1):
        day_start = today_start - timedelta(days=i)
        key = day_start.strftime("%Y-%m-%d")
        cost, tokens = _ai_daily_lookup.get(key, (0.0, 0))
        ai_daily.append({
            "day": day_start.strftime("%b %d"),
            "cost": round(cost, 4),
            "tokens": tokens,
        })

    # ── Retention / Sessions ─────────────────────────────────────────────────
    # DAU / WAU / MAU — distinct users with a session in each window
    dau = db.query(func.count(func.distinct(UserSession.user_id))).filter(
        UserSession.created_at >= today_start
    ).scalar() or 0
    wau = db.query(func.count(func.distinct(UserSession.user_id))).filter(
        UserSession.created_at >= week_start
    ).scalar() or 0
    mau = db.query(func.count(func.distinct(UserSession.user_id))).filter(
        UserSession.created_at >= month_start
    ).scalar() or 0

    # DAU/WAU/MAU trend — last 7 months (1 query, grouped in Python)
    _trend_cutoff = (now.replace(day=1) - timedelta(days=6 * 30)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    _session_rows = (
        db.query(UserSession.user_id, UserSession.created_at)
        .filter(UserSession.created_at >= _trend_cutoff)
        .all()
    )
    dau_wau_mau_trend = []
    for i in range(6, -1, -1):
        m_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        wau_start = m_end - timedelta(days=7)
        dau_start = m_end - timedelta(days=1)
        mau_users, wau_users, dau_users = set(), set(), set()
        for uid, sdt in _session_rows:
            if m_start <= sdt < m_end:
                mau_users.add(uid)
            if wau_start <= sdt < m_end:
                wau_users.add(uid)
            if dau_start <= sdt < m_end:
                dau_users.add(uid)
        dau_wau_mau_trend.append({
            "month": m_start.strftime("%b"),
            "dau": len(dau_users),
            "wau": len(wau_users),
            "mau": len(mau_users),
        })

    # Cohort retention — signup month cohorts, D1/D7/D30 retention
    # 2 queries per cohort (users + their sessions) instead of 1 per user per window
    cohort_retention = []
    for i in range(6, -1, -1):
        cohort_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        cohort_end = (cohort_start + timedelta(days=32)).replace(day=1)
        cohort_users = db.query(User.id, User.created_at).filter(
            User.created_at >= cohort_start, User.created_at < cohort_end
        ).all()
        cohort_size = len(cohort_users)

        if cohort_size == 0:
            cohort_retention.append({"cohort": cohort_start.strftime("%b %Y"), "size": 0, "d1": None, "d7": None, "d30": None})
            continue

        # Load all sessions for this cohort's users in one query
        cohort_user_ids = [u[0] for u in cohort_users]
        cohort_sessions = db.query(UserSession.user_id, UserSession.created_at).filter(
            UserSession.user_id.in_(cohort_user_ids)
        ).all()
        sessions_by_user = defaultdict(list)
        for uid, sdt in cohort_sessions:
            sessions_by_user[uid].append(sdt)

        def retention_pct(day_min, day_max):
            retained = 0
            for u_id, u_created in cohort_users:
                window_start = u_created + timedelta(days=day_min)
                window_end = u_created + timedelta(days=day_max)
                if window_end > now:
                    return None
                if any(window_start <= s < window_end for s in sessions_by_user[u_id]):
                    retained += 1
            return round((retained / cohort_size) * 100, 1)

        cohort_retention.append({
            "cohort": cohort_start.strftime("%b %Y"),
            "size": cohort_size,
            "d1": retention_pct(0, 2),
            "d7": retention_pct(6, 9),
            "d30": retention_pct(27, 34),
        })

    # ── Funnel (jobs table as proxy) ──────────────────────────────────────────
    # Unique users who have done each action
    users_with_any_job = db.query(func.count(func.distinct(Job.user_id))).scalar() or 0
    users_applied = db.query(func.count(func.distinct(Job.user_id))).filter(
        Job.status.in_([JobStatus.APPLIED, JobStatus.INTERVIEW, JobStatus.OFFER])
    ).scalar() or 0
    users_interview = db.query(func.count(func.distinct(Job.user_id))).filter(
        Job.status.in_([JobStatus.INTERVIEW, JobStatus.OFFER])
    ).scalar() or 0
    users_offer = db.query(func.count(func.distinct(Job.user_id))).filter(
        Job.status == JobStatus.OFFER
    ).scalar() or 0

    return {
        "users": {
            "total": total_users,
            "free": free_users,
            "pro": pro_users,
            "active_subscriptions": active_subs,
            "new_today": new_today,
            "new_week": new_week,
            "new_month": new_month,
            "with_skills": with_skills,
            "with_role": with_role,
            "monthly_signups": monthly_signups,
        },
        "jobs": {
            "total": total_jobs,
            "by_status": jobs_by_status,
            "avg_match_score": avg_match,
            "with_cover_letter": with_cover_letter,
            "with_match_score": with_match_score,
            "this_month": jobs_this_month,
        },
        "applications": {
            "total": total_apps,
            "by_status": apps_by_status,
            "avg_time_to_apply_days": round(float(avg_time_to_apply), 1) if avg_time_to_apply else None,
            "avg_time_to_interview_days": round(float(avg_time_to_interview), 1) if avg_time_to_interview else None,
            "avg_time_to_offer_days": round(float(avg_time_to_offer), 1) if avg_time_to_offer else None,
        },
        "alerts": {
            "total": total_alerts,
            "active": active_alerts,
        },
        "ingest": {
            "total_jobs": total_ingest_jobs,
            "new_today": ingest_today,
            "new_week": ingest_week,
            "by_source": ingest_by_source,
            "by_status": ingest_by_status,
            "total_events": total_events,
            "processed_events": processed_events,
            "failed_events": failed_events,
        },
        "ai_usage": {
            "total_calls": ai_total_calls,
            "total_tokens_in": int(ai_total_tokens_in),
            "total_tokens_out": int(ai_total_tokens_out),
            "total_cost_usd": round(float(ai_total_cost), 4),
            "by_feature": ai_by_feature,
            "by_model": ai_by_model,
            "daily": ai_daily,
        },
        "retention": {
            "dau": dau,
            "wau": wau,
            "mau": mau,
            "trend": dau_wau_mau_trend,
            "cohorts": cohort_retention,
        },
        "funnel": {
            "total_users": total_users,
            "users_with_profile": with_skills,
            "users_tracking_jobs": users_with_any_job,
            "users_applied": users_applied,
            "users_interview": users_interview,
            "users_offer": users_offer,
            "users_upgraded": pro_users,
        },
        "generated_at": now.isoformat(),
    }


@router.get("/users/list")
def admin_users_list(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Return paginated user list for admin."""
    users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "target_role": u.target_role,
            "subscription_tier": u.subscription_tier,
            "subscription_status": u.subscription_status,
            "skills_count": len(u.skills_list) if u.skills else 0,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/users/detail")
def admin_users_detail(
    limit: int = 100,
    offset: int = 0,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Return rich per-user details with AI token usage, job counts and last login."""
    query = db.query(User)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.email.ilike(like)) | (User.full_name.ilike(like)) | (User.target_role.ilike(like))
        )
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    # AI totals per user
    ai_totals: dict = {}
    for row in db.query(
        AIUsageLog.user_id,
        func.coalesce(func.sum(AIUsageLog.tokens_in + AIUsageLog.tokens_out), 0),
        func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0),
        func.count(AIUsageLog.id),
    ).group_by(AIUsageLog.user_id).all():
        ai_totals[row[0]] = {
            "tokens": int(row[1]),
            "cost_usd": round(float(row[2]), 6),
            "calls": row[3],
        }

    # AI breakdown per user per feature
    ai_by_feature: dict = {}
    for row in db.query(
        AIUsageLog.user_id,
        AIUsageLog.feature,
        func.coalesce(func.sum(AIUsageLog.tokens_in + AIUsageLog.tokens_out), 0),
        func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0),
        func.count(AIUsageLog.id),
    ).group_by(AIUsageLog.user_id, AIUsageLog.feature).all():
        ai_by_feature.setdefault(row[0], []).append({
            "feature": row[1],
            "tokens": int(row[2]),
            "cost_usd": round(float(row[3]), 6),
            "calls": row[4],
        })

    # Job counts per user
    job_counts: dict = dict(
        db.query(Job.user_id, func.count(Job.id)).group_by(Job.user_id).all()
    )

    # Job status breakdown per user
    job_by_status_raw = db.query(
        Job.user_id, Job.status, func.count(Job.id)
    ).group_by(Job.user_id, Job.status).all()
    job_by_status: dict = {}
    for row in job_by_status_raw:
        uid, st, cnt = row
        status_str = str(st.value if hasattr(st, "value") else st)
        job_by_status.setdefault(uid, {})[status_str] = cnt

    # Last login per user
    last_login: dict = dict(
        db.query(UserSession.user_id, func.max(UserSession.created_at))
        .group_by(UserSession.user_id).all()
    )

    result = []
    for u in users:
        ai = ai_totals.get(u.id, {"tokens": 0, "cost_usd": 0.0, "calls": 0})
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "joined_at": u.created_at.isoformat() if u.created_at else None,
            "is_verified": u.is_verified,
            "subscription_tier": u.subscription_tier,
            "subscription_status": u.subscription_status,
            "target_role": u.target_role,
            "years_of_experience": u.years_of_experience,
            "skills": u.skills_list,
            "skills_count": len(u.skills_list),
            "location_preference": u.location_preference,
            "work_mode_preference": str(u.work_mode_preference.value) if u.work_mode_preference else None,
            "min_salary_preference": u.min_salary_preference,
            "max_salary_preference": u.max_salary_preference,
            "industry_preference": u.industry_preference,
            "job_type_preference": u.job_type_preference,
            "availability": u.availability,
            "has_resume": bool(u.resume_filename),
            "linkedin_connected": bool(u.linkedin_li_at),
            "jobs_total": job_counts.get(u.id, 0),
            "jobs_by_status": job_by_status.get(u.id, {}),
            "last_login_at": last_login.get(u.id).isoformat() if last_login.get(u.id) else None,
            "ai": {
                "total_tokens": ai["tokens"],
                "total_cost_usd": ai["cost_usd"],
                "total_calls": ai["calls"],
                "by_feature": ai_by_feature.get(u.id, []),
            },
        })

    total_q = db.query(func.count(User.id))
    if search:
        like = f"%{search}%"
        total_q = total_q.filter(
            (User.email.ilike(like)) | (User.full_name.ilike(like)) | (User.target_role.ilike(like))
        )
    total = total_q.scalar() or 0

    return {"users": result, "total": total}


# ── Behavior / user-event analytics (JWT-based, admin emails only) ────────────

@router.get("/behavior/summary")
def behavior_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin_user),
):
    """Aggregated behavior stats: event counts, top pages, daily trend."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Events by type
    by_event = dict(
        db.query(UserEvent.event, func.count(UserEvent.id))
        .filter(UserEvent.created_at >= cutoff)
        .group_by(UserEvent.event)
        .order_by(func.count(UserEvent.id).desc())
        .all()
    )

    # Events by page
    by_page = dict(
        db.query(UserEvent.page, func.count(UserEvent.id))
        .filter(UserEvent.created_at >= cutoff, UserEvent.page.isnot(None))
        .group_by(UserEvent.page)
        .order_by(func.count(UserEvent.id).desc())
        .all()
    )

    # Unique active users in window
    active_users = db.query(func.count(func.distinct(UserEvent.user_id))).filter(
        UserEvent.created_at >= cutoff
    ).scalar() or 0

    # Daily event counts (last `days` days)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily = []
    for i in range(days - 1, -1, -1):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = db.query(func.count(UserEvent.id)).filter(
            UserEvent.created_at >= day_start,
            UserEvent.created_at < day_end,
        ).scalar() or 0
        daily.append({"day": day_start.strftime("%b %d"), "events": count})

    # Feature adoption: unique users per event type
    adoption = [
        {"event": row[0], "unique_users": row[1]}
        for row in db.query(UserEvent.event, func.count(func.distinct(UserEvent.user_id)))
        .filter(UserEvent.created_at >= cutoff)
        .group_by(UserEvent.event)
        .order_by(func.count(func.distinct(UserEvent.user_id)).desc())
        .all()
    ]

    return {
        "active_users": active_users,
        "total_events": sum(by_event.values()),
        "by_event": by_event,
        "by_page": by_page,
        "daily": daily,
        "feature_adoption": adoption,
        "days": days,
    }


@router.get("/behavior/stream")
def behavior_stream(
    limit: int = 100,
    event: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin_user),
):
    """Recent event stream with user info."""
    q = db.query(UserEvent, User.email, User.full_name).outerjoin(
        User, UserEvent.user_id == User.id
    )
    if event:
        q = q.filter(UserEvent.event == event)
    rows = q.order_by(UserEvent.created_at.desc()).limit(limit).all()

    return [
        {
            "id": ev.id,
            "event": ev.event,
            "page": ev.page,
            "properties": _json.loads(ev.properties or "{}"),
            "session_id": ev.session_id,
            "created_at": ev.created_at.isoformat(),
            "user_email": email,
            "user_name": name,
        }
        for ev, email, name in rows
    ]


@router.get("/behavior/per-user")
def behavior_per_user(
    days: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(verify_admin_user),
):
    """Per-user event counts and last seen, sorted by activity."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            UserEvent.user_id,
            User.email,
            User.full_name,
            func.count(UserEvent.id).label("event_count"),
            func.max(UserEvent.created_at).label("last_seen"),
        )
        .outerjoin(User, UserEvent.user_id == User.id)
        .filter(UserEvent.created_at >= cutoff)
        .group_by(UserEvent.user_id, User.email, User.full_name)
        .order_by(func.count(UserEvent.id).desc())
        .limit(50)
        .all()
    )
    return [
        {
            "user_id": r.user_id,
            "email": r.email,
            "name": r.full_name,
            "event_count": r.event_count,
            "last_seen": r.last_seen.isoformat() if r.last_seen else None,
        }
        for r in rows
    ]


# ── User Analytics (registration funnel + behavior) ──────────────────────────

@router.get("/user-analytics")
def get_user_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_user),
):
    """
    Aggregated user-behavior analytics.
    Uses a mix of new event tracking + historical data already in the DB.
    """
    now = datetime.utcnow()

    # ── Registration Funnel ───────────────────────────────────────────────
    # New tracking events (fires from Register.jsx after latest deploy)
    funnel_steps = [
        ("registration_start",           "Visited Register"),
        ("registration_field_email",     "Filled Email"),
        ("registration_field_password",  "Filled Password"),
        ("registration_submit_attempt",  "Clicked Submit"),
        ("registration_complete",        "Completed"),
    ]
    funnel = []
    for event_name, label in funnel_steps:
        count = db.query(func.count(UserEvent.id)).filter(
            UserEvent.event == event_name
        ).scalar() or 0
        funnel.append({"event": event_name, "label": label, "count": count})

    # Total registered users is always the authoritative "completed" count
    total_users = db.query(func.count(User.id)).scalar() or 0
    funnel[-1]["count"] = total_users  # always use real user count for "Completed"
    # If new tracking not yet live, use total_users as proxy for start too
    if funnel[0]["count"] == 0:
        funnel[0]["count"] = total_users

    # ── Average registration duration (from new tracking) ─────────────────
    complete_events = db.query(UserEvent).filter(
        UserEvent.event == "registration_complete",
        UserEvent.properties.isnot(None),
    ).all()
    durations = []
    for ev in complete_events:
        try:
            props = _json.loads(ev.properties or "{}")
            d = props.get("duration_seconds")
            if d and isinstance(d, (int, float)) and 0 < d < 3600:
                durations.append(d)
        except Exception:
            pass
    avg_registration_seconds = round(sum(durations) / len(durations)) if durations else None

    # ── Signup trend — last 30 days from User table (historical) ──────────
    cutoff_30 = now - timedelta(days=30)
    signup_rows = (
        db.query(
            func.date(User.created_at).label("day"),
            func.count(User.id).label("count"),
        )
        .filter(User.created_at >= cutoff_30)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )
    signups_by_day = [
        {"date": str(r.day), "count": r.count} for r in signup_rows
    ]

    # ── Profile completion after registration (from User table) ───────────
    with_role = db.query(func.count(User.id)).filter(User.target_role.isnot(None), User.target_role != "").scalar() or 0
    with_skills = db.query(func.count(User.id)).filter(User.skills.isnot(None), User.skills != "").scalar() or 0
    with_resume = db.query(func.count(User.id)).filter(User.resume_content.isnot(None)).scalar() or 0
    profile_completion = {
        "total_users": total_users,
        "with_role": with_role,
        "with_skills": with_skills,
        "with_resume": with_resume,
    }

    # ── First page after registration ─────────────────────────────────────
    # Primary: match registration_complete session → next page_view
    complete_sessions = db.query(UserEvent.session_id, UserEvent.created_at).filter(
        UserEvent.event == "registration_complete",
        UserEvent.session_id.isnot(None),
    ).all()
    first_page_counts: dict = defaultdict(int)
    for sess_id, completed_at in complete_sessions:
        first_pv = (
            db.query(UserEvent)
            .filter(
                UserEvent.session_id == sess_id,
                UserEvent.event == "page_view",
                UserEvent.created_at > completed_at,
            )
            .order_by(UserEvent.created_at)
            .first()
        )
        if first_pv:
            first_page_counts[first_pv.page] += 1

    # Historical fallback: first page_view event per user ever recorded
    if not first_page_counts:
        # Subquery: earliest page_view created_at per user
        first_pv_subq = (
            db.query(
                UserEvent.user_id,
                func.min(UserEvent.created_at).label("min_at"),
            )
            .filter(
                UserEvent.event == "page_view",
                UserEvent.user_id.isnot(None),
            )
            .group_by(UserEvent.user_id)
            .subquery()
        )
        first_pv_rows = (
            db.query(UserEvent.page, func.count(UserEvent.id).label("c"))
            .join(
                first_pv_subq,
                (UserEvent.user_id == first_pv_subq.c.user_id)
                & (UserEvent.created_at == first_pv_subq.c.min_at),
            )
            .filter(UserEvent.event == "page_view")
            .group_by(UserEvent.page)
            .order_by(func.count(UserEvent.id).desc())
            .limit(8)
            .all()
        )
        first_page_counts = {r.page: r.c for r in first_pv_rows}

    # ── Average time per page ─────────────────────────────────────────────
    # Primary: explicit page_time events (new tracking)
    page_time_events = db.query(UserEvent).filter(
        UserEvent.event == "page_time",
        UserEvent.properties.isnot(None),
    ).all()
    page_buckets: dict = defaultdict(list)
    for ev in page_time_events:
        try:
            props = _json.loads(ev.properties or "{}")
            secs = props.get("seconds")
            if secs and isinstance(secs, (int, float)) and 0 < secs < 3600:
                page_buckets[ev.page].append(secs)
        except Exception:
            pass

    # Historical fallback: infer from time between consecutive page_view events
    if not page_buckets:
        all_pv = (
            db.query(UserEvent)
            .filter(
                UserEvent.event == "page_view",
                UserEvent.session_id.isnot(None),
            )
            .order_by(UserEvent.session_id, UserEvent.created_at)
            .all()
        )
        for i in range(len(all_pv) - 1):
            curr, nxt = all_pv[i], all_pv[i + 1]
            if curr.session_id == nxt.session_id:
                delta = (nxt.created_at - curr.created_at).total_seconds()
                if 5 < delta < 600:  # 5 s–10 min window to filter noise
                    page_buckets[curr.page].append(delta)

    avg_time_per_page = {
        page: round(sum(times) / len(times))
        for page, times in page_buckets.items()
        if len(times) >= 2  # need at least 2 data points
    }

    # ── Top navigation flows ──────────────────────────────────────────────
    pv_events = (
        db.query(UserEvent)
        .filter(
            UserEvent.event == "page_view",
            UserEvent.session_id.isnot(None),
            UserEvent.created_at >= cutoff_30,
        )
        .order_by(UserEvent.session_id, UserEvent.created_at)
        .all()
    )
    session_pages: dict = defaultdict(list)
    for ev in pv_events:
        pages = session_pages[ev.session_id]
        if not pages or pages[-1] != ev.page:
            pages.append(ev.page)

    sequence_counts: dict = defaultdict(int)
    for pages in session_pages.values():
        for i in range(len(pages) - 1):
            sequence_counts[f"{pages[i]} → {pages[i+1]}"] += 1

    top_flows = sorted(sequence_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "funnel": funnel,
        "total_users": total_users,
        "avg_registration_seconds": avg_registration_seconds,
        "signups_by_day": signups_by_day,
        "profile_completion": profile_completion,
        "first_page_after_registration": dict(
            sorted(first_page_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        ),
        "avg_time_per_page_seconds": avg_time_per_page,
        "top_flows": [{"path": k, "count": v} for k, v in top_flows],
    }
