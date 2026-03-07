# Ingestion API (n8n -> Backend)

This document explains the ingestion endpoint and how to run the backend for the Jobs Digest MVP.

Environment variables

- `INGESTION_API_KEY` (or `ingestion_api_key` in `.env`): shared secret for n8n to call ingestion endpoint. Default `changeme` in development.
- `DATABASE_URL`: e.g. `sqlite:///./jobmate.db` (set in `.env` as `database_url`).

Running the backend (development)

```bash
cd backend
# (optional) create venv and install requirements
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# run
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Ingestion endpoint

POST /api/ingest/linkedin-email
Headers: `X-API-KEY: <INGESTION_API_KEY>`

Example payload:

```json
{
  "source": "linkedin_email",
  "runId": "2026-02-11T09:13:11.000Z_19c4bf9e369f5599",
  "email": {
    "emailId": "19c4bf9e369f5599",
    "receivedAt": "2026-02-11T09:13:11.000Z",
    "subject": "...",
    "snippet": "..."
  },
  "jobs": [
    {
      "title": "AI & Automation Engineer",
      "company": "DriveNets",
      "location": "",
      "url": "https://...",
      "raw": {"source": "LinkedIn Email (Subject/Snippet)"}
    }
  ]
}
```

Example curl:

```bash
curl -X POST 'http://localhost:8000/api/ingest/linkedin-email' \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: changeme" \
  -d @payload.json
```

Feed APIs (UI -> Backend)

- `GET /api/jobs` - list ingested jobs. Query params: `status`, `q`, `days`, `sort`
- `PATCH /api/jobs/{id}/status` - update job status. Body: `{ "status": "saved" }`
- `GET /api/jobs/today-count` - returns `{ "newToday": 12 }`

Notes

- n8n should NOT write to DB directly. It must POST to the ingestion endpoint above.
- UI must only talk to the backend endpoints listed above.
- The backend handles validation, dedupe, and status logic.

"""
