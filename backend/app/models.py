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
