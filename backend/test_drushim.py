#!/usr/bin/env python3
"""Test script for DrushimScraper with real URLs."""

import asyncio
import sys
from app.services.scrapers import DrushimScraper

async def test_drushim(url: str):
    """Test Drushim scraper with a specific URL."""
    print(f"Testing Drushim scraper with URL: {url}\n")
    
    scraper = DrushimScraper()
    # Get all jobs from the listing
    jobs = await scraper.scrape_listing_async(url)
    
    if jobs:
        print(f"✅ Scraping successful! Found {len(jobs)} jobs\n")
        print("=" * 80)
        
        for i, job in enumerate(jobs, 1):
            print(f"\n{i}. {job.get('title')}")
            print(f"   Company: {job.get('company')}")
            print(f"   Location: {job.get('location')}")
            print(f"   Experience: {job.get('experience_level') or 'Not specified'}")
            desc = job.get('description', '')
            if desc:
                print(f"   Description: {desc[:150]}...")
            print(f"   URL: {job.get('url')}")
        
        print("\n" + "=" * 80)
    else:
        print("❌ Scraping failed - no data returned")
    
    return jobs

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_drushim.py <drushim_job_url>")
        print("\nExample:")
        print("python test_drushim.py https://www.drushim.co.il/job/12345678/")
        sys.exit(1)
    
    url = sys.argv[1]
    asyncio.run(test_drushim(url))
