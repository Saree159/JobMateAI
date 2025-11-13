"""
Migration script to add notes, applied_date, and interview_date to jobs table.
Run this once to update your existing database.
"""
from app.database import engine
from sqlalchemy import text

def migrate():
    print("🔄 Running migration: Add notes and date tracking to jobs...")
    
    with engine.connect() as conn:
        try:
            # Add notes column
            conn.execute(text("ALTER TABLE jobs ADD COLUMN notes TEXT"))
            print("✓ Added 'notes' column")
        except Exception as e:
            print(f"  'notes' column already exists or error: {e}")
        
        try:
            # Add applied_date column
            conn.execute(text("ALTER TABLE jobs ADD COLUMN applied_date DATETIME"))
            print("✓ Added 'applied_date' column")
        except Exception as e:
            print(f"  'applied_date' column already exists or error: {e}")
        
        try:
            # Add interview_date column
            conn.execute(text("ALTER TABLE jobs ADD COLUMN interview_date DATETIME"))
            print("✓ Added 'interview_date' column")
        except Exception as e:
            print(f"  'interview_date' column already exists or error: {e}")
        
        conn.commit()
    
    print("✅ Migration complete!")

if __name__ == "__main__":
    migrate()
