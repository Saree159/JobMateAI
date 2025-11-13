# 🚀 Quick Start Guide - JobMate AI

Get JobMate AI running in under 5 minutes!

---

## Choose Your Setup Method

### 🐳 Docker (Easiest - Recommended)

**Best for:** Production deployment, testing with PostgreSQL

```bash
# 1. Clone
git clone https://github.com/Saree159/JobMateAI.git
cd JobMateAI

# 2. Configure
cp .env.docker.example .env
# Edit .env: Add your OPENAI_API_KEY

# 3. Start
docker-compose up -d

# 4. Access
# Frontend: http://localhost
# Backend: http://localhost:8000/docs
```

**Required environment variables in .env:**
```bash
OPENAI_API_KEY=sk-your-key-here
SECRET_KEY=generate-with-python-secrets
DB_PASSWORD=choose-a-strong-password
```

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

### 💻 Local Development

**Best for:** Development, testing, customization

**Prerequisites:**
- Python 3.9+
- Node.js 18+
- OpenAI API key

#### Backend (Terminal 1)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env: Add OPENAI_API_KEY

# Start server
uvicorn app.main:app --reload
```

✅ Backend running at: http://localhost:8000  
✅ API docs: http://localhost:8000/docs

#### Frontend (Terminal 2)

```bash
# From project root
npm install

# Start dev server
npm run dev
```

✅ Frontend running at: http://localhost:5173

---

## First Steps After Setup

1. **Open the app**: http://localhost:5173 (or http://localhost for Docker)

2. **Create account**:
   - Click "Sign up"
   - Enter email and password
   - Complete onboarding with your profile

3. **Add your first job**:
   - Click "Add Job" button
   - Fill in job details (title, company, description)
   - Click "Calculate Match Score" to see AI compatibility

4. **Try AI features**:
   - ✉️ Generate cover letter
   - 🎤 Get interview preparation questions
   - 💰 View salary insights
   - 📄 Upload your resume (Profile page)

---

## Common Issues & Solutions

### Issue: Backend won't start

**Error:** `ModuleNotFoundError`
```bash
# Solution: Install dependencies
cd backend
pip install -r requirements.txt
```

**Error:** `IndentationError`
```bash
# Solution: Check Python version (need 3.9+)
python --version
```

### Issue: Frontend won't start

**Error:** `Cannot find module`
```bash
# Solution: Install dependencies
npm install
```

**Error:** `Port 5173 already in use`
```bash
# Solution: Kill process or use different port
npm run dev -- --port 3000
```

### Issue: AI features not working

**Error:** `OpenAI API error`
```bash
# Solution: Check .env file
cd backend
cat .env  # or: type .env (Windows)
# Verify OPENAI_API_KEY is set correctly
```

**Error:** `Rate limit exceeded`
- You've hit OpenAI API limits
- Wait a few minutes or upgrade your OpenAI plan

### Issue: Docker containers won't start

**Error:** `port is already allocated`
```bash
# Solution: Stop conflicting services
docker-compose down
# Or change ports in docker-compose.yml
```

**Error:** `database connection failed`
```bash
# Solution: Wait for database to be ready
docker-compose logs db
# Look for "database system is ready to accept connections"
```

---

## Testing Your Setup

### Test Backend
```bash
# Open in browser
http://localhost:8000/docs

# Try the health check endpoint
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### Test Frontend
```bash
# Open in browser
http://localhost:5173

# You should see:
# - Login/Register page
# - No errors in browser console (F12)
```

### Test AI Features
1. Create account and log in
2. Add a job with description
3. Click "Calculate Match Score"
4. If it works → ✅ Everything is set up correctly!

---

## Development Workflow

### Making Changes

**Frontend changes:**
- Edit files in `src/`
- Vite will auto-reload
- Check console for errors

**Backend changes:**
- Edit files in `backend/app/`
- FastAPI will auto-reload (--reload flag)
- Check terminal for errors

### Viewing Database

**SQLite (development):**
```bash
cd backend
sqlite3 jobmate.db
.tables
SELECT * FROM users;
.quit
```

**PostgreSQL (Docker):**
```bash
docker-compose exec db psql -U jobmate jobmate
\dt  # List tables
SELECT * FROM users;
\q
```

### Stopping Services

**Local development:**
- Ctrl+C in each terminal

**Docker:**
```bash
docker-compose down
# Keep data: docker-compose stop
```

---

## Next Steps

✅ **Setup complete!** Here's what to explore:

1. **Add multiple jobs** to test the pipeline
2. **Upload your resume** on Profile page
3. **Export applications** to CSV/PDF
4. **Try email notifications** (configure SMTP)
5. **Check out API docs** at /docs endpoint
6. **Deploy to production** (see DEPLOYMENT.md)

---

## Getting Help

- **Documentation**: Check README.md and DEPLOYMENT.md
- **API Reference**: http://localhost:8000/docs
- **Issues**: https://github.com/Saree159/JobMateAI/issues

---

## Environment Variables Reference

### Backend (.env)

**Required:**
```bash
OPENAI_API_KEY=sk-...           # Your OpenAI API key
SECRET_KEY=random-32-chars      # For JWT tokens
DATABASE_URL=sqlite:///./jobmate.db  # Or PostgreSQL URL
```

**Optional:**
```bash
CORS_ORIGINS=http://localhost:5173
SMTP_SERVER=smtp.gmail.com     # For email notifications
SMTP_PORT=587
SMTP_USERNAME=your@email.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@domain.com
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000  # Backend URL
```

---

**Happy job hunting!** 🎯
