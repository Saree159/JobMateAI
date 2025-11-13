"""
Job API router.
Handles job CRUD operations, match scoring, and cover letter generation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import User, Job, JobStatus
from app.schemas import JobCreate, JobUpdate, JobResponse, MatchScoreResponse, CoverLetterResponse
from app.services.ai import calculate_match_score, generate_cover_letter


router = APIRouter(prefix="/api", tags=["jobs"])


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

