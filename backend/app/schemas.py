"""
Pydantic schemas for request validation and response serialization.
These define the API contract for the frontend.
"""
from pydantic import BaseModel, EmailStr, Field
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
    skills: Optional[List[str]] = []
    location_preference: Optional[str] = None
    work_mode_preference: Optional[WorkModePreference] = WorkModePreference.REMOTE


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """Schema for updating a user profile."""
    full_name: Optional[str] = None
    target_role: Optional[str] = None
    skills: Optional[List[str]] = None
    location_preference: Optional[str] = None
    work_mode_preference: Optional[WorkModePreference] = None


class UserResponse(UserBase):
    """Schema for user responses."""
    id: int
    created_at: datetime
    updated_at: datetime
    
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
    pass


class JobUpdate(BaseModel):
    """Schema for updating a job."""
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    apply_url: Optional[str] = None
    status: Optional[JobStatus] = None


class JobResponse(JobBase):
    """Schema for job responses."""
    id: int
    user_id: int
    match_score: Optional[float] = None
    cover_letter: Optional[str] = None
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
