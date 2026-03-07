"""
Job validation service to ensure job postings are authentic and recent.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import re
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class JobValidator:
    """Validates job postings for authenticity and quality."""
    
    # Known legitimate companies (expandable)
    KNOWN_COMPANIES = {
        # Israeli tech companies
        "monday.com", "wix", "ironSource", "fiverr", "taboola", "outbrain",
        "jfrog", "redis", "perion", "similarweb", "riskified", "earnix",
        # Global tech companies
        "google", "microsoft", "amazon", "facebook", "meta", "apple",
        "intel", "nvidia", "cisco", "ibm", "oracle", "salesforce"
    }
    
    # Suspicious keywords that may indicate fake jobs
    SUSPICIOUS_KEYWORDS = [
        "work from home", "make money fast", "no experience needed",
        "guaranteed income", "immediate hiring", "easy money",
        "unlimited earning", "cash in hand", "עבודה מהבית בהכנסה בטוחה"
    ]
    
    # Required fields for a valid job
    REQUIRED_FIELDS = ["title", "company", "description"]
    
    def __init__(self, max_age_days: int = 60):
        """
        Initialize validator.
        
        Args:
            max_age_days: Maximum age in days for a job posting to be considered recent
        """
        self.max_age_days = max_age_days
        self.cutoff_date = datetime.now() - timedelta(days=max_age_days)
    
    def validate_job(self, job_data: Dict) -> Dict:
        """
        Validate a job posting for authenticity and quality.
        
        Args:
            job_data: Dictionary containing job information
            
        Returns:
            Dictionary with validation results:
            {
                "is_valid": bool,
                "score": int (0-100),
                "issues": List[str],
                "warnings": List[str]
            }
        """
        result = {
            "is_valid": True,
            "score": 100,
            "issues": [],
            "warnings": []
        }
        
        # Check required fields
        for field in self.REQUIRED_FIELDS:
            if not job_data.get(field):
                result["is_valid"] = False
                result["score"] -= 30
                result["issues"].append(f"Missing required field: {field}")
        
        # Validate title
        title_check = self._validate_title(job_data.get("title", ""))
        if not title_check["valid"]:
            result["score"] -= title_check["penalty"]
            result["warnings"].extend(title_check["issues"])
        
        # Validate company
        company_check = self._validate_company(job_data.get("company", ""))
        if not company_check["valid"]:
            result["score"] -= company_check["penalty"]
            result["warnings"].extend(company_check["issues"])
        
        # Validate description
        desc_check = self._validate_description(job_data.get("description", ""))
        if not desc_check["valid"]:
            result["score"] -= desc_check["penalty"]
            result["warnings"].extend(desc_check["issues"])
        
        # Check for suspicious content
        suspicious_check = self._check_suspicious_content(job_data)
        if suspicious_check["found"]:
            result["score"] -= 40
            result["is_valid"] = False
            result["issues"].append("Job contains suspicious keywords")
            result["warnings"].extend(suspicious_check["keywords"])
        
        # Check posting date if available
        if job_data.get("posted_date"):
            age_check = self._check_posting_age(job_data["posted_date"])
            if not age_check["valid"]:
                result["score"] -= age_check["penalty"]
                result["warnings"].append(age_check["message"])
        
        # Check for contact information
        if not self._has_contact_info(job_data):
            result["score"] -= 10
            result["warnings"].append("No contact information found")
        
        # Final validity check
        if result["score"] < 50:
            result["is_valid"] = False
            result["issues"].append(f"Overall quality score too low: {result['score']}/100")
        
        logger.info(f"Job validation: {job_data.get('title', 'Unknown')} - Score: {result['score']}, Valid: {result['is_valid']}")
        
        return result
    
    def _validate_title(self, title: str) -> Dict:
        """Validate job title."""
        result = {"valid": True, "penalty": 0, "issues": []}
        
        if not title:
            return {"valid": False, "penalty": 30, "issues": ["Empty title"]}
        
        # Title too short
        if len(title) < 5:
            result["valid"] = False
            result["penalty"] = 20
            result["issues"].append("Title too short")
        
        # Title too long (likely spam)
        if len(title) > 150:
            result["penalty"] = 10
            result["issues"].append("Title unusually long")
        
        # All caps title (often spam)
        if title.isupper() and len(title) > 10:
            result["penalty"] = 15
            result["issues"].append("Title in all caps")
        
        return result
    
    def _validate_company(self, company: str) -> Dict:
        """Validate company name."""
        result = {"valid": True, "penalty": 0, "issues": []}
        
        if not company or company.lower() in ["unknown", "unknown company", "חברה לא ידועה"]:
            result["penalty"] = 20
            result["issues"].append("No company name")
            return result
        
        # Check if company is known/verified
        company_lower = company.lower()
        is_known = any(known in company_lower for known in self.KNOWN_COMPANIES)
        
        if is_known:
            result["penalty"] = 0  # Bonus for known company
            logger.debug(f"Recognized company: {company}")
        else:
            # Not necessarily bad, just unknown
            result["penalty"] = 5
            result["issues"].append("Company not in verified list")
        
        return result
    
    def _validate_description(self, description: str) -> Dict:
        """Validate job description."""
        result = {"valid": True, "penalty": 0, "issues": []}
        
        if not description:
            return {"valid": False, "penalty": 30, "issues": ["Empty description"]}
        
        # Description too short (less than 100 chars)
        if len(description) < 100:
            result["valid"] = False
            result["penalty"] = 25
            result["issues"].append("Description too short (< 100 chars)")
        
        # Description too generic (very few unique words)
        words = set(description.lower().split())
        if len(words) < 20:
            result["penalty"] = 15
            result["issues"].append("Description too generic")
        
        # Check for meaningful content (has at least some technical terms or details)
        has_details = any(keyword in description.lower() for keyword in [
            "experience", "years", "skills", "requirements", "responsibilities",
            "ניסיון", "שנים", "דרישות", "אחריות", "כישורים"
        ])
        
        if not has_details:
            result["penalty"] = 10
            result["issues"].append("Description lacks specific details")
        
        return result
    
    def _check_suspicious_content(self, job_data: Dict) -> Dict:
        """Check for suspicious keywords indicating fake jobs."""
        result = {"found": False, "keywords": []}
        
        # Combine all text fields
        text_to_check = " ".join([
            job_data.get("title", ""),
            job_data.get("company", ""),
            job_data.get("description", "")
        ]).lower()
        
        for keyword in self.SUSPICIOUS_KEYWORDS:
            if keyword in text_to_check:
                result["found"] = True
                result["keywords"].append(f"Suspicious keyword: '{keyword}'")
        
        return result
    
    def _check_posting_age(self, posted_date: datetime) -> Dict:
        """Check if job posting is too old."""
        if isinstance(posted_date, str):
            try:
                posted_date = datetime.fromisoformat(posted_date.replace('Z', '+00:00'))
            except:
                return {"valid": True, "penalty": 0, "message": "Could not parse date"}
        
        age_days = (datetime.now() - posted_date.replace(tzinfo=None)).days
        
        if age_days > self.max_age_days:
            return {
                "valid": False,
                "penalty": 20,
                "message": f"Job posting is {age_days} days old (max: {self.max_age_days})"
            }
        
        if age_days > 30:
            return {
                "valid": True,
                "penalty": 10,
                "message": f"Job posting is {age_days} days old"
            }
        
        return {"valid": True, "penalty": 0, "message": "Posting age acceptable"}
    
    def _has_contact_info(self, job_data: Dict) -> bool:
        """Check if job has contact information."""
        # Check for email, phone, or apply URL
        has_url = bool(job_data.get("url"))
        has_apply_url = bool(job_data.get("apply_url"))
        
        description = job_data.get("description", "")
        has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', description))
        has_phone = bool(re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', description))
        
        return has_url or has_apply_url or has_email or has_phone


class JobDeduplicator:
    """Identifies and removes duplicate job postings."""
    
    def __init__(self, similarity_threshold: float = 0.85):
        """
        Initialize deduplicator.
        
        Args:
            similarity_threshold: Minimum similarity score (0-1) to consider jobs as duplicates
        """
        self.similarity_threshold = similarity_threshold
    
    def find_duplicates(self, jobs: List[Dict]) -> List[List[int]]:
        """
        Find duplicate jobs in a list.
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            List of duplicate groups (indices of duplicate jobs)
        """
        duplicate_groups = []
        processed_indices = set()
        
        for i in range(len(jobs)):
            if i in processed_indices:
                continue
            
            current_group = [i]
            processed_indices.add(i)
            
            for j in range(i + 1, len(jobs)):
                if j in processed_indices:
                    continue
                
                if self.are_duplicates(jobs[i], jobs[j]):
                    current_group.append(j)
                    processed_indices.add(j)
            
            if len(current_group) > 1:
                duplicate_groups.append(current_group)
        
        return duplicate_groups
    
    def are_duplicates(self, job1: Dict, job2: Dict) -> bool:
        """
        Check if two jobs are duplicates.
        
        Args:
            job1: First job dictionary
            job2: Second job dictionary
            
        Returns:
            True if jobs are duplicates
        """
        # Same URL = definitely duplicate
        if job1.get("url") and job2.get("url"):
            if job1["url"] == job2["url"]:
                return True
        
        # Compare title and company
        title_similarity = self._calculate_similarity(
            job1.get("title", ""),
            job2.get("title", "")
        )
        
        company_similarity = self._calculate_similarity(
            job1.get("company", ""),
            job2.get("company", "")
        )
        
        # Both title and company must be similar
        if title_similarity >= self.similarity_threshold and company_similarity >= self.similarity_threshold:
            logger.debug(f"Found duplicate: '{job1.get('title')}' at '{job1.get('company')}' "
                        f"(similarity: title={title_similarity:.2f}, company={company_similarity:.2f})")
            return True
        
        return False
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts using SequenceMatcher."""
        if not text1 or not text2:
            return 0.0
        
        # Normalize texts
        text1 = text1.lower().strip()
        text2 = text2.lower().strip()
        
        return SequenceMatcher(None, text1, text2).ratio()
    
    def merge_duplicates(self, jobs: List[Dict]) -> List[Dict]:
        """
        Remove duplicate jobs, keeping the most complete version.
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            Deduplicated list of jobs
        """
        duplicate_groups = self.find_duplicates(jobs)
        
        if not duplicate_groups:
            logger.info("No duplicates found")
            return jobs
        
        # Indices to remove
        indices_to_remove = set()
        
        for group in duplicate_groups:
            # Keep the job with the most complete information
            best_job_idx = self._select_best_job(jobs, group)
            
            for idx in group:
                if idx != best_job_idx:
                    indices_to_remove.add(idx)
        
        # Filter out duplicates
        deduplicated = [job for i, job in enumerate(jobs) if i not in indices_to_remove]
        
        logger.info(f"Removed {len(indices_to_remove)} duplicate jobs out of {len(jobs)}")
        
        return deduplicated
    
    def _select_best_job(self, jobs: List[Dict], indices: List[int]) -> int:
        """
        Select the best job from a group of duplicates.
        
        Criteria:
        - Longest description
        - Most skills
        - Has salary information
        """
        best_idx = indices[0]
        best_score = self._score_job_completeness(jobs[best_idx])
        
        for idx in indices[1:]:
            score = self._score_job_completeness(jobs[idx])
            if score > best_score:
                best_score = score
                best_idx = idx
        
        return best_idx
    
    def _score_job_completeness(self, job: Dict) -> int:
        """Score a job based on completeness of information."""
        score = 0
        
        # Description length
        desc_len = len(job.get("description", ""))
        score += min(desc_len // 10, 50)  # Max 50 points
        
        # Number of skills
        skills_count = len(job.get("skills", []))
        score += min(skills_count * 5, 25)  # Max 25 points
        
        # Has salary
        if job.get("salary_min") or job.get("salary_max"):
            score += 15
        
        # Has location
        if job.get("location"):
            score += 5
        
        # Has experience level
        if job.get("experience_level"):
            score += 5
        
        return score
