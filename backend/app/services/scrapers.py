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
    """Scraper for Drushim.co.il (Israeli job board) using Crawl4AI for JS rendering."""
    
    async def scrape_async(self, url: str) -> Optional[Dict]:
        """Extract job details from Drushim listing page using Crawl4AI.
        
        Note: Drushim shows all jobs on listing pages, not individual job pages.
        This method extracts the first job from the listing for compatibility,
        but see scrape_listing_async for extracting all jobs.
        """
        jobs = await self.scrape_listing_async(url)
        return jobs[0] if jobs else None
    
    async def scrape_listing_async(self, url: str) -> List[Dict]:
        """Extract all jobs from a Drushim listing page."""
        if not CRAWL4AI_AVAILABLE:
            logger.warning("Crawl4AI not available, using fallback scraper")
            return []
        
        try:
            async with AsyncWebCrawler(verbose=False) as crawler:
                result = await crawler.arun(
                    url=url,
                    css_selector="div.job-item-main",
                    cache_mode=CacheMode.BYPASS,
                    screenshot=False,
                    verbose=False
                )
                
                if not result.success:
                    logger.error(f"Crawl4AI failed for {url}")
                    return []
                
                soup = BeautifulSoup(result.html, 'html.parser')
                
                # Find all job cards
                job_cards = soup.select('div.job-item-main')
                logger.info(f"Found {len(job_cards)} jobs on {url}")
                
                jobs = []
                for card in job_cards:
                    try:
                        job_data = self._extract_job_from_card(card, url)
                        if job_data and job_data.get("title"):
                            jobs.append(job_data)
                    except Exception as e:
                        logger.error(f"Error extracting job card: {str(e)}")
                        continue
                
                return jobs
                
        except Exception as e:
            logger.error(f"Error scraping Drushim URL {url}: {str(e)}")
            return []
    
    def _extract_job_from_card(self, card, base_url: str) -> Optional[Dict]:
        """Extract job data from a single job card element."""
        job_data = {
            "title": None,
            "company": None,
            "location": None,
            "description": None,
            "job_type": "Full-time",
            "work_mode": "Onsite",
            "experience_level": None,
            "salary_min": None,
            "salary_max": None,
            "skills": [],
            "url": base_url
        }
        
        # Extract the actual job URL from the "open in new window" link
        # (div.open-job a has the correct /job/{id}/{slug}/ URL)
        open_link = card.select_one('div.open-job a[href]')
        if not open_link:
            open_link = card.select_one('a[href*="/job/"][target="_blank"]')
        if open_link and open_link.get('href'):
            href = open_link['href']
            job_data["url"] = f"https://www.drushim.co.il{href}" if href.startswith('/') else href
        else:
            # Fallback: construct from listingid attribute
            listing_id = card.get('listingid')
            if listing_id:
                job_data["url"] = f"https://www.drushim.co.il/job/{listing_id}/"
        
        # Extract title - Drushim uses h3.display-28 with span.job-url
        title_elem = card.select_one('h3.display-28 span.job-url')
        if not title_elem:
            # Fallback to just h3.display-28
            title_elem = card.select_one('h3.display-28')
        
        if title_elem:
            job_data["title"] = self.clean_text(title_elem.get_text())
        
        # Extract company - Drushim uses span.bidi inside company link
        company_elem = card.select_one('a[href*="דרושים"] span.font-weight-medium.bidi')
        if not company_elem:
            # Try alternative selector
            company_elem = card.select_one('p.display-22 a span.bidi')
        if not company_elem:
            # Final fallback
            company_elem = card.select_one('span.font-weight-medium.bidi')
        
        if company_elem:
            job_data["company"] = self.clean_text(company_elem.get_text())
        
        # Extract location from job-details-sub (format: "Location | X-Y שנים | Job Type | Time posted")
        details_sub = card.select_one('div.job-details-sub')
        if details_sub:
            # Get all text and split by pipe separator
            details_text = self.clean_text(details_sub.get_text())
            parts = [p.strip() for p in details_text.split('|')]
            
            if parts:
                # First part is usually location
                job_data["location"] = parts[0]
                
                # Look for experience years (X-Y שנים format)
                for part in parts:
                    if 'שנים' in part or 'שנה' in part:
                        # Extract experience level from Hebrew text
                        if any(word in part for word in ['מנוסה', '5-10', '10+']):
                            job_data["experience_level"] = "Senior"
                        elif any(word in part for word in ['1-2', '2-5', 'ללא ניסיון']):
                            job_data["experience_level"] = "Entry Level"
                        else:
                            job_data["experience_level"] = "Mid Level"
                        break
        
        # Extract description - Try job-intro first, then full job-details
        desc_elem = card.select_one('div.job-intro p.display-18')
        if not desc_elem:
            desc_elem = card.select_one('div.job-details p.display-18')
        if not desc_elem:
            # Fallback to job-details wrapper
            desc_elem = card.select_one('div.job-details-wrap div.job-details')
        
        if desc_elem:
            job_data["description"] = self.clean_text(desc_elem.get_text())
        
        # Extract salary
        salary_elem = card.find(['span', 'div'], class_=re.compile('salary'))
        if salary_elem:
            salary_info = self.extract_salary(salary_elem.get_text())
            job_data["salary_min"] = salary_info["min"]
            job_data["salary_max"] = salary_info["max"]
        
        # Extract skills
        if job_data["description"]:
            job_data["skills"] = self.extract_skills(job_data["description"])
        
        return job_data
    
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
