# JobMate AI

**The ultimate AI-powered job search management platform - fully self-hosted and feature-rich.**

Track applications, get AI match scores, generate personalized cover letters, receive interview preparation, and get salary insights - all while maintaining complete control of your data.

---

## 🚀 Core Features

### Application Management
- **Smart Job Tracking**: Manage jobs through a complete pipeline (Saved → Applied → Interview → Offer → Rejected)
- **Profile Management**: Comprehensive profile with skills, experience level, and preferences
- **Advanced Filtering**: Search jobs by title, company, or status with real-time updates
- **Timestamped Notes**: Add notes to track follow-ups, conversations, and important details
- **Application Stats**: Visual dashboard with success rates and pipeline metrics

### AI-Powered Intelligence
- **Match Scoring (0-100)**: Hybrid algorithm combining keyword matching + semantic similarity
- **Cover Letter Generation**: Personalized, ATS-optimized cover letters using GPT-4o-mini
- **Interview Preparation**: Behavioral, technical, and company-specific questions
- **Salary Insights**: Real-time salary estimates with market analysis and range predictions

### Power Features
- **Resume Parsing**: Upload PDF or DOCX resumes for automatic skill extraction (50+ tech skills)
- **Export to CSV/PDF**: Professional reports with statistics and detailed application tables
- **Email Notifications**: Interview reminders, follow-up alerts, and deadline notifications
- **Visual Analytics**: Application statistics with match score trends and status breakdown

### Production Ready
- **Docker Support**: Complete containerization with PostgreSQL and multi-stage builds
- **Security**: JWT authentication, bcrypt password hashing, CORS protection, input validation
- **Performance**: Skeleton loading states, optimized queries, responsive UI
- **Self-Hosted**: Own your data, no external dependencies (except OpenAI for AI features)

---

## 🛠️ Quick Start

### Option 1: Docker (Recommended)

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
# Edit .env: Add OPENAI_API_KEY, set SECRET_KEY, DB_PASSWORD

# Build and start
docker-compose up -d

# Access application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

**Prerequisites:**
- Node.js 18+
- Python 3.9+
- OpenAI API key

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env: Add your OPENAI_API_KEY

# Start server
uvicorn app.main:app --reload
```

Backend: http://localhost:8000

**Frontend:**
```bash
# From project root
npm install
npm run dev
```

Frontend: http://localhost:5173

**Get Started:**
1. Visit http://localhost:5173
2. Sign up and complete onboarding
3. Start tracking jobs!

---

## 📦 Tech Stack

**Frontend:**
- React 18 + Vite
- React Router v6
- TanStack Query (React Query)
- Tailwind CSS + Radix UI (shadcn/ui)
- Sonner (toast notifications)
- jsPDF, Papaparse (export functionality)

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL (production) / SQLite (dev)
- OpenAI GPT-4o-mini
- Scikit-learn (match scoring)
- PyPDF2, python-docx (resume parsing)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (production web server)
- Gunicorn (ASGI server)

---

## 📁 Project Structure

```
JobMateAI/
├── src/                          # React frontend
│   ├── api/
│   │   └── jobmate.js            # Backend API client
│   ├── components/               # UI components
│   │   ├── applications/         # Application cards & stats
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── jobs/                 # Job listings & filters
│   │   └── ui/                   # shadcn/ui components
│   ├── pages/                    # Page components
│   │   ├── Dashboard.jsx         # Main dashboard
│   │   ├── Jobs.jsx              # Job listings
│   │   ├── JobDetails.jsx        # Job details + AI features
│   │   ├── Applications.jsx      # Application tracking
│   │   └── Profile.jsx           # User profile + resume upload
│   ├── lib/
│   │   └── AuthContext.jsx       # JWT authentication
│   └── utils/
│       └── exportUtils.js        # CSV/PDF export
│
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── database.py          # Database setup
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── routers/             # API endpoints
│   │   │   ├── users.py         # User management + auth
│   │   │   ├── jobs.py          # Job management
│   │   │   ├── resume.py        # Resume upload & parsing
│   │   │   └── notifications.py  # Email notifications
│   │   └── services/
│   │       ├── ai.py            # AI features (match, cover letter, interview, salary)
│   │       └── notifications.py  # Email service
│   ├── migrate_to_postgres.py   # Database migration script
│   └── requirements.txt
│
├── docker-compose.yml            # Multi-container setup
├── Dockerfile                    # Frontend Docker image
├── backend/Dockerfile            # Backend Docker image
├── nginx.conf                    # Production web server config
├── DEPLOYMENT.md                 # Comprehensive deployment guide
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
- `GET /api/users/{id}/jobs` - List all jobs
- `GET /api/jobs/{id}` - Get job details
- `PUT /api/jobs/{id}` - Update job
- `DELETE /api/jobs/{id}` - Delete job

### AI Features
- `POST /api/jobs/{id}/match` - Calculate AI match score (0-100)
- `POST /api/jobs/{id}/cover-letter` - Generate personalized cover letter
- `GET /api/jobs/{id}/interview-questions` - Get interview prep (behavioral/technical/company)
- `GET /api/jobs/{id}/salary-estimate` - Get salary range + market insights

### Resume & Notifications
- `POST /api/resume/upload` - Upload and parse resume (PDF/DOCX, max 5MB)
- `POST /api/notifications/send-test` - Send test email notification
- `POST /api/notifications/jobs/{id}/send-reminder` - Send interview/follow-up reminder

**Interactive API Docs:** http://localhost:8000/docs

---

## 🎯 Key Features Explained

### AI Match Scoring
- **Hybrid algorithm**: 50% keyword matching + 50% semantic similarity using TF-IDF and cosine similarity
- Returns 0-100 score with detailed breakdown of matched and missing skills
- Helps prioritize which jobs to apply for based on compatibility
- Updates stored in database for trend analysis

### AI Cover Letter Generation
- Powered by OpenAI GPT-4o-mini (cost-efficient, high-quality)
- Tailored to job description, company, and your profile
- Professional business letter format optimized for ATS systems
- 250-350 words with proper structure
- Saved to database for future editing and reuse

### Interview Preparation
- **Behavioral Questions** (5): STAR method-focused questions based on job requirements
- **Technical Questions** (5): Role-specific technical assessments and problem-solving
- **Company-Specific Questions** (3): Questions about company culture, values, and expectations
- AI-generated based on job description and your background
- Helps prepare for different interview scenarios and types

### Salary Insights
- Real-time salary estimates powered by AI market analysis
- Returns min/median/max salary range (e.g., $80K/$95K/$110K)
- 3-5 market insights explaining the estimate
- Factors analyzed: job title, location, experience years, skills, company size
- Helps with salary negotiation and managing expectations

### Resume Parsing
- Supports both PDF and DOCX formats (max 5MB file size)
- Automatic extraction of: name, job title, skills, location
- Recognizes 50+ technology skills (Python, JavaScript, AWS, React, Docker, etc.)
- Extracts text from DOCX tables (common in modern resumes)
- Updates profile automatically with parsed information

### Export & Reporting
- **CSV Export**: Spreadsheet-compatible format for Excel, Google Sheets, data analysis
- **PDF Export**: Professional report including:
  - Summary statistics (total applications, success rate, avg match score)
  - Detailed table with all applications and status
  - Formatted with jsPDF and autotable for clean layout
- One-click export button from Applications page

### Email Notifications (Optional)
- **Interview Reminders**: Automated reminders before scheduled interviews
- **Follow-up Alerts**: Track when to follow up with companies after applying
- **Deadline Notifications**: Application deadline reminders to never miss an opportunity
- Professional HTML email templates
- SMTP configuration via environment variables (Gmail, SendGrid, etc.)

### Job Application Pipeline
Visual tracking through 5 stages:
- **Saved** 📌 → Job bookmarked for future application
- **Applied** ✉️ → Application submitted with date tracking
- **Interview** 🎤 → Interview scheduled (use prep tools!)
- **Offer** 🎉 → Offer received (congrats!)
- **Rejected** ❌ → Not selected (learn and move forward)

---

## 🔧 Development

### Running Both Services

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Environment Variables

**Frontend (.env in root):**
```bash
VITE_API_URL=http://localhost:8000
```

**Backend (backend/.env):**
```bash
# Database
DATABASE_URL=sqlite:///./jobmate.db  # Dev
# DATABASE_URL=postgresql://user:pass@localhost/jobmate  # Production

# Security
SECRET_KEY=your-secret-key-here  # Generate: python -c 'import secrets; print(secrets.token_urlsafe(32))'
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Email (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourdomain.com
```

### Database Management

**View SQLite database:**
```bash
cd backend
sqlite3 jobmate.db
.tables
.schema users
SELECT * FROM users;
.quit
```

**Migrate to PostgreSQL:**
```bash
cd backend
python migrate_to_postgres.py --source sqlite:///./jobmate.db --target postgresql://user:pass@localhost/jobmate --dry-run
# Remove --dry-run to actually migrate
```

---

## 🧪 Testing

**Backend API Tests:**
```bash
cd backend
pytest test_api.py -v
```

**Manual Testing:**
- Swagger UI: http://localhost:8000/docs
- Test each endpoint interactively
- View database: `sqlite3 backend/jobmate.db`

---

## 🚢 Deployment

**See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guide including:**
- Docker deployment (recommended)
- Railway (easiest cloud deployment)
- Render (web services)
- Vercel (frontend) + Railway (backend)
- Manual VPS deployment with Nginx
- SSL/HTTPS setup with Let's Encrypt
- Database migration from SQLite to PostgreSQL
- Monitoring and backup strategies

### Quick Production Checklist

✅ Use PostgreSQL (not SQLite)  
✅ Set strong SECRET_KEY (32+ characters)  
✅ Enable HTTPS/SSL with Let's Encrypt  
✅ Configure CORS_ORIGINS to your domains  
✅ Set up regular database backups  
✅ Configure email SMTP (optional)  
✅ Monitor application health and errors  
✅ Keep dependencies updated  

---

## 🤝 Contributing

Open-source project - contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License - free to use for personal or commercial projects.

---

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide for all platforms
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design decisions
- **API Docs** - http://localhost:8000/docs (interactive Swagger UI)
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick command reference

---

## ✨ What Makes This Different

✅ **Fully Self-Hosted** - Complete control of your data and infrastructure  
✅ **Open Source** - Transparent code, customizable to your needs  
✅ **Modern Stack** - FastAPI + React with best practices  
✅ **AI-Powered** - Smart matching, cover letters, interview prep, salary insights  
✅ **Production Ready** - Docker, authentication, validation, monitoring  
✅ **Feature Rich** - Resume parsing, email notifications, CSV/PDF export  
✅ **Easy Setup** - Running in minutes with Docker or local development  
✅ **No Vendor Lock-in** - Standard technologies, portable deployment  

---

## 🆘 Support

Need help?
- **GitHub Issues**: [Report bugs or request features](https://github.com/Saree159/JobMateAI/issues)
- **Documentation**: Check DEPLOYMENT.md and ARCHITECTURE.md
- **API Reference**: http://localhost:8000/docs

---

## 🗺️ Roadmap

**Completed:**
- ✅ Phase 1: UX Polish (notifications, validation, search, loading states)
- ✅ Phase 2: Power Features (export, resume parsing, email, interview prep, salary insights)
- ✅ Phase 3: Production Deployment (Docker, deployment guides, migration scripts)

**Coming Soon:**
- 📊 Analytics Dashboard (success rates, time-to-response metrics, trends)
- 🔔 Job Alerts System (email when matching jobs are added)
- 🔗 LinkedIn Integration (auto-import job postings)
- 📱 Mobile App (React Native)
- 🤖 Advanced AI (resume improvements, application tracking predictions)

---

**Start your smarter job search today!** 🚀

Built with ❤️ using FastAPI and React
