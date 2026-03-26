"""
SQLAlchemy database models for JobMate AI.
Defines User and Job tables with relationships.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum, LargeBinary
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
    years_of_experience = Column(Integer, nullable=True)
    
    # Store skills as comma-separated string (or JSON in production)
    skills = Column(Text, nullable=True)  # e.g., "Python,React,SQL"
    
    location_preference = Column(String(255), nullable=True)
    min_salary_preference = Column(Integer, nullable=True)   # monthly ILS
    max_salary_preference = Column(Integer, nullable=True)   # monthly ILS
    industry_preference = Column(String(255), nullable=True)
    job_type_preference = Column(String(100), nullable=True)  # full-time/part-time/contract/freelance
    availability = Column(String(100), nullable=True)         # immediately/2-weeks/1-month/3-months
    work_mode_preference = Column(
        Enum(WorkModePreference),
        default=WorkModePreference.REMOTE,
        nullable=True
    )

    # Stored resume
    resume_filename = Column(String(255), nullable=True)
    resume_content = Column(LargeBinary, nullable=True)

    # LinkedIn integration
    linkedin_li_at = Column(Text, nullable=True)  # li_at session cookie for authenticated scraping

    # Subscription / billing
    subscription_tier = Column(String(20), default="free", nullable=False)
    subscription_status = Column(String(20), nullable=True)          # active | canceled | expired
    subscription_end_date = Column(DateTime, nullable=True)
    # Reuse the originally-created twoco_* columns for PayPal (same DB columns, new Python names)
    paypal_payer_id = Column("twoco_customer_ref", String(255), nullable=True)
    paypal_subscription_id = Column("twoco_subscription_ref", String(255), nullable=True)

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
    def linkedin_connected(self) -> bool:
        """True when the user has stored a LinkedIn li_at session cookie."""
        return bool(self.linkedin_li_at)

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

    # Optional link back to the IngestJob that this tracked job originated from.
    # When set, the frontend can show "discovered via email / Drushim / LinkedIn".
    ingest_job_id = Column(Integer, ForeignKey("ingest_jobs.id"), nullable=True, index=True)

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
    
    # Relationships
    user = relationship("User", back_populates="jobs")
    ingest_job = relationship("IngestJob", foreign_keys=[ingest_job_id])

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


class UserSession(Base):
    """Records each login event. Used for DAU/WAU/MAU and cohort retention."""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class FeedJobStatus(str, enum.Enum):
    NEW = "new"
    SAVED = "saved"
    APPLIED = "applied"
    IGNORED = "ignored"


class IngestEvent(Base):
    """Records each ingestion attempt from an external source (e.g., n8n)."""
    __tablename__ = "ingest_events"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), nullable=False)
    run_id = Column(String(255), nullable=True)
    email_id = Column(String(255), unique=True, index=True, nullable=False)
    received_at = Column(DateTime, nullable=False)
    subject = Column(String(500), nullable=True)
    snippet = Column(Text, nullable=True)
    payload = Column(Text, nullable=True)  # Raw JSON payload for debugging
    processed = Column(Integer, default=0, nullable=False)  # 0 = not processed, 1 = processed
    inserted = Column(Integer, default=0, nullable=False)
    updated = Column(Integer, default=0, nullable=False)
    skipped = Column(Integer, default=0, nullable=False)
    error = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AIUsageLog(Base):
    """Logs every OpenAI API call with token counts and estimated cost."""
    __tablename__ = "ai_usage_log"

    id = Column(Integer, primary_key=True, index=True)
    feature = Column(String(100), nullable=False, index=True)   # cover_letter | interview_questions | salary_estimate | resume_rewrite | resume_evaluation | gap_analysis
    model = Column(String(100), nullable=False, default="gpt-4o-mini")
    tokens_in = Column(Integer, nullable=False, default=0)
    tokens_out = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Float, nullable=False, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class IngestJob(Base):
    """Represents a job extracted from external ingestion (LinkedIn email, etc.)."""
    __tablename__ = "ingest_jobs"

    id = Column(Integer, primary_key=True, index=True)
    canonical_key = Column(String(1000), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    url = Column(String(1000), nullable=True)
    raw = Column(Text, nullable=True)  # JSON string of raw source
    source = Column(String(100), nullable=True)

    status = Column(
        Enum(FeedJobStatus),
        default=FeedJobStatus.NEW,
        nullable=False,
        index=True
    )

    first_seen_at = Column(DateTime, nullable=False)
    last_seen_at = Column(DateTime, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<IngestJob(id={self.id}, title='{self.title}', company='{self.company}', status='{self.status}')>"


class UserJobFeedStatus(Base):
    """
    Per-user status for feed jobs (IngestJob).

    Replaces the global IngestJob.status for user-facing operations.
    Each user tracks their own new / saved / applied / ignored state
    independently — one user saving a job does not affect other users.
    """
    __tablename__ = "user_job_feed_status"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ingest_job_id = Column(Integer, ForeignKey("ingest_jobs.id"), nullable=False, index=True)
    status = Column(
        Enum(FeedJobStatus),
        default=FeedJobStatus.NEW,
        nullable=False,
    )
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Enforce one row per (user, job) pair
    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("user_id", "ingest_job_id", name="uq_user_feed_status"),
    )

    # Relationships
    user = relationship("User")
    ingest_job = relationship("IngestJob")

    def __repr__(self):
        return f"<UserJobFeedStatus(user={self.user_id}, job={self.ingest_job_id}, status='{self.status}')>"

