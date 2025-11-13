# JobMate AI Backend

FastAPI backend for JobMate AI - an intelligent job search management platform.

## Features

- User profile management (skills, target role, location preferences)
- Job posting management with AI-powered match scoring
- AI-generated cover letters tailored to each job
- Job application pipeline tracking (Saved → Applied → Interview → Offer → Rejected)

## Tech Stack

- **Framework**: FastAPI
- **Database**: SQLAlchemy (SQLite for dev, PostgreSQL for production)
- **AI**: OpenAI GPT for cover letter generation
- **Matching**: Scikit-learn for skill-based job matching

## Setup

### 1. Create a Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: Database connection string (defaults to SQLite)
- `OPENAI_API_KEY`: Your OpenAI API key for AI features
- `SECRET_KEY`: Secret key for JWT token generation
- `CORS_ORIGINS`: Allowed frontend origins (comma-separated)

### 4. Initialize the Database

The database will be created automatically when you first run the server. Tables are created on startup.

### 5. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Users
- `POST /api/users` - Create a new user
- `GET /api/users/{user_id}` - Get user profile
- `PUT /api/users/{user_id}` - Update user profile

### Jobs
- `POST /api/users/{user_id}/jobs` - Create a job for a user
- `GET /api/users/{user_id}/jobs` - List user's jobs (filter by status)
- `PUT /api/jobs/{job_id}` - Update job details
- `POST /api/jobs/{job_id}/match` - Calculate match score
- `POST /api/jobs/{job_id}/cover-letter` - Generate AI cover letter

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings and environment config
│   ├── database.py          # Database session management
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── routers/
│   │   ├── users.py         # User endpoints
│   │   └── jobs.py          # Job endpoints
│   └── services/
│       └── ai.py            # AI services (matching, cover letters)
├── requirements.txt
├── .env.example
└── README.md
```

## Development

### Database Migrations

For production, consider using Alembic for database migrations:

```bash
pip install alembic
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Testing

```bash
pip install pytest pytest-asyncio httpx
pytest
```

## Deployment

### Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t jobmate-api .
docker run -p 8000:8000 --env-file .env jobmate-api
```

### Production Considerations

1. Use PostgreSQL instead of SQLite
2. Set strong `SECRET_KEY` in environment
3. Enable HTTPS
4. Set up proper logging
5. Configure rate limiting
6. Use a production ASGI server (Gunicorn + Uvicorn workers)

## License

Proprietary - JobMate AI
