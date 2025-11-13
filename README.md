# JobMate AI

**The ultimate AI-powered job search management platform - fully self-hosted and feature-rich.**

Track applications, get AI match scores, generate personalized cover letters, receive interview preparation, and get salary insights - all while maintaining complete control of your data.

## 🚀 Core Features

### Application Management
- **Profile Management**: Comprehensive profile with skills, experience, target role, and preferences
- **Job Tracking**: Manage job postings through a complete pipeline (Saved → Applied → Interview → Offer → Rejected)
- **Smart Filtering**: Search jobs by title, company, or status with real-time filtering
- **Application Notes**: Add timestamped notes to track follow-ups and communications
- **Status Updates**: Visual pipeline with drag-and-drop status management

### AI-Powered Intelligence
- **Match Scoring**: Get 0-100 compatibility scores based on skills vs requirements (hybrid algorithm)
- **Cover Letter Generation**: Personalized, professional cover letters using GPT-4o-mini
- **Interview Preparation**: AI-generated behavioral, technical, and company-specific questions
- **Salary Insights**: Real-time salary estimates with market analysis and range predictions

### Power Features
- **Resume Parsing**: Upload PDF or DOCX resumes for automatic skill extraction
- **Export Functionality**: Export applications to CSV or professionally formatted PDF reports
- **Email Notifications**: Interview reminders, follow-up alerts, and deadline notifications
- **Visual Analytics**: Application statistics with match score trends and status breakdown

### Production Ready
- **Docker Support**: Complete containerization with PostgreSQL, multi-stage builds
- **Security**: JWT authentication, bcrypt password hashing, CORS protection
- **Validation**: Client and server-side validation with toast notifications
- **Performance**: Skeleton loading states, optimized queries, responsive UI
- **Self-Hosted**: Own your data, no external dependencies (except OpenAI for AI features)

## 🏗️ Architecture

**Fully standalone application:**
- FastAPI backend with SQLite/PostgreSQL
- React frontend with modern UI
- JWT authentication
- No BaaS or external services required

### Tech Stack

**Frontend:**
- React 18 + Vite
- React Router v6
- TanStack Query (React Query)
- Tailwind CSS + Radix UI (shadcn/ui)

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite (dev) / PostgreSQL (production)
- OpenAI GPT-4 for cover letters
- Scikit-learn for match scoring

## 🛠️ Quick Start

### Option 1: Docker (Recommended for Production)

**Prerequisites:**
- Docker 20.10+
- Docker Compose 2.0+

**Steps:**
```bash
# Clone repository
git clone https://github.com/Saree159/JobMateAI.git
cd JobMateAI

# Configure environment
cp .env.docker.example .env
# Edit .env and add your OPENAI_API_KEY, SECRET_KEY, DB_PASSWORD

# Build and start services
docker-compose up -d

# Access application
# Frontend: http://localhost
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete deployment guide.

### Option 2: Local Development

**Prerequisites:**
- Node.js 18+
- Python 3.9+
- OpenAI API key

**Backend Setup:**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start server
uvicorn app.main:app --reload
```

Backend available at: http://localhost:8000

**Frontend Setup:**
```bash
# In new terminal, from project root
npm install
npm run dev
```

Frontend available at: http://localhost:5173

**Create Account:**
1. Visit http://localhost:5173
2. Click "Sign up"
3. Complete onboarding
4. Start tracking jobs!

---

## 📁 Project Structure

```
JobMateAI/
├── src/                          # React frontend
│   ├── api/
│   │   └── jobmate.js            # Backend API client
│   ├── components/               # UI components
│   ├── pages/                    # Page components
│   │   ├── Login.jsx             # Login page
│   │   ├── Register.jsx          # Registration
│   │   ├── Dashboard.jsx         # Main dashboard
│   │   ├── Jobs.jsx              # Job listings
│   │   ├── Applications.jsx      # Application tracking
│   │   └── Profile.jsx           # User profile
│   └── lib/
│       └── AuthContext.jsx       # JWT auth management
│
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # Database setup
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── routers/             # API endpoints
│   │   │   ├── users.py         # User management + auth
│   │   │   └── jobs.py          # Job management + AI
│   │   └── services/
│   │       └── ai.py            # AI matching & cover letters
│   ├── requirements.txt
│   ├── .env                     # Configuration
│   └── README.md
│
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/users` - Register new account
- `POST /api/users/login` - Login (returns JWT token)

### User Management
- `GET /api/users/{id}` - Get user profile
- `PUT /api/users/{id}` - Update profile

### Job Management
- `POST /api/users/{id}/jobs` - Create job posting
- `GET /api/users/{id}/jobs` - List all jobs for user
- `GET /api/jobs/{id}` - Get job details
- `PUT /api/jobs/{id}` - Update job
- `DELETE /api/jobs/{id}` - Delete job

### AI Features
- `POST /api/jobs/{id}/match` - Calculate AI match score (0-100)
- `POST /api/jobs/{id}/cover-letter` - Generate personalized cover letter
- `GET /api/jobs/{id}/interview-questions` - Get interview prep questions (behavioral/technical/company)
- `GET /api/jobs/{id}/salary-estimate` - Get salary range estimate with market insights

### Resume & Notifications
- `POST /api/resume/upload` - Upload and parse resume (PDF/DOCX)
- `POST /api/notifications/send-test` - Send test email notification
- `POST /api/notifications/jobs/{id}/send-reminder` - Send interview/follow-up reminder

**Interactive API Documentation:** http://localhost:8000/docs

---

## 🔧 Development

### Running Both Services

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Environment Variables

**Frontend** (`.env` in root):
```bash
VITE_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```bash
DATABASE_URL=sqlite:///./jobmate.db
OPENAI_API_KEY=sk-your-key-here
CORS_ORIGINS=http://localhost:5173
SECRET_KEY=your-secret-key
```

### Database

**SQLite (Development):**
Database file: `backend/jobmate.db`

**PostgreSQL (Production):**
Update `DATABASE_URL` in `.env`:
```bash
DATABASE_URL=postgresql://user:password@localhost/jobmate
```

---

## 🧪 Testing

**Backend Tests:**
```bash
cd backend
pytest test_api.py -v
```

**Manual Testing:**
1. Use Swagger UI: http://localhost:8000/docs
2. Try each endpoint interactively
3. Check database: `sqlite3 backend/jobmate.db`

---

## 🚢 Deployment

### Backend (Production)

1. **Use PostgreSQL** instead of SQLite
2. **Set strong SECRET_KEY** in environment
3. **Use production ASGI server:**
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```
4. **Enable HTTPS**
5. **Set production CORS_ORIGINS**

### Frontend (Production)

1. **Build static assets:**
   ```bash
   npm run build
   ```
2. **Serve with Nginx, Vercel, or Netlify**
3. **Set `VITE_API_URL`** to production backend URL

### Docker (Optional)

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

---

## � Key Features Explained

### AI Match Scoring
- **Hybrid algorithm**: 50% keyword matching + 50% semantic similarity
- Uses TF-IDF and cosine similarity
- Returns 0-100 score with matched/missing skills
- Helps prioritize which jobs to apply for

### AI Cover Letter Generation
- Powered by OpenAI GPT-4 Turbo
- Tailored to job description and your profile  
- Professional tone, 250-300 words
- Saved to database for reuse/editing

### Job Pipeline
Track each job through stages:
- **Saved** → Job saved for later
- **Applied** → Application submitted
- **Interview** → Interview scheduled
- **Offer** → Offer received
- **Rejected** → Not selected

---

## 🤝 Contributing

This is an open-source project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## �📝 License

MIT License - feel free to use for personal or commercial projects.

---

## 🆘 Support & Documentation

- **API Reference:** http://localhost:8000/docs
- **Architecture:** See `ARCHITECTURE.md`
- **Backend Setup:** See `backend/README.md`
- **Integration Guide:** See `INTEGRATION_GUIDE.md`
- **Quick Reference:** See `QUICK_REFERENCE.md`

---

## ✨ What Makes This Different

✅ **Fully Self-Hosted** - No external dependencies (except OpenAI)
✅ **Open Source** - Own your code and data  
✅ **Modern Stack** - FastAPI + React best practices
✅ **AI-Powered** - Smart matching and cover letters
✅ **Production Ready** - Includes auth, validation, docs
✅ **Easy Setup** - Running in minutes

---

**Start your smarter job search today!**
