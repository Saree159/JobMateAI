#!/usr/bin/env python3
"""
Test script for Drushim scraper with Crawl4AI
"""
import asyncio
import sys
sys.path.insert(0, '/Users/alisaree/Desktop/JobMateAI/backend')

from app.services.scrapers import DrushimScraper

async def main():
    # Test with a Drushim job URL (replace with actual URL)
    test_url = input("Enter Drushim job URL (or press Enter for test): ").strip()
    if not test_url:
        test_url = "https://www.drushim.co.il/job/17439722/"
    
    print(f"\n🔍 Scraping: {test_url}\n")
    
    scraper = DrushimScraper()
    result = await scraper.scrape_async(test_url)
    
    if result:
        print("✅ Scraping successful!\n")
        print(f"📋 Title: {result.get('title')}")
        print(f"🏢 Company: {result.get('company')}")
        print(f"📍 Location: {result.get('location')}")
        print(f"💰 Salary: {result.get('salary_min')} - {result.get('salary_max')}")
        print(f"🔧 Skills: {', '.join(result.get('skills', []))}")
        print(f"\n📝 Description:\n{result.get('description', '')[:500]}...")
    else:
        print("❌ Scraping failed")

if __name__ == "__main__":
    asyncio.run(main())
