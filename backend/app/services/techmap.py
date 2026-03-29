"""
TechMap fetcher — downloads open Israeli tech job CSVs from GitHub.
https://github.com/mluggy/techmap
License: ODbL v1.0 — free commercial use with attribution.

CSV columns: company, category, size, title, level, city, url, updated
"""
import csv
import io
import asyncio
import logging
from typing import List, Dict

import httpx

logger = logging.getLogger(__name__)

_BASE = "https://raw.githubusercontent.com/mluggy/techmap/main/jobs/{}.csv"

# Role keywords → which CSV files to pull
_ROLE_CSV_MAP: list[tuple[list[str], list[str]]] = [
    (["data scientist", "data science", "machine learning", "ml engineer", "ai engineer", "nlp"], ["data-science", "software"]),
    (["product manager", "product management", " pm "], ["product"]),
    (["frontend", "react developer", "vue", "angular", "web developer"], ["frontend", "design", "software"]),
    (["backend", "server-side", "api developer"], ["backend", "software"]),
    (["devops", "cloud engineer", "infrastructure", "platform engineer", "sre", "kubernetes"], ["devops", "software"]),
    (["security", "cybersecurity", "penetration", "appsec"], ["security", "software"]),
    (["qa engineer", "quality assurance", "test engineer", "sdet", "automation test"], ["qa", "software"]),
    (["fullstack", "full stack", "full-stack"], ["frontend", "backend", "software"]),
    (["designer", " ux ", " ui "], ["design"]),
    (["software", "developer", "engineer", "programmer"], ["software", "backend", "frontend"]),
]

# Hebrew city → English translation
_CITIES: dict[str, str] = {
    "תל אביב": "Tel Aviv", "תל-אביב": "Tel Aviv", "תל אביב-יפו": "Tel Aviv",
    "הרצליה": "Herzliya", "פתח תקווה": "Petah Tikva", "רמת גן": "Ramat Gan",
    "רעננה": "Ra'anana", "נתניה": "Netanya", "חיפה": "Haifa",
    "ירושלים": "Jerusalem", "באר שבע": "Be'er Sheva", "כפר סבא": "Kfar Saba",
    "רחובות": "Rehovot", "הוד השרון": "Hod HaSharon", "מודיעין": "Modi'in",
    "ראשון לציון": "Rishon LeZion", "אשדוד": "Ashdod", "חולון": "Holon",
    "בת ים": "Bat Yam", "אילת": "Eilat", "נהריה": "Nahariya",
    "טבריה": "Tiberias", "Remote": "Remote", "מרחוק": "Remote",
}

_SIZES: dict[str, str] = {
    "xs": "Startup",
    "s": "Small",
    "m": "Medium",
    "l": "Large",
    "xl": "Enterprise",
}


_TECH_TOKENS = [
    "python","javascript","typescript","java","go","rust","c++","c#","ruby","php","scala","kotlin","swift",
    "react","angular","vue","next.js","node.js","express","django","fastapi","flask","spring",
    "sql","postgresql","mysql","mongodb","redis","elasticsearch","dynamodb","cassandra",
    "aws","azure","gcp","docker","kubernetes","terraform","ansible","jenkins","ci/cd","github actions",
    "graphql","rest","grpc","kafka","rabbitmq","celery",
    "machine learning","deep learning","nlp","pytorch","tensorflow","scikit-learn",
    "devops","sre","linux","bash","git",
    "backend","frontend","fullstack","full-stack","full stack",
    "microservices","distributed","cloud","data engineering","data science",
]

def _skills_from_title(title: str) -> list[str]:
    """Extract recognised tech skills from a job title string."""
    t = title.lower()
    return [tok for tok in _TECH_TOKENS if tok in t]


def _city(raw: str) -> str:
    return _CITIES.get(raw.strip(), raw.strip())


def _csvs_for_role(target_role: str) -> list[str]:
    role = f" {(target_role or '').lower()} "
    for keywords, csvs in _ROLE_CSV_MAP:
        if any(kw in role for kw in keywords):
            return csvs
    return ["software"]


async def _fetch_csv(category: str) -> List[Dict]:
    """Download and parse one TechMap CSV file."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(_BASE.format(category))
            resp.raise_for_status()
    except Exception as e:
        logger.warning(f"[techmap] failed to fetch {category}.csv: {e}")
        return []

    jobs = []
    reader = csv.DictReader(io.StringIO(resp.text))
    for row in reader:
        title   = (row.get("title") or "").strip()
        job_url = (row.get("url") or "").strip()
        if not title or not job_url:
            continue

        company  = (row.get("company") or "").strip()
        city     = _city(row.get("city") or "")
        level    = (row.get("level") or "").strip()
        size     = _SIZES.get((row.get("size") or "").strip(), "")
        industry = (row.get("category") or "").strip()

        # Build description with enough signal for the skill scorer
        description = " ".join(filter(None, [title, company, industry, size, level]))

        # Extract skills from title so match scoring works without a full description
        skills = _skills_from_title(title)

        jobs.append({
            "title":            title,
            "company":          company,
            "location":         city,
            "url":              job_url,
            "apply_url":        job_url,
            "description":      description,
            "experience_level": level or None,
            "job_type":         "Full-time",
            "skills":           skills,
            "source":           "techmap",
            "industry":         industry,
            "company_size":     size,
        })

    logger.info(f"[techmap] {len(jobs)} jobs from {category}.csv")
    return jobs


async def fetch_for_role(target_role: str) -> List[Dict]:
    """Fetch all TechMap CSV files relevant to the given role, deduplicated by URL."""
    csv_names = _csvs_for_role(target_role)
    # Deduplicate while preserving order
    seen_names: set[str] = set()
    unique = [c for c in csv_names if not (c in seen_names or seen_names.add(c))]

    results = await asyncio.gather(*[_fetch_csv(c) for c in unique], return_exceptions=True)

    jobs: list[dict] = []
    seen_urls: set[str] = set()
    for result in results:
        if isinstance(result, Exception):
            continue
        for job in result:
            u = job.get("url", "")
            if u and u not in seen_urls:
                seen_urls.add(u)
                jobs.append(job)

    return jobs
