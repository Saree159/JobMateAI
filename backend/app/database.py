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
    """
    Add new columns / tables to existing databases without a full Alembic setup.
    Each ALTER TABLE / CREATE TABLE is wrapped in its own transaction so a
    'column already exists' error never rolls back unrelated changes.
    """
    is_sqlite = "sqlite" in settings.database_url

    with engine.connect() as conn:
        # ── users table ───────────────────────────────────────────────────────
        for col, col_type in [
            ("resume_filename", "VARCHAR(255)"),
            ("resume_content", "BYTEA" if not is_sqlite else "BLOB"),
            ("years_of_experience", "INTEGER"),
            ("min_salary_preference", "INTEGER"),
            ("max_salary_preference", "INTEGER"),
            ("industry_preference", "VARCHAR(255)"),
            ("is_verified", "BOOLEAN DEFAULT FALSE"),
            ("verification_token", "VARCHAR(64)"),
            ("job_type_preference", "VARCHAR(100)"),
            ("availability", "VARCHAR(100)"),
            ("linkedin_oauth_token", "TEXT"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
                print(f"✓ Migration: added users.{col}")
            except Exception:
                conn.rollback()

        # ── jobs table ────────────────────────────────────────────────────────
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN ingest_job_id INTEGER REFERENCES ingest_jobs(id)"))
            conn.commit()
            print("✓ Migration: added jobs.ingest_job_id")
        except Exception:
            conn.rollback()

        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN opening_sentence TEXT"))
            conn.commit()
            print("✓ Migration: added jobs.opening_sentence")
        except Exception:
            conn.rollback()

        # ── user_job_feed_status table ────────────────────────────────────────
        # SQLAlchemy's create_all already handles this for fresh DBs via models.py,
        # but we guard here for pre-existing databases that pre-date this table.
        # ── source_configs table ─────────────────────────────────────────────
        try:
            if is_sqlite:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS source_configs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        source VARCHAR(50) NOT NULL UNIQUE,
                        enabled BOOLEAN NOT NULL DEFAULT 1,
                        schedule_hour INTEGER NOT NULL DEFAULT 7,
                        schedule_minute INTEGER NOT NULL DEFAULT 30,
                        last_run_at DATETIME,
                        last_job_count INTEGER NOT NULL DEFAULT 0,
                        notes VARCHAR(500),
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS source_configs (
                        id SERIAL PRIMARY KEY,
                        source VARCHAR(50) NOT NULL UNIQUE,
                        enabled BOOLEAN NOT NULL DEFAULT TRUE,
                        schedule_hour INTEGER NOT NULL DEFAULT 7,
                        schedule_minute INTEGER NOT NULL DEFAULT 30,
                        last_run_at TIMESTAMP,
                        last_job_count INTEGER NOT NULL DEFAULT 0,
                        notes VARCHAR(500),
                        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                    )
                """))
            conn.commit()
            print("✓ Migration: ensured source_configs table exists")
        except Exception as e:
            conn.rollback()
            print(f"  (source_configs migration skipped: {e})")

        # Seed default source rows (LinkedIn enabled, Drushim + TechMap disabled)
        _seed_source_configs(conn, is_sqlite)

        # ── user_job_feed_status table ────────────────────────────────────────
        # SQLAlchemy's create_all already handles this for fresh DBs via models.py,
        # but we guard here for pre-existing databases that pre-date this table.
        try:
            if is_sqlite:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS user_job_feed_status (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        ingest_job_id INTEGER NOT NULL REFERENCES ingest_jobs(id),
                        status VARCHAR(20) NOT NULL DEFAULT 'new',
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (user_id, ingest_job_id)
                    )
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS user_job_feed_status (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        ingest_job_id INTEGER NOT NULL REFERENCES ingest_jobs(id),
                        status VARCHAR(20) NOT NULL DEFAULT 'new',
                        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        UNIQUE (user_id, ingest_job_id)
                    )
                """))
            conn.commit()
            print("✓ Migration: ensured user_job_feed_status table exists")
        except Exception as e:
            conn.rollback()
            print(f"  (user_job_feed_status migration skipped: {e})")


def _seed_source_configs(conn, is_sqlite: bool):
    """Insert default source rows if they don't exist yet."""
    defaults = [
        ("linkedin", True,  7, 30, "LinkedIn guest API — main source"),
        ("drushim",  False, 7, 30, "Drushim RSS feed — disabled by default"),
        ("techmap",  False, 7, 30, "TechMap GitHub CSV — disabled by default"),
    ]
    for source, enabled, hour, minute, notes in defaults:
        try:
            existing = conn.execute(
                text("SELECT id FROM source_configs WHERE source = :s"),
                {"s": source}
            ).fetchone()
            if not existing:
                conn.execute(
                    text(
                        "INSERT INTO source_configs (source, enabled, schedule_hour, schedule_minute, notes, updated_at) "
                        "VALUES (:s, :e, :h, :m, :n, CURRENT_TIMESTAMP)"
                    ),
                    {"s": source, "e": enabled, "h": hour, "m": minute, "n": notes},
                )
                conn.commit()
                print(f"✓ Seeded source_configs: {source} (enabled={enabled})")
        except Exception as ex:
            conn.rollback()
            print(f"  (seed source_configs {source} skipped: {ex})")


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
