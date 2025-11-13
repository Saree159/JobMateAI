"""
Add Job Alerts and Applications tables to database.
Run this script to add the new tables for Phase 3 features.

Usage:
    python migrate_add_alerts_analytics.py
"""
from sqlalchemy import create_engine
from app.database import Base
from app.models import User, Job, JobAlert, Application
from app.config import settings

def main():
    print("=" * 60)
    print("JobMate AI - Database Migration: Add Alerts & Analytics")
    print("=" * 60)
    
    # Create engine
    engine = create_engine(settings.database_url, echo=True)
    
    print("\n📦 Creating new tables...")
    print("   - job_alerts")
    print("   - applications")
    
    # Create only new tables (won't recreate existing ones)
    Base.metadata.create_all(bind=engine)
    
    print("\n✅ Migration completed successfully!")
    print("\nNew tables added:")
    print("   ✓ job_alerts - For job alert notifications")
    print("   ✓ applications - For analytics tracking")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
