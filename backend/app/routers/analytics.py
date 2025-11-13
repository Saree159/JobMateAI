"""
Analytics API Router
Provides analytics and insights on job applications.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Dict, List
from datetime import datetime, timedelta
from collections import defaultdict

from app.database import get_db
from app.models import User, Job, Application, JobStatus
from app.schemas import AnalyticsDashboard, ApplicationStats, MonthlyTrend
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics dashboard for the current user.
    Includes stats, trends, and insights.
    """
    # Get all jobs for user
    jobs = db.query(Job).filter(Job.user_id == current_user.id).all()
    
    if not jobs:
        # Return empty dashboard
        return AnalyticsDashboard(
            stats=ApplicationStats(
                total_applications=0,
                by_status={},
                success_rate=0.0,
                avg_match_score=None,
                avg_time_to_interview=None,
                avg_time_to_offer=None
            ),
            monthly_trends=[],
            match_score_distribution={},
            top_companies=[],
            status_funnel={}
        )
    
    # Calculate application stats
    total_apps = len(jobs)
    by_status = {}
    
    for status in JobStatus:
        count = sum(1 for job in jobs if job.status == status.value)
        if count > 0:
            by_status[status.value] = count
    
    # Calculate success rate (offers / total applications)
    offers = by_status.get("offer", 0)
    success_rate = (offers / total_apps * 100) if total_apps > 0 else 0.0
    
    # Calculate average match score
    match_scores = [job.match_score for job in jobs if job.match_score is not None]
    avg_match_score = sum(match_scores) / len(match_scores) if match_scores else None
    
    # Calculate time metrics (simplified - using created_at differences)
    interviews = [job for job in jobs if job.status in ["interview", "offer"]]
    avg_time_to_interview = None
    if interviews:
        times = []
        for job in interviews:
            if job.applied_date and job.interview_date:
                days = (job.interview_date - job.applied_date).days
                if days >= 0:
                    times.append(days)
        avg_time_to_interview = sum(times) / len(times) if times else None
    
    offer_jobs = [job for job in jobs if job.status == "offer"]
    avg_time_to_offer = None
    if offer_jobs:
        times = []
        for job in offer_jobs:
            if job.applied_date and job.updated_at:
                days = (job.updated_at - job.applied_date).days
                if days >= 0:
                    times.append(days)
        avg_time_to_offer = sum(times) / len(times) if times else None
    
    stats = ApplicationStats(
        total_applications=total_apps,
        by_status=by_status,
        success_rate=round(success_rate, 2),
        avg_match_score=round(avg_match_score, 2) if avg_match_score else None,
        avg_time_to_interview=round(avg_time_to_interview, 1) if avg_time_to_interview else None,
        avg_time_to_offer=round(avg_time_to_offer, 1) if avg_time_to_offer else None
    )
    
    # Calculate monthly trends (last 6 months)
    monthly_data = defaultdict(lambda: {
        "applications": 0,
        "interviews": 0,
        "offers": 0,
        "rejections": 0
    })
    
    for job in jobs:
        month_key = job.created_at.strftime("%Y-%m")
        monthly_data[month_key]["applications"] += 1
        
        if job.status == "interview":
            monthly_data[month_key]["interviews"] += 1
        elif job.status == "offer":
            monthly_data[month_key]["offers"] += 1
        elif job.status == "rejected":
            monthly_data[month_key]["rejections"] += 1
    
    # Sort by month and create trend objects
    monthly_trends = []
    for month in sorted(monthly_data.keys(), reverse=True)[:6]:
        data = monthly_data[month]
        monthly_trends.append(MonthlyTrend(
            month=month,
            applications=data["applications"],
            interviews=data["interviews"],
            offers=data["offers"],
            rejections=data["rejections"]
        ))
    
    monthly_trends.reverse()  # Oldest to newest
    
    # Match score distribution
    match_score_dist = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0
    }
    
    for job in jobs:
        if job.match_score is not None:
            score = job.match_score
            if score <= 20:
                match_score_dist["0-20"] += 1
            elif score <= 40:
                match_score_dist["21-40"] += 1
            elif score <= 60:
                match_score_dist["41-60"] += 1
            elif score <= 80:
                match_score_dist["61-80"] += 1
            else:
                match_score_dist["81-100"] += 1
    
    # Top companies
    company_counts = defaultdict(int)
    for job in jobs:
        company_counts[job.company] += 1
    
    top_companies = [
        {"company": company, "count": count}
        for company, count in sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    # Status funnel (conversion rates)
    saved = by_status.get("saved", 0)
    applied = by_status.get("applied", 0) + by_status.get("interview", 0) + by_status.get("offer", 0)
    interview = by_status.get("interview", 0) + by_status.get("offer", 0)
    offer = by_status.get("offer", 0)
    
    status_funnel = {
        "saved": saved,
        "applied": applied,
        "interview": interview,
        "offer": offer,
        "saved_to_applied_rate": round(applied / saved * 100, 1) if saved > 0 else 0,
        "applied_to_interview_rate": round(interview / applied * 100, 1) if applied > 0 else 0,
        "interview_to_offer_rate": round(offer / interview * 100, 1) if interview > 0 else 0
    }
    
    return AnalyticsDashboard(
        stats=stats,
        monthly_trends=monthly_trends,
        match_score_distribution=match_score_dist,
        top_companies=top_companies,
        status_funnel=status_funnel
    )


@router.get("/stats", response_model=ApplicationStats)
async def get_application_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get basic application statistics.
    """
    jobs = db.query(Job).filter(Job.user_id == current_user.id).all()
    
    total_apps = len(jobs)
    by_status = {}
    
    for status in JobStatus:
        count = sum(1 for job in jobs if job.status == status.value)
        if count > 0:
            by_status[status.value] = count
    
    offers = by_status.get("offer", 0)
    success_rate = (offers / total_apps * 100) if total_apps > 0 else 0.0
    
    match_scores = [job.match_score for job in jobs if job.match_score is not None]
    avg_match_score = sum(match_scores) / len(match_scores) if match_scores else None
    
    return ApplicationStats(
        total_applications=total_apps,
        by_status=by_status,
        success_rate=round(success_rate, 2),
        avg_match_score=round(avg_match_score, 2) if avg_match_score else None,
        avg_time_to_interview=None,
        avg_time_to_offer=None
    )


@router.get("/trends/monthly", response_model=List[MonthlyTrend])
async def get_monthly_trends(
    months: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get monthly application trends.
    
    Args:
        months: Number of months to include (default: 6)
    """
    jobs = db.query(Job).filter(Job.user_id == current_user.id).all()
    
    monthly_data = defaultdict(lambda: {
        "applications": 0,
        "interviews": 0,
        "offers": 0,
        "rejections": 0
    })
    
    for job in jobs:
        month_key = job.created_at.strftime("%Y-%m")
        monthly_data[month_key]["applications"] += 1
        
        if job.status == "interview":
            monthly_data[month_key]["interviews"] += 1
        elif job.status == "offer":
            monthly_data[month_key]["offers"] += 1
        elif job.status == "rejected":
            monthly_data[month_key]["rejections"] += 1
    
    trends = []
    for month in sorted(monthly_data.keys(), reverse=True)[:months]:
        data = monthly_data[month]
        trends.append(MonthlyTrend(
            month=month,
            applications=data["applications"],
            interviews=data["interviews"],
            offers=data["offers"],
            rejections=data["rejections"]
        ))
    
    trends.reverse()
    return trends


@router.get("/insights", response_model=Dict)
async def get_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered insights and recommendations based on application data.
    """
    jobs = db.query(Job).filter(Job.user_id == current_user.id).all()
    
    if not jobs:
        return {
            "insights": [],
            "recommendations": ["Start adding jobs to track your applications!"]
        }
    
    insights = []
    recommendations = []
    
    # Analyze match scores
    match_scores = [job.match_score for job in jobs if job.match_score is not None]
    if match_scores:
        avg_score = sum(match_scores) / len(match_scores)
        if avg_score < 60:
            insights.append(f"Your average match score is {avg_score:.1f}%. Consider targeting jobs that better match your skills.")
            recommendations.append("Focus on jobs with 70%+ match scores for better success rates.")
        else:
            insights.append(f"Great job! Your average match score is {avg_score:.1f}%.")
    
    # Analyze application status distribution
    by_status = {}
    for status in JobStatus:
        count = sum(1 for job in jobs if job.status == status.value)
        by_status[status.value] = count
    
    saved = by_status.get("saved", 0)
    applied = by_status.get("applied", 0)
    
    if saved > applied * 2:
        insights.append(f"You have {saved} saved jobs but only {applied} applications submitted.")
        recommendations.append("Convert more saved jobs into applications to increase your chances!")
    
    # Analyze time gaps
    recent_apps = [job for job in jobs if job.applied_date and 
                   (datetime.utcnow() - job.applied_date).days < 14]
    
    if len(recent_apps) == 0 and len(jobs) > 0:
        insights.append("No applications submitted in the last 2 weeks.")
        recommendations.append("Stay active! Apply to at least 2-3 jobs per week.")
    
    # Success rate analysis
    offers = by_status.get("offer", 0)
    total = len(jobs)
    success_rate = (offers / total * 100) if total > 0 else 0
    
    if success_rate > 5:
        insights.append(f"Excellent! Your success rate is {success_rate:.1f}%.")
    elif success_rate > 0:
        insights.append(f"Your success rate is {success_rate:.1f}%. Keep improving!")
        recommendations.append("Request feedback from rejections to improve your applications.")
    
    # Interview performance
    interviews = by_status.get("interview", 0)
    if interviews > 0 and offers == 0:
        insights.append(f"You have {interviews} interviews but no offers yet.")
        recommendations.append("Practice interview skills and use our interview preparation feature!")
    
    return {
        "insights": insights if insights else ["Keep tracking applications to get personalized insights!"],
        "recommendations": recommendations if recommendations else ["You're doing great! Keep applying and stay consistent."]
    }
