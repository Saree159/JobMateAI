# JobMate AI

**A fully standalone, self-hosted AI-powered job search management platform.**

Track applications, get AI match scores, and generate personalized cover letters - all without relying on external services.

## 🚀 Features

- **Profile Management**: Create a profile with skills, target role, and preferences
- **Job Tracking**: Add and manage job postings through a pipeline (Saved → Applied → Interview → Offer → Rejected)
- **AI Match Scoring**: Get compatibility scores based on your skills vs job requirements (0-100 score)
- **Cover Letter Generation**: AI-generated personalized cover letters for each job using GPT-4
- **Application Pipeline**: Visual tracking through the interview process
- **Completely Self-Hosted**: Own your data, no external dependencies (except OpenAI for AI features)

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

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- OpenAI API key (for AI features)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/JobMateAI.git
cd JobMateAI
```

#### 2. Setup Backend
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

Backend will be available at: http://localhost:8000
- API Docs: http://localhost:8000/docs

#### 3. Setup Frontend
```bash
# In a new terminal, from project root
npm install
npm run dev
```

Frontend will be available at: http://localhost:5173

#### 4. Create Your Account
1. Visit http://localhost:5173
2. Click "Sign up" to create an account
3. Complete your profile in the onboarding flow
4. Start adding jobs!

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
- `POST /api/users` - Register
- `POST /api/users/login` - Login (returns JWT)

### Users
- `GET /api/users/{id}` - Get profile
- `PUT /api/users/{id}` - Update profile

### Jobs
- `POST /api/users/{id}/jobs` - Create job
- `GET /api/users/{id}/jobs` - List user's jobs
- `GET /api/jobs/{id}` - Get job details
- `PUT /api/jobs/{id}` - Update job
- `POST /api/jobs/{id}/match` - Calculate AI match score
- `POST /api/jobs/{id}/cover-letter` - Generate cover letter

Full API documentation: http://localhost:8000/docs

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
