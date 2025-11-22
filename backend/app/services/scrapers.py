"""
Web scraping service for extracting job details from various job boards.
Supports LinkedIn, Indeed, Glassdoor, and Israeli job sites.
"""
import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, Optional, List
import logging
from urllib.parse import urlparse, parse_qs
import time

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
    """Scraper for Drushim.co.il (Israeli job board)."""
    
    def scrape(self, url: str) -> Optional[Dict]:
        """Extract job details from Drushim URL."""
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
            
            # Extract job title (Hebrew support)
            title_elem = soup.find('h1', class_=re.compile('job.*title'))
            if not title_elem:
                title_elem = soup.find('h1')
            if title_elem:
                job_data["title"] = self.clean_text(title_elem.get_text())
            
            # Extract company
            company_elem = soup.find('span', class_=re.compile('company'))
            if company_elem:
                job_data["company"] = self.clean_text(company_elem.get_text())
            
            # Extract location
            location_elem = soup.find('span', class_=re.compile('location|area'))
            if location_elem:
                job_data["location"] = self.clean_text(location_elem.get_text())
            
            # Extract description
            desc_elem = soup.find('div', class_=re.compile('content|description'))
            if desc_elem:
                job_data["description"] = self.clean_text(desc_elem.get_text())
            
            # Extract salary (Israeli Shekels)
            salary_elem = soup.find('span', class_=re.compile('salary'))
            if salary_elem:
                salary_info = self.extract_salary(salary_elem.get_text())
                job_data["salary_min"] = salary_info["min"]
                job_data["salary_max"] = salary_info["max"]
            
            # Extract skills
            if job_data["description"]:
                skills_scraper = LinkedInScraper()
                job_data["skills"] = skills_scraper.extract_skills(job_data["description"])
            
            return job_data
            
        except Exception as e:
            logger.error(f"Error scraping Drushim URL {url}: {str(e)}")
            return None


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
