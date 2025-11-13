"""
SQLAlchemy database models for JobMate AI.
Defines User and Job tables with relationships.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum


Base = declarative_base()


class WorkModePreference(str, enum.Enum):
    """Work mode preferences for users."""
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class JobStatus(str, enum.Enum):
    """Job application statuses."""
    SAVED = "saved"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


class AlertFrequency(str, enum.Enum):
    """Job alert notification frequencies."""
    IMMEDIATE = "immediate"
    DAILY = "daily"
    WEEKLY = "weekly"


class User(Base):
    """User model - represents a job seeker."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    target_role = Column(String(255), nullable=True)
    
    # Store skills as comma-separated string (or JSON in production)
    skills = Column(Text, nullable=True)  # e.g., "Python,React,SQL"
    
    location_preference = Column(String(255), nullable=True)
    work_mode_preference = Column(
        Enum(WorkModePreference),
        default=WorkModePreference.REMOTE,
        nullable=True
    )
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship to jobs
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship to job alerts
    job_alerts = relationship("JobAlert", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship to applications
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.target_role}')>"
    
    @property
    def skills_list(self):
        """Return skills as a list."""
        if not self.skills:
            return []
        return [s.strip() for s in self.skills.split(",") if s.strip()]
    
    @skills_list.setter
    def skills_list(self, value):
        """Set skills from a list."""
        if isinstance(value, list):
            self.skills = ",".join(value)
        else:
            self.skills = value


class Job(Base):
    """Job model - represents a job posting tracked by a user."""
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    apply_url = Column(String(500), nullable=True)
    
    # AI-generated fields
    match_score = Column(Float, nullable=True)  # 0-100 score
    cover_letter = Column(Text, nullable=True)
    
    # User notes and tracking
    notes = Column(Text, nullable=True)  # Interview notes, follow-ups, etc.
    applied_date = Column(DateTime, nullable=True)  # When application was submitted
    interview_date = Column(DateTime, nullable=True)  # Scheduled interview date
    
    status = Column(
        Enum(JobStatus),
        default=JobStatus.SAVED,
        nullable=False,
        index=True
    )
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship to user
    user = relationship("User", back_populates="jobs")
    
    def __repr__(self):
        return f"<Job(id={self.id}, title='{self.title}', company='{self.company}', status='{self.status}')>"


class JobAlert(Base):
    """Job Alert model - user-configured alerts for matching job opportunities."""
    __tablename__ = "job_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Alert criteria
    keywords = Column(String(500), nullable=False)  # Comma-separated keywords
    location = Column(String(255), nullable=True)
    min_match_score = Column(Integer, default=70, nullable=False)  # Only alert if match >= this
    
    # Notification settings
    is_active = Column(Integer, default=1, nullable=False)  # 1=active, 0=paused
    frequency = Column(
        Enum(AlertFrequency),
        default=AlertFrequency.DAILY,
        nullable=False
    )
    
    # Tracking
    last_checked = Column(DateTime, nullable=True)
    last_notified = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship to user
    user = relationship("User", back_populates="job_alerts")
    
    def __repr__(self):
        return f"<JobAlert(id={self.id}, keywords='{self.keywords}', active={self.is_active})>"
    
    @property
    def keywords_list(self):
        """Return keywords as a list."""
        if not self.keywords:
            return []
        return [k.strip() for k in self.keywords.split(",") if k.strip()]


class Application(Base):
    """Application model - tracks user's job applications with analytics data."""
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    
    # Timeline tracking for analytics
    saved_at = Column(DateTime, nullable=True)
    applied_at = Column(DateTime, nullable=True)
    interview_at = Column(DateTime, nullable=True)
    offer_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    
    # Response time metrics (in days)
    time_to_apply = Column(Integer, nullable=True)  # Days from saved to applied
    time_to_interview = Column(Integer, nullable=True)  # Days from applied to interview
    time_to_offer = Column(Integer, nullable=True)  # Days from interview to offer
    
    # Outcome
    final_status = Column(
        Enum(JobStatus),
        nullable=True
    )
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="applications")
    job = relationship("Job")
    
    def __repr__(self):
        return f"<Application(id={self.id}, job_id={self.job_id}, status='{self.final_status}')>"

