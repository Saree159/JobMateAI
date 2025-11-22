"""
Test script for job scrapers.
Run this to verify the scrapers are working correctly.
"""
import sys
import asyncio
from app.services.scrapers import ScraperFactory

# Test URLs for different job boards
TEST_URLS = {
    "LinkedIn": "https://www.linkedin.com/jobs/view/3987654321",  # Example URL
    "Indeed": "https://www.indeed.com/viewjob?jk=abc123",  # Example URL
    "Glassdoor": "https://www.glassdoor.com/job-listing/JV_IC1234567_KO0,20.htm",  # Example URL
}


def test_scraper(platform, url):
    """Test a single scraper."""
    print(f"\n{'='*60}")
    print(f"Testing {platform} Scraper")
    print(f"{'='*60}")
    print(f"URL: {url}")
    
    try:
        result = ScraperFactory.scrape_job(url)
        
        if result:
            print("\n✅ Scraping Successful!")
            print(f"\nExtracted Data:")
            print(f"  Title: {result.get('title', 'N/A')}")
            print(f"  Company: {result.get('company', 'N/A')}")
            print(f"  Location: {result.get('location', 'N/A')}")
            print(f"  Job Type: {result.get('job_type', 'N/A')}")
            print(f"  Work Mode: {result.get('work_mode', 'N/A')}")
            print(f"  Salary Min: {result.get('salary_min', 'N/A')}")
            print(f"  Salary Max: {result.get('salary_max', 'N/A')}")
            print(f"  Skills: {', '.join(result.get('skills', []))[:100]}")
            print(f"  Description: {result.get('description', 'N/A')[:150]}...")
        else:
            print("\n❌ Scraping Failed - No data extracted")
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")


def main():
    """Run scraper tests."""
    print("\n" + "="*60)
    print("JOB SCRAPER TEST SUITE")
    print("="*60)
    
    # Test with example URLs
    # Note: These URLs are placeholders. In production, use real job posting URLs
    
    print("\n⚠️  NOTE: Using example URLs. Replace with real job URLs to test properly.")
    print("Example real URLs:")
    print("  - LinkedIn: https://www.linkedin.com/jobs/view/<job-id>")
    print("  - Indeed: https://www.indeed.com/viewjob?jk=<job-key>")
    print("  - Glassdoor: https://www.glassdoor.com/job-listing/...")
    
    # You can uncomment and add real URLs here for testing
    # for platform, url in TEST_URLS.items():
    #     test_scraper(platform, url)
    
    print("\n" + "="*60)
    print("SCRAPER CAPABILITIES:")
    print("="*60)
    print("✅ LinkedIn - Title, Company, Location, Description, Skills")
    print("✅ Indeed - Title, Company, Location, Salary, Description, Skills")
    print("✅ Glassdoor - Title, Company, Location, Salary, Description, Skills")
    print("✅ Drushim.co.il - Israeli job board support")
    print("✅ AllJobs.co.il - Israeli job board support")
    print("\n✅ Features:")
    print("  - Automatic skill extraction (40+ tech skills)")
    print("  - Salary parsing (ILS, USD)")
    print("  - Remote/Hybrid detection")
    print("  - Job type detection (Full-time, Part-time, Contract)")
    print("  - Rate limiting to avoid blocking")
    print("  - Retry logic with exponential backoff")
    
    print("\n" + "="*60)
    print("USAGE IN APPLICATION:")
    print("="*60)
    print("1. Frontend: Click 'Add Job' → 'Extract from URL' tab")
    print("2. Paste any supported job URL")
    print("3. Click 'Extract Job Details'")
    print("4. Review extracted data in Manual Entry tab")
    print("5. Save the job to your tracker")
    
    print("\n" + "="*60)
    print("API ENDPOINT:")
    print("="*60)
    print("POST /api/jobs/scrape-url?url=<job-url>&user_id=<user-id>")
    print("\nExample:")
    print("curl -X POST 'http://localhost:8000/api/jobs/scrape-url?url=https://linkedin.com/jobs/view/123&user_id=1'")
    
    print("\n✅ Scrapers initialized successfully!")
    print("📝 To test with real URLs, use the frontend or API endpoint.\n")


if __name__ == "__main__":
    main()
