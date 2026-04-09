"""
JobMate AI Backend - FastAPI Application
Main entry point for the FastAPI application.
"""
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db
from app.limiter import limiter
from app.routers import users, jobs, resume, notifications, alerts, analytics, billing, admin
from app.routers import linkedin_auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: init DB, start background scheduler, clean up on exit."""
    print("Starting JobMate AI Backend...")
    init_db()
    print("Database initialized")
    print(f"Server running on http://{settings.host}:{settings.port}")
    print(f"API docs available at http://localhost:{settings.port}/docs")

    from app.services.scrape_scheduler import run_scheduler
    scheduler_task = asyncio.create_task(run_scheduler())

    yield

    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    print("Shutting down JobMate AI Backend...")


# Create FastAPI application
app = FastAPI(
    title="JobMate AI API",
    description="""
    Backend API for JobMate AI - An intelligent job search management platform.

    ## Features

    * **User Management**: Create and manage user profiles with skills and preferences
    * **Job Tracking**: Add and track job applications through the pipeline
    * **AI Match Scoring**: Calculate compatibility scores between user skills and jobs
    * **Cover Letter Generation**: Generate tailored cover letters using AI

    ## Authentication

    JWT-based authentication. Admin endpoints require a token belonging to an admin email.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global exception handler — ensures CORS headers are present even on unhandled 500s
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    allowed = settings.cors_origins_list
    cors_origin = origin if origin in allowed else (allowed[0] if allowed else "*")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(jobs.router)
app.include_router(resume.router)
app.include_router(notifications.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(billing.router)
app.include_router(admin.router)
app.include_router(linkedin_auth.router)


@app.get("/")
def root():
    """Root endpoint - API health check."""
    return {
        "message": "JobMate AI API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
