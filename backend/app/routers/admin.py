"""
Admin statistics router.
Returns aggregated real data for the HireMatrix admin dashboard.
All endpoints require the X-Admin-Key header to match settings.admin_api_key.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

from app.database import get_db
from app.models import User, Job, JobStatus, JobAlert, Application, IngestJob, IngestEvent, AIUsageLog, UserSession
from app.config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])


def verify_admin(x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")):
    """Dependency: reject requests that don't carry the correct admin key."""
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin key",
        )


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

    # Monthly signups — last 7 months
    monthly_signups = []
    for i in range(6, -1, -1):
        m_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        if i > 0:
            m_end = (now.replace(day=1) - timedelta(days=(i - 1) * 30)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
        else:
            m_end = now
        count = db.query(func.count(User.id)).filter(
            User.created_at >= m_start, User.created_at < m_end
        ).scalar() or 0
        monthly_signups.append({"month": m_start.strftime("%b"), "signups": count})

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

    # Daily cost — last 30 days
    ai_daily = []
    for i in range(29, -1, -1):
        day_start = (today_start - timedelta(days=i))
        day_end = day_start + timedelta(days=1)
        cost = db.query(func.coalesce(func.sum(AIUsageLog.cost_usd), 0.0)).filter(
            AIUsageLog.created_at >= day_start,
            AIUsageLog.created_at < day_end,
        ).scalar() or 0.0
        tokens = db.query(func.coalesce(func.sum(AIUsageLog.tokens_in + AIUsageLog.tokens_out), 0)).filter(
            AIUsageLog.created_at >= day_start,
            AIUsageLog.created_at < day_end,
        ).scalar() or 0
        ai_daily.append({
            "day": day_start.strftime("%b %d"),
            "cost": round(float(cost), 4),
            "tokens": int(tokens),
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

    # DAU/WAU/MAU trend — last 7 months
    dau_wau_mau_trend = []
    for i in range(6, -1, -1):
        m_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        mau_count = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            UserSession.created_at >= m_start, UserSession.created_at < m_end
        ).scalar() or 0
        # WAU: last week of the month as proxy
        wau_start = m_end - timedelta(days=7)
        wau_count = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            UserSession.created_at >= wau_start, UserSession.created_at < m_end
        ).scalar() or 0
        # DAU: last day of month as proxy
        dau_start = m_end - timedelta(days=1)
        dau_count = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            UserSession.created_at >= dau_start, UserSession.created_at < m_end
        ).scalar() or 0
        dau_wau_mau_trend.append({
            "month": m_start.strftime("%b"),
            "dau": dau_count,
            "wau": wau_count,
            "mau": mau_count,
        })

    # Cohort retention — signup month cohorts, D1/D7/D30 retention
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

        def retention_pct(day_min, day_max):
            if cohort_size == 0:
                return None
            retained = 0
            for u_id, u_created in cohort_users:
                window_start = u_created + timedelta(days=day_min)
                window_end = u_created + timedelta(days=day_max)
                if window_end > now:
                    return None  # Not enough time has passed — mark as pending
                has_session = db.query(UserSession.id).filter(
                    UserSession.user_id == u_id,
                    UserSession.created_at >= window_start,
                    UserSession.created_at < window_end,
                ).first()
                if has_session:
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
