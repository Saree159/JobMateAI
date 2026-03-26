"""
Pydantic schemas for request validation and response serialization.
These define the API contract for the frontend.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class WorkModePreference(str, Enum):
    """Work mode preferences."""
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class JobStatus(str, Enum):
    """Job application statuses."""
    SAVED = "saved"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


# User Schemas
class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr
    full_name: Optional[str] = None
    target_role: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[List[str]] = []
    location_preference: Optional[str] = None
    work_mode_preference: Optional[WorkModePreference] = WorkModePreference.REMOTE
    min_salary_preference: Optional[int] = None
    max_salary_preference: Optional[int] = None
    industry_preference: Optional[str] = None
    job_type_preference: Optional[str] = None
    availability: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """Schema for updating a user profile."""
    full_name: Optional[str] = None
    target_role: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    location_preference: Optional[str] = None
    work_mode_preference: Optional[WorkModePreference] = None
    min_salary_preference: Optional[int] = None
    max_salary_preference: Optional[int] = None
    industry_preference: Optional[str] = None
    job_type_preference: Optional[str] = None
    availability: Optional[str] = None
    subscription_tier: Optional[str] = None
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[datetime] = None
    paypal_payer_id: Optional[str] = None
    paypal_subscription_id: Optional[str] = None
    linkedin_li_at: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user responses."""
    id: int
    subscription_tier: str = "free"
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[datetime] = None
    linkedin_connected: bool = False  # True when li_at token is set
    resume_filename: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('skills', mode='before')
    @classmethod
    def parse_skills(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(',') if s.strip()]
        return v or []

    class Config:
        from_attributes = True


# Job Schemas
class JobBase(BaseModel):
    """Base job fields."""
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = None
    description: str = Field(..., min_length=1)
    apply_url: Optional[str] = None


class JobCreate(JobBase):
    """Schema for creating a new job."""
    # Optional link to the IngestJob this was saved from
    ingest_job_id: Optional[int] = None


class JobUpdate(BaseModel):
    """Schema for updating a job."""
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    apply_url: Optional[str] = None
    status: Optional[JobStatus] = None
    notes: Optional[str] = None
    applied_date: Optional[datetime] = None
    interview_date: Optional[datetime] = None


class JobResponse(JobBase):
    """Schema for job responses."""
    id: int
    user_id: int
    ingest_job_id: Optional[int] = None  # Source feed job, if any
    match_score: Optional[float] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[datetime] = None
    interview_date: Optional[datetime] = None
    status: JobStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# AI Service Schemas
class MatchScoreResponse(BaseModel):
    """Response for match score calculation."""
    job_id: int
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]


class CoverLetterResponse(BaseModel):
    """Response for cover letter generation."""
    job_id: int
    cover_letter: str


# Auth Schemas
class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""
    email: Optional[str] = None


# Job Alert Schemas
class AlertFrequency(str, Enum):
    """Alert frequency options."""
    IMMEDIATE = "immediate"
    DAILY = "daily"
    WEEKLY = "weekly"


class JobAlertBase(BaseModel):
    """Base job alert fields."""
    keywords: str = Field(..., min_length=1, max_length=500)
    location: Optional[str] = None
    min_match_score: int = Field(default=70, ge=0, le=100)
    frequency: AlertFrequency = AlertFrequency.DAILY


class JobAlertCreate(JobAlertBase):
    """Schema for creating a new job alert."""
    pass


class JobAlertUpdate(BaseModel):
    """Schema for updating a job alert."""
    keywords: Optional[str] = None
    location: Optional[str] = None
    min_match_score: Optional[int] = Field(default=None, ge=0, le=100)
    frequency: Optional[AlertFrequency] = None
    is_active: Optional[bool] = None


class JobAlertResponse(JobAlertBase):
    """Schema for job alert responses."""
    id: int
    user_id: int
    is_active: bool
    last_checked: Optional[datetime] = None
    last_notified: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Analytics Schemas
class ApplicationStats(BaseModel):
    """Application statistics for analytics."""
    total_applications: int
    by_status: dict  # {status: count}
    success_rate: float  # Percentage of offers
    avg_match_score: Optional[float] = None
    avg_time_to_interview: Optional[float] = None  # Days
    avg_time_to_offer: Optional[float] = None  # Days


class MonthlyTrend(BaseModel):
    """Monthly application trends."""
    month: str  # YYYY-MM
    applications: int
    interviews: int
    offers: int
    rejections: int


class AnalyticsDashboard(BaseModel):
    """Complete analytics dashboard data."""
    stats: ApplicationStats
    monthly_trends: List[MonthlyTrend]
    match_score_distribution: dict  # {range: count} e.g. {"0-20": 5, "21-40": 10}
    top_companies: List[dict]  # [{company: str, count: int}]
    status_funnel: dict  # Conversion rates between stages


# Ingestion Schemas
class IngestJobItem(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    raw: Optional[dict] = None


class IngestEmailRequest(BaseModel):
    source: str
    runId: Optional[str] = None
    email: dict
    jobs: List[IngestJobItem]


class IngestEmailResponse(BaseModel):
    emailId: str
    alreadyProcessed: bool
    inserted: int
    updated: int
    skipped: int


# Feed job API schemas
class FeedJobStatus(str, Enum):
    new = "new"
    saved = "saved"
    applied = "applied"
    ignored = "ignored"


class FeedJobResponse(BaseModel):
    id: int
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    status: FeedJobStatus
    firstSeenAt: datetime = Field(alias="first_seen_at")
    lastSeenAt: datetime = Field(alias="last_seen_at")
    source: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class StatusUpdateRequest(BaseModel):
    status: FeedJobStatus
