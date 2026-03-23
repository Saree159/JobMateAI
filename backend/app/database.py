"""
Database configuration and session management.
Provides dependency injection for database sessions in FastAPI routes.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings
from app.models import Base


# Create database engine
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=False  # Set to True for SQL query logging during development
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """
    Initialize the database by creating all tables.
    Called on application startup.
    """
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    print("✓ Database tables created successfully")


def _run_migrations():
    """Add new columns to existing tables without full alembic setup."""
    is_sqlite = "sqlite" in settings.database_url
    with engine.connect() as conn:
        for col, col_type in [
            ("resume_filename", "VARCHAR(255)"),
            ("resume_content", "BYTEA" if not is_sqlite else "BLOB"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
                print(f"✓ Migration: added users.{col}")
            except Exception:
                conn.rollback()  # Column already exists — safe to ignore


def get_db():
    """
    Dependency that provides a database session to route handlers.
    Ensures the session is closed after the request completes.
    
    Usage in FastAPI routes:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
