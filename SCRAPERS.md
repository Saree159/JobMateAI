# Job Scraper System Documentation

## Overview
The JobMate AI scraper system automatically extracts job details from various job board URLs, saving users time by auto-filling job information.

## Supported Platforms

### International Job Boards
- ✅ **LinkedIn** - Full support for job postings
- ✅ **Indeed** - Indeed.com and international domains (.co.il, .co.uk, etc.)
- ✅ **Glassdoor** - Including salary data extraction

### Israeli Job Boards
- ✅ **Drushim.co.il** - Hebrew and English job postings
- ✅ **AllJobs.co.il** - Hebrew and English support

## Features

### Data Extraction
The scraper automatically extracts:
- **Job Title** - Position name
- **Company Name** - Employer
- **Location** - City/region or Remote
- **Job Description** - Full text
- **Job Type** - Full-time, Part-time, Contract
- **Work Mode** - Remote, Hybrid, Onsite
- **Salary Range** - Min/Max in ILS or USD
- **Skills** - Automatic detection of 40+ technical skills
- **Application URL** - Original posting URL

### Technical Skills Detection
Automatically identifies skills including:
- **Languages:** Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin
- **Frontend:** React, Angular, Vue, Next.js, HTML, CSS, Tailwind, Bootstrap
- **Backend:** Node.js, Django, Flask, FastAPI, Spring, Express
- **Databases:** SQL, PostgreSQL, MySQL, MongoDB, Redis
- **DevOps:** Docker, Kubernetes, AWS, Azure, GCP, Git, CI/CD
- **Other:** REST, API, GraphQL, Microservices, Agile, Scrum

### Salary Parsing
Intelligent salary extraction supports:
- Israeli Shekels (₪)
- US Dollars ($)
- Range format: "₪15,000 - ₪25,000"
- Single values with context

### Smart Detection
- **Remote/Hybrid:** Automatically detects work mode from description
- **Job Type:** Identifies full-time, part-time, contract positions
- **Text Cleaning:** Removes extra whitespace and formatting

### Reliability Features
- **Rate Limiting:** Prevents overwhelming target servers
- **Retry Logic:** Automatic retry with exponential backoff (up to 3 attempts)
- **Error Handling:** Graceful failures with informative messages
- **User-Agent Rotation:** Mimics real browser requests

## API Usage

### Endpoint
```
POST /api/jobs/scrape-url
```

### Parameters
- `url` (required) - URL of the job posting to scrape
- `user_id` (required) - ID of the user creating the job

### Request Example
```bash
curl -X POST 'http://localhost:8000/api/jobs/scrape-url?url=https://www.linkedin.com/jobs/view/3805678901&user_id=1' \
  -H 'Content-Type: application/json'
```

### Response Example
```json
{
  "success": true,
  "url": "https://www.linkedin.com/jobs/view/3805678901",
  "data": {
    "title": "Senior Full Stack Developer",
    "company": "Tech Corp",
    "location": "Tel Aviv, Israel",
    "description": "We are looking for a talented Full Stack Developer...",
    "job_type": "Full-time",
    "work_mode": "Hybrid",
    "skills": "Python, React, PostgreSQL, Docker, AWS",
    "salary_min": 18000,
    "salary_max": 28000,
    "apply_url": "https://www.linkedin.com/jobs/view/3805678901"
  },
  "message": "Job details extracted successfully. Review and save if correct."
}
```

### Error Response
```json
{
  "detail": "Failed to scrape job data from URL. The site may be blocking automated access or the URL format is not supported."
}
```

## Frontend Integration

### AddJobDialog Component
The Add Job dialog includes two tabs:
1. **Manual Entry** - Traditional form input
2. **Extract from URL** - Automatic scraping

### Usage Flow
1. User clicks "Add Job" button
2. Switches to "Extract from URL" tab
3. Pastes job posting URL
4. Clicks "Extract Job Details"
5. System scrapes and populates form
6. User reviews data in Manual Entry tab
7. User saves job to tracker

### Supported URL Formats

**LinkedIn:**
```
https://www.linkedin.com/jobs/view/3805678901
https://il.linkedin.com/jobs/view/3805678901
```

**Indeed:**
```
https://www.indeed.com/viewjob?jk=abc123def456
https://il.indeed.com/viewjob?jk=abc123def456
```

**Glassdoor:**
```
https://www.glassdoor.com/job-listing/software-engineer-JV_IC1234567_KO0,20.htm
```

**Drushim:**
```
https://www.drushim.co.il/job/12345678
```

**AllJobs:**
```
https://www.alljobs.co.il/SearchResultsGuest.aspx?position=54321
```

## Architecture

### ScraperFactory
Central factory class that routes URLs to appropriate scrapers:
```python
scraper = ScraperFactory.get_scraper(url)
result = scraper.scrape(url)
```

### Base JobScraper Class
Provides common utilities:
- `fetch_page()` - HTTP request with retry logic
- `clean_text()` - Text normalization
- `extract_salary()` - Salary parsing
- `extract_skills()` - Skill detection

### Platform-Specific Scrapers
- `LinkedInScraper` - LinkedIn job posts
- `IndeedScraper` - Indeed listings
- `GlassdoorScraper` - Glassdoor with salary focus
- `DrushimScraper` - Israeli Drushim.co.il
- `AllJobsScraper` - Israeli AllJobs.co.il

## Rate Limiting & Best Practices

### Built-in Rate Limiting
- 1 second delay between requests
- Exponential backoff on failures
- Maximum 3 retry attempts

### Avoiding Blocks
- Realistic User-Agent headers
- Session-based requests
- Proper Accept headers
- HTTP/2 support via httpx (future enhancement)

### Recommendations
- Don't scrape more than 10 jobs per minute
- Use extracted data responsibly
- Cache results when possible
- Respect robots.txt (future enhancement)

## Limitations & Notes

### Current Limitations
1. **JavaScript-Heavy Sites:** Some modern SPAs may not render content server-side
2. **Authentication:** Sites requiring login not fully supported
3. **Dynamic Content:** AJAX-loaded content may be missed
4. **Anti-Bot Measures:** Some sites actively block scrapers

### Future Enhancements
- [ ] Selenium/Playwright for JavaScript rendering
- [ ] Proxy rotation for high-volume scraping
- [ ] CAPTCHA solving integration
- [ ] More job boards (Monster, ZipRecruiter, etc.)
- [ ] PDF job description parsing
- [ ] Company data enrichment (Crunchbase, LinkedIn)

## Testing

### Test Script
Run the test script to verify scrapers:
```bash
cd backend
python test_scrapers.py
```

### Manual Testing
1. Start backend: `python -m uvicorn app.main:app --reload`
2. Open frontend: `http://localhost:5173`
3. Click "Add Job" → "Extract from URL"
4. Test with real job URLs

### API Testing with curl
```bash
# Test LinkedIn scraping
curl -X POST 'http://localhost:8000/api/jobs/scrape-url?url=https://www.linkedin.com/jobs/view/3805678901&user_id=1'

# Test Indeed scraping
curl -X POST 'http://localhost:8000/api/jobs/scrape-url?url=https://www.indeed.com/viewjob?jk=abc123&user_id=1'
```

## Troubleshooting

### "Failed to scrape job data"
**Causes:**
- Invalid or expired job URL
- Site blocking automated requests
- Network connectivity issues
- Unsupported URL format

**Solutions:**
- Verify URL is correct and active
- Try again after a few minutes
- Use manual entry as fallback

### "Could not extract job title"
**Causes:**
- Page structure changed
- Content not fully loaded
- Site using non-standard HTML

**Solutions:**
- Report the URL for debugging
- Use manual entry
- Check if job posting is still active

### Import Errors
**Issue:** `ModuleNotFoundError: No module named 'bs4'`

**Solution:**
```bash
pip install beautifulsoup4 requests lxml
```

## Security Considerations

### Data Privacy
- Scraped data stored only in user's database
- No data sharing with third parties
- URLs not logged beyond debug mode

### Legal Compliance
- Respect website Terms of Service
- Use for personal job search only
- Attribution maintained via `apply_url` field
- Follow robots.txt guidelines

### Rate Limits
- Built-in delays prevent server overload
- Exponential backoff on errors
- Session reuse minimizes connections

## Performance

### Speed
- Average scrape time: 2-5 seconds
- Concurrent requests supported
- Background task processing (future)

### Caching
- Future enhancement: Cache scraped jobs for 24 hours
- Prevent duplicate scrapes
- Faster retrieval on re-scrape

## Dependencies

```txt
beautifulsoup4==4.12.3    # HTML parsing
requests==2.31.0          # HTTP requests
lxml==5.1.0              # Fast XML/HTML parser
```

## Code Example

```python
from app.services.scrapers import ScraperFactory

# Scrape a job
url = "https://www.linkedin.com/jobs/view/3805678901"
job_data = ScraperFactory.scrape_job(url)

if job_data:
    print(f"Title: {job_data['title']}")
    print(f"Company: {job_data['company']}")
    print(f"Skills: {', '.join(job_data['skills'])}")
```

## Support

For issues or feature requests:
1. Check this documentation
2. Review error messages carefully
3. Test with curl to isolate frontend/backend issues
4. Report bugs with URL examples (anonymize if needed)

---

**Last Updated:** November 23, 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
