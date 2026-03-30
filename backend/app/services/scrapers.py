"""
Web scraping service for extracting job details from various job boards.
Supports LinkedIn, Indeed, Glassdoor, and Israeli job sites.
Uses Crawl4AI for JavaScript-rendered content.
"""
import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, Optional, List
import logging
from urllib.parse import urlparse, parse_qs
import time
import asyncio

try:
    from crawl4ai import AsyncWebCrawler, CacheMode
    CRAWL4AI_AVAILABLE = True
except ImportError:
    CRAWL4AI_AVAILABLE = False

logger = logging.getLogger(__name__)


def _is_linkedin_login_wall(soup, result_url: str = "") -> bool:
    """
    Detect LinkedIn login-wall regardless of page language (EN / HE / etc).
    LinkedIn redirects unauthenticated headless browsers to its login page.
    We check three signals, any one of which is conclusive:
      1. A password <input> exists  → login form present
      2. Known redirect URL patterns (/login, /authwall, /checkpoint, loginRedirect)
      3. LinkedIn-specific login page meta or CSS class markers
    """
    # 1. Password input — language-independent
    if soup.select_one("input[type='password']"):
        return True
    # 2. Redirect URL
    if result_url and any(tok in result_url for tok in ("/login", "/authwall", "/checkpoint", "loginRedirect")):
        return True
    # 3. LinkedIn login page always has this specific element
    if soup.select_one("form.login__form, #session_key, #session_password"):
        return True
    return False


class JobScraper:
    """Base class for job scraping with common utilities."""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def clean_text(self, text: str) -> str:
        """Clean extracted text by removing extra whitespace and special characters."""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text
    
    def extract_salary(self, text: str) -> Dict[str, Optional[int]]:
        """Extract salary range from text."""
        salary_info = {"min": None, "max": None, "currency": "ILS"}
        
        # Pattern for Israeli Shekels
        ils_pattern = r'₪?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:-|to|–)\s*₪?\s*(\d+(?:,\d{3})*(?:\.\d+)?)'
        match = re.search(ils_pattern, text)
        if match:
            salary_info["min"] = int(match.group(1).replace(',', ''))
            salary_info["max"] = int(match.group(2).replace(',', ''))
            return salary_info
        
        # Pattern for USD
        usd_pattern = r'\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:-|to|–)\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)'
        match = re.search(usd_pattern, text)
        if match:
            salary_info["min"] = int(match.group(1).replace(',', ''))
            salary_info["max"] = int(match.group(2).replace(',', ''))
            salary_info["currency"] = "USD"
            return salary_info
        
        # Pattern for single salary value
        single_pattern = r'₪?\s*(\d+(?:,\d{3})*)'
        match = re.search(single_pattern, text)
        if match:
            value = int(match.group(1).replace(',', ''))
            salary_info["min"] = value
            salary_info["max"] = value
        
        return salary_info
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract technical skills from job description."""
        skills_patterns = [
            # Programming languages
            r'\b(Python|JavaScript|Java|C\+\+|C#|Ruby|PHP|Swift|Kotlin|Go|Rust|TypeScript|Scala|R)\b',
            # Frameworks/Libraries
            r'\b(React|Angular|Vue|Node\.?js|Django|Flask|Spring|\.NET|Laravel|Rails|Express|FastAPI|Next\.js)\b',
            # Databases
            r'\b(SQL|MySQL|PostgreSQL|MongoDB|Redis|Oracle|SQLite|Cassandra|DynamoDB|Elasticsearch)\b',
            # Cloud/DevOps
            r'\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|Git|CI/CD|Terraform|Ansible)\b',
            # Other tech
            r'\b(HTML|CSS|REST|GraphQL|API|Agile|Scrum|Machine Learning|AI|Data Analysis|Linux|JIRA)\b',
        ]
        
        skills_set = set()
        for pattern in skills_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                skill = match.strip()
                if skill:
                    skills_set.add(skill)
        
        return list(skills_set)[:10]  # Limit to 10 skills
    
    def fetch_page(self, url: str, retries: int = 3, delay: float = 1.0) -> Optional[BeautifulSoup]:
        """Fetch and parse a web page with retry logic."""
        for attempt in range(retries):
            try:
                time.sleep(delay)  # Rate limiting
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                return BeautifulSoup(response.content, 'html.parser')
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {str(e)}")
                if attempt == retries - 1:
                    logger.error(f"Failed to fetch {url} after {retries} attempts")
                    return None
                time.sleep(delay * (attempt + 1))  # Exponential backoff
        return None


class LinkedInScraper(JobScraper):
    """Scraper for LinkedIn job postings."""
    
    def scrape(self, url: str) -> Optional[Dict]:
        """Extract job details from LinkedIn URL."""
        try:
            soup = self.fetch_page(url)
            if not soup:
                return None
            
            job_data = {
                "title": None,
                "company": None,
                "location": None,
                "description": None,
                "job_type": "Full-time",
                "work_mode": "Onsite",
                "skills": [],
                "salary_min": None,
                "salary_max": None
            }
            
            # Extract job title
            title_elem = soup.find('h1', class_=re.compile('job.*title|top-card.*title'))
            if not title_elem:
                title_elem = soup.find('h1')
            if title_elem:
                job_data["title"] = self.clean_text(title_elem.get_text())
            
            # Extract company name
            company_elem = soup.find('a', class_=re.compile('company.*name|topcard.*org-name'))
            if not company_elem:
                company_elem = soup.find('span', class_=re.compile('company'))
            if company_elem:
                job_data["company"] = self.clean_text(company_elem.get_text())
            
            # Extract location
            location_elem = soup.find('span', class_=re.compile('job.*location|topcard.*location'))
            if location_elem:
                job_data["location"] = self.clean_text(location_elem.get_text())
            
            # Extract job description
            desc_elem = soup.find('div', class_=re.compile('description|show-more-less'))
            if not desc_elem:
                desc_elem = soup.find('div', id=re.compile('job.*description'))
            if desc_elem:
                job_data["description"] = self.clean_text(desc_elem.get_text())
            
            # Extract job type and work mode from description
            full_text = soup.get_text().lower()
            if 'remote' in full_text:
                job_data["work_mode"] = "Remote"
            elif 'hybrid' in full_text:
                job_data["work_mode"] = "Hybrid"
            
            if 'part-time' in full_text or 'part time' in full_text:
                job_data["job_type"] = "Part-time"
            elif 'contract' in full_text:
                job_data["job_type"] = "Contract"
            
            # Extract skills from description
            if job_data["description"]:
                skills = self.extract_skills(job_data["description"])
                job_data["skills"] = skills
            
            # Extract salary if available
            salary_text = soup.get_text()
            salary_info = self.extract_salary(salary_text)
            job_data["salary_min"] = salary_info["min"]
            job_data["salary_max"] = salary_info["max"]
            
            return job_data
            
        except Exception as e:
            logger.error(f"Error scraping LinkedIn URL {url}: {str(e)}")
            return None
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract technical skills from job description."""
        common_skills = [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue',
            'Node.js', 'Django', 'Flask', 'FastAPI', 'Spring', 'SQL', 'PostgreSQL',
            'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
            'Git', 'CI/CD', 'REST', 'API', 'GraphQL', 'Microservices', 'Agile', 'Scrum',
            'C++', 'C#', '.NET', 'Ruby', 'PHP', 'Go', 'Rust', 'Swift', 'Kotlin',
            'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'Redux', 'Next.js', 'Express'
        ]
        
        found_skills = []
        text_lower = text.lower()
        
        for skill in common_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        return found_skills[:10]  # Limit to top 10 skills


class IndeedScraper(JobScraper):
    """Scraper for Indeed job listings."""
    
    def scrape(self, url: str) -> Optional[Dict]:
        """Extract job details from Indeed URL."""
        try:
            soup = self.fetch_page(url)
            if not soup:
                return None
            
            job_data = {
                "title": None,
                "company": None,
                "location": None,
                "description": None,
                "job_type": "Full-time",
                "work_mode": "Onsite",
                "skills": [],
                "salary_min": None,
                "salary_max": None
            }
            
            # Extract job title
            title_elem = soup.find('h1', class_=re.compile('jobsearch-JobInfoHeader-title'))
            if not title_elem:
                title_elem = soup.find('h1')
            if title_elem:
                job_data["title"] = self.clean_text(title_elem.get_text())
            
            # Extract company name
            company_elem = soup.find('div', {'data-company-name': True})
            if not company_elem:
                company_elem = soup.find('a', {'data-tn-element': 'companyName'})
            if not company_elem:
                company_elem = soup.find('div', class_=re.compile('company'))
            if company_elem:
                job_data["company"] = self.clean_text(company_elem.get_text())
            
            # Extract location
            location_elem = soup.find('div', {'data-testid': 'job-location'})
            if not location_elem:
                location_elem = soup.find('div', class_=re.compile('location'))
            if location_elem:
                job_data["location"] = self.clean_text(location_elem.get_text())
            
            # Extract salary
            salary_elem = soup.find('div', {'data-testid': 'job-salary'})
            if not salary_elem:
                salary_elem = soup.find('span', class_=re.compile('salary'))
            if salary_elem:
                salary_info = self.extract_salary(salary_elem.get_text())
                job_data["salary_min"] = salary_info["min"]
                job_data["salary_max"] = salary_info["max"]
            
            # Extract job description
            desc_elem = soup.find('div', {'id': 'jobDescriptionText'})
            if not desc_elem:
                desc_elem = soup.find('div', class_=re.compile('jobsearch-jobDescriptionText'))
            if desc_elem:
                job_data["description"] = self.clean_text(desc_elem.get_text())
            
            # Extract job type from job details
            job_type_elem = soup.find('div', {'data-testid': 'job-type'})
            if job_type_elem:
                job_type_text = job_type_elem.get_text().lower()
                if 'part' in job_type_text:
                    job_data["job_type"] = "Part-time"
                elif 'contract' in job_type_text:
                    job_data["job_type"] = "Contract"
            
            # Check for remote/hybrid
            full_text = soup.get_text().lower()
            if 'remote' in full_text:
                job_data["work_mode"] = "Remote"
            elif 'hybrid' in full_text:
                job_data["work_mode"] = "Hybrid"
            
            # Extract skills
            if job_data["description"]:
                skills_scraper = LinkedInScraper()
                job_data["skills"] = skills_scraper.extract_skills(job_data["description"])
            
            return job_data
            
        except Exception as e:
            logger.error(f"Error scraping Indeed URL {url}: {str(e)}")
            return None


class GlassdoorScraper(JobScraper):
    """Scraper for Glassdoor job listings."""
    
    def scrape(self, url: str) -> Optional[Dict]:
        """Extract job details from Glassdoor URL."""
        try:
            soup = self.fetch_page(url)
            if not soup:
                return None
            
            job_data = {
                "title": None,
                "company": None,
                "location": None,
                "description": None,
                "job_type": "Full-time",
                "work_mode": "Onsite",
                "skills": [],
                "salary_min": None,
                "salary_max": None
            }
            
            # Extract job title
            title_elem = soup.find('div', {'data-test': 'job-title'})
            if not title_elem:
                title_elem = soup.find('h1')
            if title_elem:
                job_data["title"] = self.clean_text(title_elem.get_text())
            
            # Extract company
            company_elem = soup.find('div', {'data-test': 'employer-name'})
            if company_elem:
                job_data["company"] = self.clean_text(company_elem.get_text())
            
            # Extract location
            location_elem = soup.find('div', {'data-test': 'location'})
            if location_elem:
                job_data["location"] = self.clean_text(location_elem.get_text())
            
            # Extract salary (Glassdoor often has good salary data)
            salary_elem = soup.find('span', {'data-test': 'detailSalary'})
            if salary_elem:
                salary_info = self.extract_salary(salary_elem.get_text())
                job_data["salary_min"] = salary_info["min"]
                job_data["salary_max"] = salary_info["max"]
            
            # Extract description
            desc_elem = soup.find('div', class_=re.compile('desc|jobDescriptionContent'))
            if desc_elem:
                job_data["description"] = self.clean_text(desc_elem.get_text())
            
            # Extract skills
            if job_data["description"]:
                skills_scraper = LinkedInScraper()
                job_data["skills"] = skills_scraper.extract_skills(job_data["description"])
            
            return job_data
            
        except Exception as e:
            logger.error(f"Error scraping Glassdoor URL {url}: {str(e)}")
            return None


class DrushimScraper(JobScraper):
    """Scraper for Drushim.co.il using their public RSS feed (no browser required)."""

    # Maps drushim.co.il subcat IDs to RSS cat IDs (same number)
    _RSS_BASE = "https://www.drushim.co.il/rss/?cat={cat}"

    @staticmethod
    def _cat_from_url(url: str) -> str:
        """Extract category number from a drushim subcat URL."""
        import re as _re
        m = _re.search(r'/subcat/(\d+)', url)
        return m.group(1) if m else "71"

    async def scrape_async(self, url: str) -> Optional[Dict]:
        jobs = await self.scrape_listing_async(url)
        return jobs[0] if jobs else None

    async def scrape_listing_async(self, url: str) -> List[Dict]:
        """Fetch jobs from Drushim RSS feed — no browser/bot-detection issues."""
        import httpx
        cat = self._cat_from_url(url)
        rss_url = self._RSS_BASE.format(cat=cat)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        }
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
                resp = await client.get(rss_url, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Drushim RSS returned {resp.status_code} for {rss_url}")
                return []

            soup = BeautifulSoup(resp.text, "xml")
            items = soup.find_all("item")
            logger.info(f"Drushim RSS: {len(items)} jobs for cat={cat}")

            jobs = []
            for item in items:
                try:
                    job = self._parse_rss_item(item)
                    if job and job.get("title"):
                        jobs.append(job)
                except Exception as e:
                    logger.error(f"Error parsing Drushim RSS item: {e}")
            return jobs

        except Exception as e:
            logger.error(f"Error fetching Drushim RSS {rss_url}: {e}")
            return []

    def _parse_rss_item(self, item) -> Optional[Dict]:
        """Parse a single <item> from the Drushim RSS feed."""
        def txt(tag):
            el = item.find(tag)
            return self.clean_text(el.get_text()) if el else None

        title       = txt("title")
        company     = txt("company")
        link        = txt("link")
        raw_desc = txt("desc") or txt("description") or ""
        raw_req  = txt("requirements") or ""
        description  = BeautifulSoup(f"<div>{raw_desc}</div>",  "html.parser").get_text(" ", strip=True)
        requirements = BeautifulSoup(f"<div>{raw_req}</div>",   "html.parser").get_text(" ", strip=True)
        location    = txt("zones")       # e.g. "מרכז", "צפון"
        scopes      = txt("scopes") or ""
        experience  = txt("experience") or ""

        full_text = f"{description} {requirements}"

        job_type = "Full-time"
        if "חלקית" in scopes or "part" in scopes.lower():
            job_type = "Part-time"

        exp_level = None
        if "ללא" in experience or "ראשונה" in experience:
            exp_level = "Entry Level"
        elif any(x in experience for x in ["5", "6", "7", "8", "10", "בכיר"]):
            exp_level = "Senior"
        elif experience:
            exp_level = "Mid Level"

        return {
            "title":            title,
            "company":          company,
            "location":         location,
            "description":      full_text.strip() or None,
            "job_type":         job_type,
            "work_mode":        "Onsite",
            "experience_level": exp_level,
            "salary_min":       None,
            "salary_max":       None,
            "skills":           self.extract_skills(full_text) if full_text else [],
            "url":              link or "https://www.drushim.co.il",
            "source":           "drushim",
        }
    
    def scrape(self, url: str) -> Optional[Dict]:
        """Synchronous wrapper for async scrape method."""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.scrape_async(url))
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Error in sync scrape wrapper: {str(e)}")
            # Fallback to basic scraping
            soup = self.fetch_page(url)
            if not soup:
                return None
            
            job_data = {
                "title": None,
                "company": None,
                "location": None,
                "description": None,
                "job_type": "Full-time",
                "work_mode": "Onsite",
                "skills": [],
                "salary_min": None,
                "salary_max": None
            }
            
            title_elem = soup.find('h1')
            if title_elem:
                job_data["title"] = self.clean_text(title_elem.get_text())
            
            company_elem = soup.find('span', class_=re.compile('company'))
            if company_elem:
                job_data["company"] = self.clean_text(company_elem.get_text())
            
            location_elem = soup.find('span', class_=re.compile('location|area'))
            if location_elem:
                job_data["location"] = self.clean_text(location_elem.get_text())
            
            desc_elem = soup.find('div', class_=re.compile('content|description'))
            if desc_elem:
                job_data["description"] = self.clean_text(desc_elem.get_text())
            
            if job_data["description"]:
                job_data["skills"] = self.extract_skills(job_data["description"])
            
            return job_data


class AllJobsScraper(JobScraper):
    """Scraper for AllJobs.co.il (Israeli job board)."""
    
    def scrape(self, url: str) -> Optional[Dict]:
        """Extract job details from AllJobs URL."""
        try:
            soup = self.fetch_page(url)
            if not soup:
                return None
            
            job_data = {
                "title": None,
                "company": None,
                "location": None,
                "description": None,
                "job_type": "Full-time",
                "work_mode": "Onsite",
                "skills": [],
                "salary_min": None,
                "salary_max": None
            }
            
            # Extract job details
            title_elem = soup.find('h1')
            if title_elem:
                job_data["title"] = self.clean_text(title_elem.get_text())
            
            company_elem = soup.find('div', class_=re.compile('company'))
            if company_elem:
                job_data["company"] = self.clean_text(company_elem.get_text())
            
            desc_elem = soup.find('div', class_=re.compile('job.*content|description'))
            if desc_elem:
                job_data["description"] = self.clean_text(desc_elem.get_text())
            
            # Extract skills
            if job_data["description"]:
                skills_scraper = LinkedInScraper()
                job_data["skills"] = skills_scraper.extract_skills(job_data["description"])
            
            return job_data
            
        except Exception as e:
            logger.error(f"Error scraping AllJobs URL {url}: {str(e)}")
            return None


class GotFriendsScraper(JobScraper):
    """Scraper for GotFriends.co.il (Israeli tech recruiting platform) using Crawl4AI."""
    
    BASE_URL = "https://gotfriends.co.il"
    
    async def scrape_listing_async(self, url: str) -> List[Dict]:
        """Scrape all jobs from a GotFriends listing page."""
        try:
            async with AsyncWebCrawler(verbose=False) as crawler:
                result = await crawler.arun(
                    url=url,
                    word_count_threshold=10,
                    cache_mode=CacheMode.BYPASS,
                    wait_for="css:.job-card, .job-item, article.job"  # Multiple possible selectors
                )
                
                if not result.success:
                    logger.error(f"Crawl4AI failed for GotFriends: {url}")
                    return []
                
                soup = BeautifulSoup(result.html, 'html.parser')
                
                # Try multiple selectors for GotFriends job cards
                job_cards = soup.select('div.job-card')
                if not job_cards:
                    job_cards = soup.select('article.job, div.job-item, div[class*="job"]')
                
                logger.info(f"Found {len(job_cards)} jobs on GotFriends")
                
                jobs = []
                for card in job_cards:
                    try:
                        job_data = self._extract_job_from_card(card, url)
                        if job_data and job_data.get("title"):
                            jobs.append(job_data)
                    except Exception as e:
                        logger.error(f"Error extracting GotFriends card: {str(e)}")
                        continue
                
                return jobs
                
        except Exception as e:
            logger.error(f"Error scraping GotFriends listing {url}: {str(e)}")
            return []
    
    def _extract_job_from_card(self, card, base_url: str) -> Optional[Dict]:
        """Extract job data from GotFriends card element."""
        job_data = {
            "title": None,
            "company": None,
            "location": None,
            "description": None,
            "url": base_url,
            "source": "gotfriends.co.il",
            "job_type": "Full-time",
            "experience_level": None,
            "skills": [],
            "salary_min": None,
            "salary_max": None
        }
        
        # Extract job URL
        link_elem = card.select_one('a[href*="/job/"], a[href*="/position/"], a.job-link')
        if link_elem:
            job_url = link_elem.get('href')
            if job_url:
                if not job_url.startswith('http'):
                    job_url = f"{self.BASE_URL}{job_url}"
                job_data["url"] = job_url
        
        # Extract title
        title_elem = card.select_one('h2, h3, div.job-title, span.title, a.job-title')
        if title_elem:
            job_data["title"] = self.clean_text(title_elem.get_text())
        
        # Extract company
        company_elem = card.select_one('div.company, span.company-name, div.company-name, a.company')
        if company_elem:
            job_data["company"] = self.clean_text(company_elem.get_text())
        
        # Extract location
        location_elem = card.select_one('div.location, span.location, div[class*="location"]')
        if location_elem:
            location_text = self.clean_text(location_elem.get_text())
            # Remove common Hebrew prefixes
            location_text = re.sub(r'^(מיקום:|אזור:)\s*', '', location_text)
            job_data["location"] = location_text
        
        # Extract description snippet
        desc_elem = card.select_one('div.description, p.job-description, div.job-content, div.snippet')
        if desc_elem:
            job_data["description"] = self.clean_text(desc_elem.get_text())
        
        # Extract experience level
        exp_elem = card.select_one('span.experience, div.seniority, span[class*="experience"]')
        if exp_elem:
            exp_text = exp_elem.get_text().lower()
            if any(keyword in exp_text for keyword in ['senior', 'בכיר', 'lead', 'principal', '5+']):
                job_data["experience_level"] = "Senior"
            elif any(keyword in exp_text for keyword in ['junior', 'זוטר', 'entry', 'ללא ניסיון', '0-2']):
                job_data["experience_level"] = "Entry Level"
            else:
                job_data["experience_level"] = "Mid Level"
        
        # Extract skills/technologies (GotFriends often has tech tags)
        skills_container = card.select_one('div.tags, div.technologies, ul.skills')
        if skills_container:
            skill_elems = skills_container.select('span.tag, li, a.tech, span.skill')
            skills = [self.clean_text(s.get_text()) for s in skill_elems if s.get_text().strip()]
            job_data["skills"] = skills[:15]  # Limit to 15 skills
        elif job_data["description"]:
            # Extract skills from description if no tags
            job_data["skills"] = self.extract_skills(job_data["description"])
        
        # Extract salary if present
        salary_elem = card.select_one('span.salary, div.salary-range, div[class*="salary"]')
        if salary_elem:
            salary_text = salary_elem.get_text()
            salary_info = self.extract_salary(salary_text)
            job_data["salary_min"] = salary_info.get("min")
            job_data["salary_max"] = salary_info.get("max")

        return job_data


class LinkedInJobSearchScraper(JobScraper):
    """
    Search LinkedIn public job listings using the Guest Jobs API.
    No authentication, no Playwright — plain httpx requests.
    Returns full job descriptions from the public posting endpoint.
    """

    _HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive",
    }

    # Guest search API — returns HTML with job cards (no auth needed)
    _SEARCH_URL = (
        "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        "?keywords={keywords}&location={location}&start={start}&count={count}"
    )
    # Guest job detail API — returns HTML with full description (no auth needed)
    _DETAIL_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"

    MAX_JOBS = 25
    MAX_DESCRIPTIONS = 15  # fetch descriptions for top N results

    @staticmethod
    def _get_proxy() -> Optional[str]:
        """Return proxy URL from env var HTTPS_PROXY / HTTP_PROXY / SCRAPERAPI_KEY, or None."""
        import os
        if os.environ.get("SCRAPERAPI_KEY"):
            return f"http://scraperapi:{os.environ['SCRAPERAPI_KEY']}@proxy-server.scraperapi.com:8001"
        return os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or None

    async def search_async(self, role: str, location: str = "", li_at: Optional[str] = None, start: int = 0) -> List[Dict]:
        """Search LinkedIn via Guest API and enrich with full descriptions."""
        import httpx
        from urllib.parse import quote_plus

        proxy = self._get_proxy()

        search_url = self._SEARCH_URL.format(
            keywords=quote_plus(role),
            location=quote_plus(location),
            start=start,
            count=self.MAX_JOBS,
        )
        try:
            client_kwargs = dict(headers=self._HEADERS, timeout=20, follow_redirects=True)
            if proxy:
                client_kwargs["proxies"] = proxy
            async with httpx.AsyncClient(**client_kwargs) as client:
                resp = await client.get(search_url)
                if resp.status_code != 200:
                    logger.warning(f"LinkedIn guest search returned {resp.status_code}")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.select("li")
                logger.info(f"LinkedIn guest search: {len(cards)} cards for '{role}' in '{location}'")

                jobs = []
                for card in cards:
                    job = self._parse_card(card)
                    if job and job.get("title") and job.get("job_id"):
                        jobs.append(job)

            if not jobs:
                return []

            # Fetch full descriptions concurrently for top results
            await self._enrich_descriptions(jobs[:self.MAX_DESCRIPTIONS])
            return jobs

        except Exception as e:
            logger.error(f"LinkedIn guest search error: {e}")
            return []

    async def _enrich_descriptions(self, jobs: List[Dict]) -> None:
        """Fetch full description for each job from the guest detail API."""
        import httpx
        semaphore = asyncio.Semaphore(5)
        proxy = self._get_proxy()

        async def fetch_one(job: Dict) -> None:
            job_id = job.get("job_id")
            if not job_id:
                return
            async with semaphore:
                try:
                    client_kwargs = dict(headers=self._HEADERS, timeout=15, follow_redirects=True)
                    if proxy:
                        client_kwargs["proxies"] = proxy
                    async with httpx.AsyncClient(**client_kwargs) as client:
                        resp = await client.get(self._DETAIL_URL.format(job_id=job_id))
                        if resp.status_code != 200:
                            return

                    soup = BeautifulSoup(resp.text, "html.parser")

                    # Primary description container
                    desc_el = (
                        soup.select_one("div.show-more-less-html__markup")
                        or soup.select_one("div.description__text")
                        or soup.select_one("section.description")
                    )
                    if desc_el:
                        for el in desc_el.select("button, svg, script, style"):
                            el.decompose()
                        text = desc_el.get_text(separator="\n", strip=True)
                        text = re.sub(r'\n{3,}', '\n\n', text).strip()
                        if len(text) >= 80:
                            job["description"] = text
                            job["skills"] = self.extract_skills(text)
                            tl = text.lower()
                            if "remote" in tl:
                                job["work_mode"] = "Remote"
                            elif "hybrid" in tl:
                                job["work_mode"] = "Hybrid"

                    # Enrich with seniority / job type from the detail page
                    criteria = soup.select("li.description__job-criteria-item")
                    for item in criteria:
                        label_el = item.select_one("h3")
                        value_el = item.select_one("span")
                        if not label_el or not value_el:
                            continue
                        label = label_el.get_text(strip=True).lower()
                        value = value_el.get_text(strip=True)
                        if "seniority" in label:
                            job["experience_level"] = value
                        elif "employment" in label or "job type" in label:
                            job["job_type"] = value

                except Exception as e:
                    logger.warning(f"Could not fetch LinkedIn description for job {job_id}: {e}")

        await asyncio.gather(*[fetch_one(j) for j in jobs])

    def _parse_card(self, card) -> Optional[Dict]:
        """Extract job data from a LinkedIn guest search result card."""
        try:
            # Job ID — embedded in data-entity-urn or in the detail link
            job_id = None
            entity = card.get("data-entity-urn", "")
            if entity:
                job_id = entity.split(":")[-1]
            if not job_id:
                link = card.select_one("a[href*='/jobs/view/']")
                if link:
                    m = re.search(r'/jobs/view/(\d+)', link.get("href", ""))
                    if m:
                        job_id = m.group(1)

            title_el   = card.select_one("h3.base-search-card__title")
            company_el = card.select_one("h4.base-search-card__subtitle")
            location_el = card.select_one("span.job-search-card__location")
            link_el    = card.select_one("a.base-card__full-link") or card.select_one("a[href*='/jobs/view/']")

            title   = self.clean_text(title_el.get_text()   if title_el   else "")
            company = self.clean_text(company_el.get_text() if company_el else "")
            loc     = self.clean_text(location_el.get_text() if location_el else "")
            url     = link_el["href"].split("?")[0] if link_el else (
                f"https://www.linkedin.com/jobs/view/{job_id}" if job_id else None
            )

            if not title:
                return None

            return {
                "job_id":      job_id,
                "title":       title,
                "company":     company,
                "location":    loc,
                "url":         url,
                "apply_url":   url,
                "description": None,
                "job_type":    "Full-time",
                "work_mode":   "Onsite",
                "experience_level": None,
                "skills":      [],
                "source":      "linkedin",
            }
        except Exception as e:
            logger.error(f"Error parsing LinkedIn card: {e}")
            return None


class ScraperFactory:
    """Factory class to get the appropriate scraper based on URL."""
    
    @staticmethod
    def get_scraper(url: str) -> Optional[JobScraper]:
        """Return the appropriate scraper for the given URL."""
        domain = urlparse(url).netloc.lower()
        
        if 'linkedin.com' in domain:
            return LinkedInScraper()
        elif 'indeed.com' in domain or 'indeed.co' in domain:
            return IndeedScraper()
        elif 'glassdoor.com' in domain:
            return GlassdoorScraper()
        elif 'drushim.co.il' in domain:
            return DrushimScraper()
        elif 'alljobs.co.il' in domain:
            return AllJobsScraper()
        elif 'gotfriends.co.il' in domain:
            return GotFriendsScraper()
        else:
            logger.warning(f"No specific scraper for domain: {domain}, using base scraper")
            return LinkedInScraper()  # Default fallback
    
    @staticmethod
    def scrape_job(url: str) -> Optional[Dict]:
        """Scrape job details from any supported URL."""
        try:
            scraper = ScraperFactory.get_scraper(url)
            if scraper:
                logger.info(f"Scraping job from: {url}")
                result = scraper.scrape(url)
                if result and result.get('title'):
                    logger.info(f"Successfully scraped: {result['title']} at {result.get('company')}")
                    return result
                else:
                    logger.warning(f"No data extracted from: {url}")
            return None
        except Exception as e:
            logger.error(f"Error in scrape_job for {url}: {str(e)}")
            return None
