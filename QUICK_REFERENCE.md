# 🚀 Quick Reference - JobMate AI

## Starting the Application

### Backend (Terminal 1)
```bash
cd backend
venv\Scripts\activate      # Windows
source venv/bin/activate   # Mac/Linux
uvicorn app.main:app --reload
```
**Or use quick-start:**
```bash
cd backend
start.bat   # Windows only
```

### Frontend (Terminal 2)
```bash
npm run dev
```

---

## Environment Setup (First Time Only)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Edit `backend/.env`:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

### Frontend
```bash
npm install
```

---

## API Endpoints Cheat Sheet

### Base URL
```
http://localhost:8000
```

### User Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create user |
| GET | `/api/users/{id}` | Get user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |
| POST | `/api/users/login` | Login |

### Job Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/{id}/jobs` | Create job |
| GET | `/api/users/{id}/jobs` | List jobs |
| GET | `/api/jobs/{id}` | Get job |
| PUT | `/api/jobs/{id}` | Update job |
| DELETE | `/api/jobs/{id}` | Delete job |
| POST | `/api/jobs/{id}/match` | Match score |
| POST | `/api/jobs/{id}/cover-letter` | Generate letter |

---

## Frontend API Usage

### Import
```javascript
import { userApi, jobApi } from '@/api/jobmate';
```

### Create User
```javascript
const user = await userApi.create({
  email: 'user@example.com',
  password: 'password123',
  full_name: 'John Doe',
  target_role: 'Software Engineer',
  skills: ['Python', 'React', 'SQL']
});
```

### Create Job
```javascript
const job = await jobApi.create(userId, {
  title: 'Backend Developer',
  company: 'Tech Corp',
  description: 'Looking for Python developer...',
  location: 'Remote'
});
```

### Calculate Match
```javascript
const match = await jobApi.calculateMatchScore(jobId);
console.log(match.match_score); // 0-100
console.log(match.matched_skills); // ['Python', 'SQL']
```

### Generate Cover Letter
```javascript
const result = await jobApi.generateCoverLetter(jobId);
console.log(result.cover_letter);
```

---

## React Query Examples

### Fetch Data
```javascript
const { data: jobs, isLoading } = useQuery({
  queryKey: ['jobs', userId],
  queryFn: () => jobApi.listByUser(userId)
});
```

### Mutate Data
```javascript
const createMutation = useMutation({
  mutationFn: (data) => jobApi.create(userId, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['jobs', userId]);
  }
});

await createMutation.mutateAsync(jobData);
```

---

## Database Commands

### View Database
```bash
cd backend
sqlite3 jobmate.db
```

### Common SQL Queries
```sql
-- List all users
SELECT * FROM users;

-- List all jobs
SELECT * FROM jobs;

-- Jobs with match scores
SELECT title, company, match_score FROM jobs WHERE match_score IS NOT NULL;

-- Count jobs by status
SELECT status, COUNT(*) FROM jobs GROUP BY status;
```

---

## Testing

### Backend Tests
```bash
cd backend
pytest test_api.py -v
```

### Manual Testing
1. Visit http://localhost:8000/docs
2. Try endpoints in Swagger UI
3. Check database: `sqlite3 backend/jobmate.db`

### Frontend Testing
```bash
npm run typecheck  # Type checking
npm run lint       # Linting
```

---

## Common Issues & Solutions

### Issue: "Import errors in Python"
**Solution:** Activate virtual environment
```bash
cd backend
venv\Scripts\activate
```

### Issue: "Module not found"
**Solution:** Install dependencies
```bash
pip install -r requirements.txt
```

### Issue: "OpenAI API error"
**Solution:** Check API key in `.env`
```bash
OPENAI_API_KEY=sk-your-key-here
```

### Issue: "CORS error"
**Solution:** Check CORS_ORIGINS in `.env`
```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Issue: "Database locked"
**Solution:** Close other connections
```bash
# Delete and recreate
rm backend/jobmate.db
# Restart backend - it will recreate tables
```

---

## File Locations

| What | Where |
|------|-------|
| Backend code | `backend/app/` |
| Frontend code | `src/` |
| API client | `src/api/jobmate.js` |
| Database | `backend/jobmate.db` |
| Environment config | `backend/.env` |
| Documentation | `*.md` files in root |

---

## Useful URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |

---

## Key Concepts

### Match Score Algorithm
1. **Exact matching (50%)** - Skills in job description
2. **Semantic matching (50%)** - TF-IDF + cosine similarity
3. **Result** - 0-100 score + matched/missing skills

### Cover Letter Generation
1. User profile + job details → OpenAI GPT-4
2. Personalized, professional tone
3. 250-300 words
4. Saved to database

### Job Status Flow
```
Saved → Applied → Interview → Offer/Rejected
```

---

## Development Workflow

### Adding a New Feature
1. **Backend**: Add endpoint in `app/routers/`
2. **Backend**: Add business logic in `app/services/`
3. **Frontend**: Add function to `src/api/jobmate.js`
4. **Frontend**: Use in component with React Query
5. **Test**: Use Swagger UI + browser

### Making Changes
1. Backend: Save file → auto-reload (with `--reload`)
2. Frontend: Save file → Vite HMR (instant update)
3. Test changes immediately

---

## Production Checklist

- [ ] Change SECRET_KEY in `.env`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Set up monitoring/logging
- [ ] Use Gunicorn + Uvicorn workers
- [ ] Build frontend: `npm run build`
- [ ] Set production CORS origins
- [ ] Implement refresh tokens
- [ ] Add database backups

---

**Need Help?**
- Check `BACKEND_SUMMARY.md` for overview
- Read `INTEGRATION_GUIDE.md` for examples
- Review `ARCHITECTURE.md` for design
- Use `/docs` for API reference
