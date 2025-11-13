# JobMate AI - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                    (http://localhost:5173)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         │
         ┌───────────────┴───────────────┐
         │                               │
         │                               │
┌────────▼─────────┐          ┌─────────▼──────────┐
│  Base44 SDK      │          │ JobMate API Client │
│  (Legacy BaaS)   │          │   (jobmate.js)     │
└────────┬─────────┘          └──────────┬─────────┘
         │                               │
         │                               │
         │ API Calls                     │ REST API
         │                               │
┌────────▼─────────┐          ┌─────────▼──────────┐
│  Base44 Backend  │          │  FastAPI Backend   │
│  (Authentication)│          │ (http://localhost  │
│                  │          │      :8000)        │
└──────────────────┘          └──────────┬─────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                     ┌────────▼────────┐  ┌────────▼────────┐
                     │  SQLite DB      │  │  OpenAI API     │
                     │  (jobmate.db)   │  │  (GPT-4)        │
                     └─────────────────┘  └─────────────────┘
```

## Frontend Architecture

### Pages
- **Dashboard** (`src/pages/Dashboard.jsx`)
  - Overview of job search activity
  - Statistics and recent activity
  - Top job matches

- **Jobs** (`src/pages/Jobs.jsx`)
  - Browse available job listings
  - Filter and search
  - View match scores

- **Applications** (`src/pages/Applications.jsx`)
  - Track application pipeline
  - Saved → Applied → Interview → Offer → Rejected

- **Profile** (`src/pages/Profile.jsx`)
  - User profile management
  - Skills, target role, preferences

- **JobDetails** (`src/pages/JobDetails.jsx`)
  - Detailed job view
  - Match score calculation
  - Cover letter generation

### State Management
- **React Query** (TanStack Query)
  - Server state management
  - Caching and synchronization
  - Optimistic updates

### API Clients
- **base44Client.js** - Base44 BaaS SDK integration
- **jobmate.js** - FastAPI backend client (NEW)

## Backend Architecture

### API Layer (`app/routers/`)

#### Users Router (`users.py`)
```
POST   /api/users              → Create user
GET    /api/users/{id}         → Get user profile
PUT    /api/users/{id}         → Update user profile
DELETE /api/users/{id}         → Delete user
POST   /api/users/login        → Simple login (JWT)
```

#### Jobs Router (`jobs.py`)
```
POST   /api/users/{id}/jobs           → Create job
GET    /api/users/{id}/jobs           → List user's jobs
GET    /api/jobs/{id}                 → Get job details
PUT    /api/jobs/{id}                 → Update job
DELETE /api/jobs/{id}                 → Delete job
POST   /api/jobs/{id}/match           → Calculate match score
POST   /api/jobs/{id}/cover-letter    → Generate cover letter
```

### Business Logic (`app/services/`)

#### AI Service (`ai.py`)
- **Match Scoring Algorithm**
  1. Exact keyword matching (50% weight)
     - Match user skills against job description
  2. Semantic similarity (50% weight)
     - TF-IDF vectorization + cosine similarity
  3. Final score: 0-100

- **Cover Letter Generation**
  - Uses OpenAI GPT-4 Turbo
  - Inputs: User profile + Job details
  - Output: Personalized 250-300 word cover letter

### Data Layer (`app/models.py`)

#### User Model
```python
User
├── id (PK)
├── email (unique)
├── password_hash
├── full_name
├── target_role
├── skills (CSV string)
├── location_preference
├── work_mode_preference (enum)
├── created_at
├── updated_at
└── jobs (relationship)
```

#### Job Model
```python
Job
├── id (PK)
├── user_id (FK)
├── title
├── company
├── location
├── description
├── apply_url
├── match_score (calculated)
├── cover_letter (AI-generated)
├── status (enum: saved/applied/interview/offer/rejected)
├── created_at
├── updated_at
└── user (relationship)
```

## Data Flow Examples

### Creating a Job
```
1. User fills form in AddJobDialog component
2. Form submission triggers jobApi.create(userId, jobData)
3. POST /api/users/{userId}/jobs
4. FastAPI validates with JobCreate schema
5. Creates Job model instance
6. Saves to SQLite database
7. Returns JobResponse
8. React Query updates cache
9. UI re-renders with new job
```

### Calculating Match Score
```
1. User clicks "Calculate Match" on job card
2. jobApi.calculateMatchScore(jobId)
3. POST /api/jobs/{jobId}/match
4. Backend fetches Job and User from DB
5. ai.calculate_match_score() runs:
   - Extracts user skills
   - Compares with job description
   - TF-IDF semantic similarity
6. Updates Job.match_score in DB
7. Returns MatchScoreResponse with:
   - match_score (0-100)
   - matched_skills []
   - missing_skills []
8. UI displays score with badge
```

### Generating Cover Letter
```
1. User clicks "Generate Cover Letter"
2. jobApi.generateCoverLetter(jobId)
3. POST /api/jobs/{jobId}/cover-letter
4. Backend fetches Job and User
5. ai.generate_cover_letter() calls OpenAI API:
   - Constructs prompt with user + job context
   - Sends to GPT-4 Turbo
   - Receives tailored cover letter
6. Saves cover_letter to Job in DB
7. Returns CoverLetterResponse
8. UI displays in modal/textarea
```

## Security Considerations

### Current Implementation (MVP)
- Simple JWT tokens
- Password hashing with bcrypt
- CORS configured for localhost
- SQLite file-based database

### Production Recommendations
1. **Authentication**
   - OAuth2 with refresh tokens
   - Rate limiting on auth endpoints
   - Session management

2. **Database**
   - Migrate to PostgreSQL
   - Connection pooling
   - Database migrations with Alembic

3. **API Security**
   - API rate limiting
   - Request validation
   - SQL injection prevention (already handled by SQLAlchemy)

4. **Environment**
   - Strong SECRET_KEY
   - Rotate API keys
   - HTTPS only
   - Environment-specific configs

## Deployment Strategy

### Development
```bash
# Terminal 1: Backend
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
npm run dev
```

### Production
```bash
# Backend (with Gunicorn + Uvicorn workers)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend (build static assets)
npm run build
# Serve with Nginx or Vercel
```

## Technology Stack Summary

### Frontend
- React 18
- Vite (build tool)
- TanStack Query (state)
- React Router v6
- Tailwind CSS + Radix UI

### Backend
- FastAPI 0.115
- SQLAlchemy 2.0
- Pydantic 2.0
- OpenAI API
- Scikit-learn (ML)

### Database
- SQLite (dev)
- PostgreSQL (production-ready)

### AI/ML
- OpenAI GPT-4 Turbo (cover letters)
- TF-IDF + Cosine Similarity (matching)

## Key Design Decisions

1. **Hybrid Backend Approach**
   - Keep Base44 for auth initially
   - New JobMate backend for core features
   - Allows gradual migration

2. **RESTful API Design**
   - Resource-oriented endpoints
   - Standard HTTP methods
   - Predictable URL structure

3. **AI Integration**
   - External API (OpenAI) for quality
   - Local ML (scikit-learn) for speed
   - Graceful fallbacks on errors

4. **Frontend State**
   - React Query for server state
   - Local state for UI only
   - Optimistic updates for UX

5. **Database Schema**
   - Simple, normalized structure
   - Relationships with foreign keys
   - Timestamps for audit trail
