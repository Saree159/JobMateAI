"""
Notifications API router.
Handles email notification preferences and sending reminders.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.models import User, Job
from app.routers.users import get_current_user
from app.services.notifications import email_service


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.post("/send-test")
async def send_test_notification(
    notification_type: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a test notification email.
    
    Types: interview_reminder, follow_up, deadline
    """
    if notification_type == "interview_reminder":
        success = email_service.send_interview_reminder(
            user_email=current_user.email,
            user_name=current_user.full_name or "User",
            job_title="Senior Software Engineer",
            company="Tech Corp",
            interview_date=datetime.now() + timedelta(days=1)
        )
    elif notification_type == "follow_up":
        success = email_service.send_follow_up_reminder(
            user_email=current_user.email,
            user_name=current_user.full_name or "User",
            job_title="Senior Software Engineer",
            company="Tech Corp",
            days_since_applied=7
        )
    elif notification_type == "deadline":
        success = email_service.send_deadline_reminder(
            user_email=current_user.email,
            user_name=current_user.full_name or "User",
            job_title="Senior Software Engineer",
            company="Tech Corp",
            deadline_date=datetime.now() + timedelta(days=3)
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid notification type")
    
    return {
        "success": success,
        "message": "Test notification sent" if success else "SMTP not configured. Check backend logs.",
        "email": current_user.email,
        "type": notification_type
    }


@router.post("/jobs/{job_id}/send-reminder")
async def send_job_reminder(
    job_id: int,
    reminder_type: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a notification reminder for a specific job.
    
    Types: interview, follow_up
    """
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if reminder_type == "interview":
        if not job.interview_date:
            raise HTTPException(status_code=400, detail="No interview date set for this job")
        
        success = email_service.send_interview_reminder(
            user_email=current_user.email,
            user_name=current_user.full_name or "User",
            job_title=job.title,
            company=job.company,
            interview_date=job.interview_date
        )
    elif reminder_type == "follow_up":
        if not job.applied_date:
            raise HTTPException(status_code=400, detail="No application date set for this job")
        
        days_since = (datetime.now() - job.applied_date).days
        success = email_service.send_follow_up_reminder(
            user_email=current_user.email,
            user_name=current_user.full_name or "User",
            job_title=job.title,
            company=job.company,
            days_since_applied=days_since
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid reminder type")
    
    return {
        "success": success,
        "message": "Reminder sent" if success else "SMTP not configured",
        "job_title": job.title,
        "company": job.company,
        "type": reminder_type
    }
