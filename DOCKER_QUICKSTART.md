# Quick Start with Docker

## Local Development (Redis + Backend + Frontend)

### 1. Start Redis Only
```bash
cd /Users/alisaree/Desktop/JobMateAI
docker-compose up -d redis

# Check if running
docker ps | grep redis
```

### 2. Start Backend (connects to Redis)
```bash
cd backend
./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Start Frontend
```bash
cd /Users/alisaree/Desktop/JobMateAI
npm run dev
```

Visit: http://localhost:5173

## Or Run Everything in Docker

```bash
# Start all services (Redis + PostgreSQL + Backend + Frontend)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all
docker-compose down
```

## Test Redis Caching

```bash
# 1. Load Israeli Jobs page - will be slow (scraping)
curl "http://localhost:8000/api/jobs/scrape/drushim?url=https://www.drushim.co.il/jobs/subcat/236"

# 2. Load again - instant! (from cache)
curl "http://localhost:8000/api/jobs/scrape/drushim?url=https://www.drushim.co.il/jobs/subcat/236"

# 3. Check cache stats
curl "http://localhost:8000/api/jobs/cache/stats" | jq

# Expected output:
# {
#   "backend": "redis",
#   "total_keys": 1,
#   "hits": 1,
#   "misses": 1
# }
```

## Cache Benefits

**Without Cache:**
- Every user request = new scrape
- 5-8 seconds per request
- Heavy load on Drushim
- Risk of IP blocking

**With Redis Cache:**
- First request = scrape + cache (5-8 seconds)
- All subsequent requests = instant (<100ms)
- 30-minute TTL (auto-refresh)
- Can handle 1000s of users

## Monitoring Redis

```bash
# Connect to Redis CLI
docker exec -it jobmate-redis redis-cli

# Inside Redis CLI:
> KEYS *                 # List all keys
> GET jobs:drushim:236   # Get cached jobs
> TTL jobs:drushim:236   # Check time to live
> INFO stats             # Get statistics
> FLUSHALL               # Clear all cache (careful!)
> exit
```

## Environment Variables

Create `.env` file:
```env
# Redis
REDIS_URL=redis://localhost:6379/0

# Database
DATABASE_URL=sqlite:///./jobmate.db

# OpenAI
OPENAI_API_KEY=your-key-here

# Security
SECRET_KEY=your-secret-key

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Troubleshooting

**Redis not connecting:**
```bash
# Check Redis is running
docker ps | grep redis

# Restart Redis
docker-compose restart redis

# Check logs
docker-compose logs redis
```

**Backend can't connect to Redis:**
- Falls back to in-memory cache automatically
- Check REDIS_URL in environment
- Verify Redis is on port 6379

**Clear cache:**
```bash
# Via API
curl -X DELETE "http://localhost:8000/api/jobs/cache/clear"

# Or via Redis
docker exec -it jobmate-redis redis-cli FLUSHALL
```
