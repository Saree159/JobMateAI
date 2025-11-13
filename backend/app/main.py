"""
JobMate AI Backend - FastAPI Application
Main entry point for the FastAPI application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routers import users, jobs, resume, notifications, alerts, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup: Initialize database
    print("🚀 Starting JobMate AI Backend...")
    init_db()
    print("✓ Database initialized")
    print(f"✓ Server running on http://{settings.host}:{settings.port}")
    print(f"✓ API docs available at http://localhost:{settings.port}/docs")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down JobMate AI Backend...")


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
    
    Currently using simple JWT tokens. For production, implement OAuth2 with refresh tokens.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
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
