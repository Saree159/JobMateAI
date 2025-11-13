#!/usr/bin/env python3
"""
Database Migration Script: SQLite to PostgreSQL
Migrates all data from SQLite development database to PostgreSQL production database.

Usage:
    python migrate_to_postgres.py --source sqlite:///./jobmate.db --target postgresql://user:pass@localhost/jobmate
    python migrate_to_postgres.py --dry-run  # Preview changes without committing
"""

import argparse
import sys
from sqlalchemy import create_engine, inspect, MetaData, Table
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from app.models import Base, User, Job, Application
from datetime import datetime

def get_table_data(source_session, model):
    """Fetch all records from a table"""
    try:
        return source_session.query(model).all()
    except Exception as e:
        print(f"Error fetching {model.__tablename__}: {e}")
        return []

def migrate_table(source_session, target_session, model, dry_run=False):
    """Migrate data from one table to another"""
    table_name = model.__tablename__
    print(f"\n📦 Migrating table: {table_name}")
    
    # Fetch source data
    records = get_table_data(source_session, model)
    print(f"   Found {len(records)} records")
    
    if len(records) == 0:
        print(f"   ✓ No data to migrate")
        return 0, 0
    
    migrated = 0
    failed = 0
    
    for record in records:
        try:
            # Create dictionary of record data
            data = {c.name: getattr(record, c.name) for c in record.__table__.columns}
            
            if dry_run:
                print(f"   [DRY RUN] Would insert: {data.get('id', 'N/A')}")
                migrated += 1
            else:
                # Create new instance and add to target
                new_record = model(**data)
                target_session.add(new_record)
                migrated += 1
                
        except Exception as e:
            print(f"   ✗ Failed to migrate record {record.id}: {e}")
            failed += 1
    
    # Commit after each table
    if not dry_run:
        try:
            target_session.commit()
            print(f"   ✓ Successfully migrated {migrated} records")
        except SQLAlchemyError as e:
            target_session.rollback()
            print(f"   ✗ Failed to commit: {e}")
            return 0, migrated
    else:
        print(f"   ✓ [DRY RUN] Would migrate {migrated} records")
    
    return migrated, failed

def verify_migration(source_session, target_session, models):
    """Verify record counts match between source and target"""
    print("\n🔍 Verifying migration...")
    all_match = True
    
    for model in models:
        source_count = source_session.query(model).count()
        target_count = target_session.query(model).count()
        
        match = "✓" if source_count == target_count else "✗"
        print(f"   {match} {model.__tablename__}: Source={source_count}, Target={target_count}")
        
        if source_count != target_count:
            all_match = False
    
    return all_match

def backup_target_database(target_engine):
    """Create a backup SQL dump of target database before migration"""
    print("\n💾 Creating backup of target database...")
    try:
        # This is a placeholder - actual backup depends on database type
        print("   ⚠️  Manual backup recommended: pg_dump -U user dbname > backup.sql")
        return True
    except Exception as e:
        print(f"   ✗ Backup failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Migrate JobMate AI database from SQLite to PostgreSQL")
    parser.add_argument("--source", default="sqlite:///./jobmate.db", help="Source database URL (SQLite)")
    parser.add_argument("--target", required=True, help="Target database URL (PostgreSQL)")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without committing")
    parser.add_argument("--skip-backup", action="store_true", help="Skip backup step (not recommended)")
    parser.add_argument("--drop-target", action="store_true", help="Drop and recreate target tables (⚠️ DESTRUCTIVE)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("JobMate AI - Database Migration Tool")
    print("=" * 60)
    print(f"Source: {args.source}")
    print(f"Target: {args.target}")
    print(f"Mode: {'DRY RUN (no changes)' if args.dry_run else 'LIVE MIGRATION'}")
    print("=" * 60)
    
    # Confirm if not dry run
    if not args.dry_run:
        confirm = input("\n⚠️  This will modify the target database. Continue? (yes/no): ")
        if confirm.lower() != "yes":
            print("Migration cancelled.")
            sys.exit(0)
    
    try:
        # Create database engines
        print("\n🔌 Connecting to databases...")
        source_engine = create_engine(args.source, echo=False)
        target_engine = create_engine(args.target, echo=False)
        
        # Test connections
        source_engine.connect()
        target_engine.connect()
        print("   ✓ Connected to both databases")
        
        # Create sessions
        SourceSession = sessionmaker(bind=source_engine)
        TargetSession = sessionmaker(bind=target_engine)
        source_session = SourceSession()
        target_session = TargetSession()
        
        # Backup target database (if not skipped)
        if not args.skip_backup and not args.dry_run:
            backup_target_database(target_engine)
        
        # Drop and recreate tables if requested
        if args.drop_target and not args.dry_run:
            print("\n⚠️  Dropping existing tables in target database...")
            Base.metadata.drop_all(bind=target_engine)
            print("   ✓ Tables dropped")
        
        # Create tables in target database
        print("\n🏗️  Creating tables in target database...")
        Base.metadata.create_all(bind=target_engine)
        print("   ✓ Tables created")
        
        # Define migration order (respecting foreign keys)
        models_to_migrate = [
            User,        # First (no dependencies)
            Job,         # Second (depends on User)
            Application  # Third (depends on User and Job)
        ]
        
        # Migrate each table
        total_migrated = 0
        total_failed = 0
        
        for model in models_to_migrate:
            migrated, failed = migrate_table(source_session, target_session, model, args.dry_run)
            total_migrated += migrated
            total_failed += failed
        
        # Verify migration
        if not args.dry_run:
            all_match = verify_migration(source_session, target_session, models_to_migrate)
            
            if all_match:
                print("\n✅ Migration completed successfully!")
                print(f"   Total records migrated: {total_migrated}")
                if total_failed > 0:
                    print(f"   ⚠️  Failed records: {total_failed}")
            else:
                print("\n⚠️  Migration completed with discrepancies!")
                print("   Please review the verification output above.")
        else:
            print("\n✅ Dry run completed!")
            print(f"   Would migrate {total_migrated} records")
            print("\n   Run without --dry-run to perform actual migration.")
        
        # Close sessions
        source_session.close()
        target_session.close()
        
    except SQLAlchemyError as e:
        print(f"\n✗ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("Migration process completed")
    print("=" * 60)

if __name__ == "__main__":
    main()
