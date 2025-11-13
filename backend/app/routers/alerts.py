"""
Job Alerts API Router
Handles CRUD operations for job alerts and background checking.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.models import JobAlert, User, Job
from app.schemas import JobAlertCreate, JobAlertUpdate, JobAlertResponse
from app.routers.users import get_current_user
from app.services.notifications import EmailNotificationService
from app.services.ai import calculate_match_score

router = APIRouter(prefix="/api/alerts", tags=["Job Alerts"])


@router.post("", response_model=JobAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_job_alert(
    alert: JobAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new job alert for the current user.
    User will receive notifications when jobs matching criteria are found.
    """
    # Create new alert
    db_alert = JobAlert(
        user_id=current_user.id,
        keywords=alert.keywords,
        location=alert.location,
        min_match_score=alert.min_match_score,
        frequency=alert.frequency,
        is_active=1
    )
    
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    # Convert is_active to boolean for response
    response_data = JobAlertResponse.model_validate(db_alert)
    response_data.is_active = bool(db_alert.is_active)
    
    return response_data


@router.get("", response_model=List[JobAlertResponse])
async def get_job_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all job alerts for the current user.
    """
    alerts = db.query(JobAlert).filter(JobAlert.user_id == current_user.id).all()
    
    # Convert is_active to boolean for each alert
    result = []
    for alert in alerts:
        response = JobAlertResponse.model_validate(alert)
        response.is_active = bool(alert.is_active)
        result.append(response)
    
    return result


@router.get("/{alert_id}", response_model=JobAlertResponse)
async def get_job_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific job alert by ID.
    """
    alert = db.query(JobAlert).filter(
        JobAlert.id == alert_id,
        JobAlert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Job alert not found")
    
    response = JobAlertResponse.model_validate(alert)
    response.is_active = bool(alert.is_active)
    
    return response


@router.put("/{alert_id}", response_model=JobAlertResponse)
async def update_job_alert(
    alert_id: int,
    alert_update: JobAlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a job alert.
    """
    db_alert = db.query(JobAlert).filter(
        JobAlert.id == alert_id,
        JobAlert.user_id == current_user.id
    ).first()
    
    if not db_alert:
        raise HTTPException(status_code=404, detail="Job alert not found")
    
    # Update fields
    update_data = alert_update.model_dump(exclude_unset=True)
    
    # Convert is_active boolean to integer for database
    if "is_active" in update_data:
        update_data["is_active"] = 1 if update_data["is_active"] else 0
    
    for field, value in update_data.items():
        setattr(db_alert, field, value)
    
    db.commit()
    db.refresh(db_alert)
    
    response = JobAlertResponse.model_validate(db_alert)
    response.is_active = bool(db_alert.is_active)
    
    return response


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a job alert.
    """
    db_alert = db.query(JobAlert).filter(
        JobAlert.id == alert_id,
        JobAlert.user_id == current_user.id
    ).first()
    
    if not db_alert:
        raise HTTPException(status_code=404, detail="Job alert not found")
    
    db.delete(db_alert)
    db.commit()
    
    return None


@router.post("/{alert_id}/check", response_model=dict)
async def check_alert_now(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger a check for this alert (for testing).
    Returns matching jobs found.
    """
    alert = db.query(JobAlert).filter(
        JobAlert.id == alert_id,
        JobAlert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Job alert not found")
    
    # Find matching jobs (simple keyword matching for now)
    keywords = alert.keywords_list
    all_jobs = db.query(Job).filter(Job.user_id != current_user.id).all()  # Jobs from other users (simulated job board)
    
    matching_jobs = []
    for job in all_jobs:
        # Check if any keyword matches job title or description
        job_text = f"{job.title} {job.description}".lower()
        if any(keyword.lower() in job_text for keyword in keywords):
            # Check match score if we have user skills
            if current_user.skills:
                match_result = await calculate_match_score(
                    user_skills=current_user.skills_list,
                    job_description=job.description,
                    job_title=job.title
                )
                
                if match_result["match_score"] >= alert.min_match_score:
                    matching_jobs.append({
                        "id": job.id,
                        "title": job.title,
                        "company": job.company,
                        "match_score": match_result["match_score"]
                    })
            else:
                matching_jobs.append({
                    "id": job.id,
                    "title": job.title,
                    "company": job.company,
                    "match_score": None
                })
    
    # Update last_checked
    alert.last_checked = datetime.utcnow()
    db.commit()
    
    return {
        "alert_id": alert_id,
        "keywords": keywords,
        "min_match_score": alert.min_match_score,
        "matching_jobs_found": len(matching_jobs),
        "jobs": matching_jobs[:5]  # Return top 5
    }


@router.post("/check-all", response_model=dict)
async def check_all_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check all active alerts for the current user.
    This would typically be called by a background job scheduler.
    """
    alerts = db.query(JobAlert).filter(
        JobAlert.user_id == current_user.id,
        JobAlert.is_active == 1
    ).all()
    
    if not alerts:
        return {"message": "No active alerts to check"}
    
    total_matches = 0
    checked_alerts = []
    
    for alert in alerts:
        # Check if we should notify based on frequency
        should_check = False
        
        if alert.frequency == "immediate":
            should_check = True
        elif alert.frequency == "daily":
            if not alert.last_checked or \
               (datetime.utcnow() - alert.last_checked) >= timedelta(days=1):
                should_check = True
        elif alert.frequency == "weekly":
            if not alert.last_checked or \
               (datetime.utcnow() - alert.last_checked) >= timedelta(days=7):
                should_check = True
        
        if should_check:
            # Simplified matching (in production, integrate with real job board API)
            keywords = alert.keywords_list
            all_jobs = db.query(Job).filter(Job.user_id != current_user.id).limit(100).all()
            
            matches = 0
            for job in all_jobs:
                job_text = f"{job.title} {job.description}".lower()
                if any(keyword.lower() in job_text for keyword in keywords):
                    matches += 1
            
            total_matches += matches
            alert.last_checked = datetime.utcnow()
            
            if matches > 0:
                alert.last_notified = datetime.utcnow()
                
                # Send email notification
                email_service = EmailNotificationService()
                try:
                    email_service.send_job_alert(
                        user_email=current_user.email,
                        user_name=current_user.full_name or current_user.email,
                        keywords=alert.keywords,
                        matches_found=matches,
                        alert_url=f"http://localhost:5173/jobs"  # Update with your frontend URL
                    )
                except Exception as e:
                    print(f"Failed to send email: {e}")
            
            checked_alerts.append({
                "alert_id": alert.id,
                "keywords": alert.keywords,
                "matches": matches
            })
    
    db.commit()
    
    return {
        "checked": len(checked_alerts),
        "total_matches": total_matches,
        "alerts": checked_alerts
    }
