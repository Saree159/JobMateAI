# JobMate AI - Deployment Guide

Complete guide for deploying JobMate AI to production using various methods.

---

## Table of Contents
1. [Docker Deployment (Recommended)](#docker-deployment)
2. [Manual Deployment](#manual-deployment)
3. [Cloud Platform Deployment](#cloud-platforms)
4. [Environment Configuration](#environment-configuration)
5. [Database Migration](#database-migration)
6. [SSL/HTTPS Setup](#ssl-setup)
7. [Monitoring & Maintenance](#monitoring)

---

## Docker Deployment (Recommended)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Domain name (optional, for production)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Saree159/JobMateAI.git
   cd JobMateAI
   ```

2. **Configure environment**
   ```bash
   cp .env.docker.example .env
   # Edit .env and fill in your values
   ```

3. **Build and start services**
   ```bash
   docker-compose up -d
   ```

4. **Check status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **Access application**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Docker Services

The docker-compose setup includes:
- **PostgreSQL 15**: Production database
- **Backend (FastAPI)**: API server on port 8000
- **Frontend (Nginx)**: Static frontend on port 80

### Managing Docker Deployment

**Stop services:**
```bash
docker-compose down
```

**Stop and remove volumes (⚠️ deletes data):**
```bash
docker-compose down -v
```

**View logs:**
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db
```

**Restart a service:**
```bash
docker-compose restart backend
```

**Update to latest code:**
```bash
git pull
docker-compose up -d --build
```

**Backup database:**
```bash
docker-compose exec db pg_dump -U jobmate jobmate > backup.sql
```

**Restore database:**
```bash
docker-compose exec -T db psql -U jobmate jobmate < backup.sql
```

---

## Manual Deployment

### Backend (FastAPI)

**1. Prepare server**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3-pip postgresql nginx

# Create application user
sudo useradd -m -s /bin/bash jobmate
sudo su - jobmate
```

**2. Setup application**
```bash
git clone https://github.com/Saree159/JobMateAI.git
cd JobMateAI/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

**3. Configure environment**
```bash
cp .env.example .env
nano .env
# Set DATABASE_URL to PostgreSQL
# Set production SECRET_KEY
# Add OPENAI_API_KEY
```

**4. Setup database**
```bash
sudo -u postgres psql
CREATE DATABASE jobmate;
CREATE USER jobmate WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jobmate TO jobmate;
\q
```

**5. Create systemd service**
```bash
sudo nano /etc/systemd/system/jobmate-backend.service
```

```ini
[Unit]
Description=JobMate AI Backend
After=network.target postgresql.service

[Service]
Type=exec
User=jobmate
WorkingDirectory=/home/jobmate/JobMateAI/backend
Environment="PATH=/home/jobmate/JobMateAI/backend/venv/bin"
ExecStart=/home/jobmate/JobMateAI/backend/venv/bin/gunicorn app.main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/jobmate/access.log \
    --error-logfile /var/log/jobmate/error.log
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**6. Start service**
```bash
sudo mkdir -p /var/log/jobmate
sudo chown jobmate:jobmate /var/log/jobmate
sudo systemctl daemon-reload
sudo systemctl enable jobmate-backend
sudo systemctl start jobmate-backend
sudo systemctl status jobmate-backend
```

### Frontend (React)

**1. Build frontend**
```bash
cd JobMateAI
npm install
npm run build
# Creates dist/ folder
```

**2. Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/jobmate
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /home/jobmate/JobMateAI/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**3. Enable site**
```bash
sudo ln -s /etc/nginx/sites-available/jobmate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Cloud Platforms

### Railway (Easiest)

**Backend:**
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add PostgreSQL service
5. Set environment variables:
   - `DATABASE_URL` (auto-set from PostgreSQL)
   - `SECRET_KEY`
   - `OPENAI_API_KEY`
   - `CORS_ORIGINS`
6. Set root directory to `backend/`
7. Deploy!

**Frontend:**
1. Connect same repository
2. Set environment variable: `VITE_API_URL` (your backend URL)
3. Deploy!

### Vercel (Frontend Only)

```bash
npm install -g vercel
vercel login
vercel
# Follow prompts
```

Add environment variable in Vercel dashboard:
- `VITE_API_URL`: Your backend API URL

### Render

**Backend:**
1. New → Web Service
2. Connect GitHub repository
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
6. Add PostgreSQL database
7. Set environment variables

**Frontend:**
1. New → Static Site
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`
4. Add environment variable: `VITE_API_URL`

---

## Environment Configuration

### Production Environment Variables

**Backend (.env):**
```bash
# Database - Use PostgreSQL in production
DATABASE_URL=postgresql://user:password@host:5432/jobmate

# Security - Generate strong random key
SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# OpenAI API
OPENAI_API_KEY=sk-your-production-key

# CORS - Set to your frontend domains
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourdomain.com

# Server
HOST=0.0.0.0
PORT=8000
```

**Frontend (.env):**
```bash
# API URL - Your production backend
VITE_API_URL=https://api.yourdomain.com
```

### Generating Secure Keys

```bash
# Python
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# OpenSSL
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Migration

### SQLite to PostgreSQL

**1. Dump SQLite data**
```bash
# Install sqlite3
sqlite3 jobmate.db .dump > dump.sql
```

**2. Convert SQL (remove SQLite-specific syntax)**
```bash
# Remove SQLite-specific commands
sed -i '/PRAGMA/d' dump.sql
sed -i '/BEGIN TRANSACTION/d' dump.sql
sed -i '/COMMIT/d' dump.sql
```

**3. Import to PostgreSQL**
```bash
psql -U jobmate -d jobmate < dump.sql
```

### Alternative: Use Python Script

```python
# migrate_db.py
from sqlalchemy import create_engine
from app.models import Base
from app.database import get_db

# Old database
old_engine = create_engine('sqlite:///./jobmate.db')

# New database
new_engine = create_engine('postgresql://user:pass@localhost/jobmate')

# Create tables
Base.metadata.create_all(bind=new_engine)

# Copy data (implement per table)
# ... your migration logic
```

---

## SSL Setup

### Using Certbot (Let's Encrypt)

**1. Install Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
```

**2. Obtain certificate**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**3. Auto-renewal**
```bash
sudo certbot renew --dry-run
```

Certbot auto-configures Nginx for HTTPS!

### Manual SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring

### Health Checks

**Backend:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","database":"connected"}
```

**Frontend:**
```bash
curl http://localhost/
# Should return HTML
```

### Logging

**View backend logs:**
```bash
# Systemd
sudo journalctl -u jobmate-backend -f

# Docker
docker-compose logs -f backend

# Direct logs
tail -f /var/log/jobmate/error.log
```

### Monitoring Tools

**Option 1: Uptime Robot**
- Free tier: 50 monitors
- Check every 5 minutes
- Email/SMS alerts

**Option 2: Prometheus + Grafana**
```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
```

**Option 3: Sentry (Error Tracking)**
```bash
pip install sentry-sdk[fastapi]
```

```python
# In app/main.py
import sentry_sdk
sentry_sdk.init(dsn="your-sentry-dsn")
```

### Database Backups

**Automated backup script:**
```bash
#!/bin/bash
# /home/jobmate/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/jobmate/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U jobmate jobmate > $BACKUP_DIR/jobmate_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "jobmate_*.sql" -mtime +7 -delete
```

**Schedule with cron:**
```bash
crontab -e
# Add: Daily backup at 2 AM
0 2 * * * /home/jobmate/backup.sh
```

---

## Troubleshooting

### Common Issues

**1. CORS Errors**
- Check `CORS_ORIGINS` in backend `.env`
- Ensure frontend URL is included
- Restart backend after changes

**2. Database Connection Failed**
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

**3. OpenAI API Errors**
- Verify `OPENAI_API_KEY` is valid
- Check API quota and billing
- AI features will fail but app still works

**4. Build Failures**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Docker cache: `docker-compose build --no-cache`
- Check Node/Python versions

**5. Nginx 502 Bad Gateway**
- Check backend is running
- Verify proxy_pass URL is correct
- Check firewall rules

---

## Security Checklist

✅ Use strong `SECRET_KEY` (32+ characters)  
✅ Use HTTPS in production  
✅ Set `CORS_ORIGINS` to specific domains  
✅ Use PostgreSQL (not SQLite) in production  
✅ Keep dependencies updated  
✅ Set file upload size limits  
✅ Use environment variables (never commit secrets)  
✅ Enable rate limiting  
✅ Regular database backups  
✅ Monitor error logs  
✅ Use strong database passwords  

---

## Performance Optimization

**Backend:**
- Use connection pooling
- Enable database query caching
- Use Redis for session storage
- Implement API rate limiting

**Frontend:**
- Enable Gzip/Brotli compression
- Use CDN for static assets
- Implement lazy loading
- Optimize images

**Database:**
- Add indexes on frequently queried columns
- Use database connection pool
- Regular VACUUM and ANALYZE

---

## Support

Need help with deployment?
- Check [GitHub Issues](https://github.com/Saree159/JobMateAI/issues)
- Review [Documentation](README.md)
- Contact support

---

**Happy Deploying!** 🚀
