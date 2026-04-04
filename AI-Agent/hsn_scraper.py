"""
HSN Code and GST Rate Scraper
Extracts HSN codes and their corresponding GST rates from ICAI website
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import time
from typing import List, Dict

def scrape_hsn_data(url: str) -> List[Dict[str, str]]:
    """
    Scrape HSN codes and GST rates from the ICAI website
    """
    print("🔍 Starting HSN data extraction...")
    
    try:
        # Send request with headers to mimic browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print("📡 Fetching data from website...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        print("✅ Data fetched successfully!")
        print("🔍 Parsing HTML content...")
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the table containing HSN data
        # The website uses ASP.NET GridView, typically in a table
        tables = soup.find_all('table')
        
        hsn_data = []
        
        for table in tables:
            rows = table.find_all('tr')
            
            # Skip if table has no rows
            if len(rows) < 2:
                continue
            
            # Try to find header row
            headers_row = rows[0]
            headers = [th.get_text(strip=True) for th in headers_row.find_all(['th', 'td'])]
            
            # Check if this looks like the HSN table
            if not any('HSN' in h.upper() for h in headers):
                continue
            
            print(f"📊 Found table with headers: {headers}")
            
            # Process data rows
            for row in rows[1:]:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    row_data = [cell.get_text(strip=True) for cell in cells]
                    
                    # Extract HSN code and GST rate
                    # Adjust indices based on actual table structure
                    if len(row_data) >= 2:
                        hsn_entry = {
                            'hsn_code': row_data[0],
                            'description': row_data[1] if len(row_data) > 1 else '',
                            'gst_rate': row_data[-1] if len(row_data) > 2 else '',
                        }
                        
                        # Only add if HSN code looks valid (numeric)
                        if hsn_entry['hsn_code'] and any(char.isdigit() for char in hsn_entry['hsn_code']):
                            hsn_data.append(hsn_entry)
        
        print(f"✅ Extracted {len(hsn_data)} HSN entries")
        return hsn_data
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching data: {e}")
        return []
    except Exception as e:
        print(f"❌ Error parsing data: {e}")
        return []

def save_to_json(data: List[Dict[str, str]], filename: str = 'hsn_gst_rates.json'):
    """Save HSN data to JSON file"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Data saved to {filename}")
    except Exception as e:
        print(f"❌ Error saving JSON: {e}")

def save_to_csv(data: List[Dict[str, str]], filename: str = 'hsn_gst_rates.csv'):
    """Save HSN data to CSV file"""
    try:
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False, encoding='utf-8')
        print(f"💾 Data saved to {filename}")
    except Exception as e:
        print(f"❌ Error saving CSV: {e}")

def save_to_mongodb(data: List[Dict[str, str]]):
    """Save HSN data to MongoDB"""
    try:
        from database import FintelDatabase
        
        db = FintelDatabase()
        
        # Create HSN collection if it doesn't exist
        hsn_collection = db.db['hsn_codes']
        
        # Clear existing data
        hsn_collection.delete_many({})
        
        # Insert new data
        if data:
            hsn_collection.insert_many(data)
            print(f"💾 {len(data)} HSN entries saved to MongoDB")
        
        db.close()
    except Exception as e:
        print(f"❌ Error saving to MongoDB: {e}")

def create_hsn_lookup_dict(data: List[Dict[str, str]]) -> Dict[str, str]:
    """Create a dictionary for quick HSN to GST rate lookup"""
    lookup = {}
    for entry in data:
        hsn_code = entry.get('hsn_code', '').strip()
        gst_rate = entry.get('gst_rate', '').strip()
        if hsn_code and gst_rate:
            lookup[hsn_code] = gst_rate
    return lookup

if __name__ == "__main__":
    # URL to scrape
    url = "https://www.vasai.icai.org/resources/Utilities/HSN_RATE_LIST/HSN_RATE_LIST.aspx"
    
    print("=" * 60)
    print("HSN CODE & GST RATE EXTRACTOR")
    print("=" * 60)
    
    # Scrape data
    hsn_data = scrape_hsn_data(url)
    
    if hsn_data:
        print(f"\n📊 Total HSN entries extracted: {len(hsn_data)}")
        
        # Display first 10 entries
        print("\n📋 Sample data (first 10 entries):")
        print("-" * 60)
        for i, entry in enumerate(hsn_data[:10], 1):
            print(f"{i}. HSN: {entry.get('hsn_code', 'N/A')}")
            print(f"   Description: {entry.get('description', 'N/A')[:50]}...")
            print(f"   GST Rate: {entry.get('gst_rate', 'N/A')}")
            print()
        
        # Save to files
        print("\n💾 Saving data...")
        save_to_json(hsn_data)
        save_to_csv(hsn_data)
        
        # Optionally save to MongoDB
        save_mongodb = input("\n💾 Save to MongoDB? (y/n): ").strip().lower()
        if save_mongodb == 'y':
            save_to_mongodb(hsn_data)
        
        # Create lookup dictionary
        lookup = create_hsn_lookup_dict(hsn_data)
        print(f"\n📚 Created lookup dictionary with {len(lookup)} HSN codes")
        
        # Save lookup dictionary
        with open('hsn_lookup.json', 'w', encoding='utf-8') as f:
            json.dump(lookup, f, indent=2, ensure_ascii=False)
        print("💾 Lookup dictionary saved to hsn_lookup.json")
        
        print("\n✅ HSN data extraction completed successfully!")
        print(f"📁 Files created:")
        print("   - hsn_gst_rates.json (Full data)")
        print("   - hsn_gst_rates.csv (Spreadsheet format)")
        print("   - hsn_lookup.json (Quick lookup)")
    else:
        print("\n❌ No data extracted. Please check the website structure.")
        print("\n💡 Alternative: The website might use JavaScript to load data.")
        print("   Try using Selenium for dynamic content scraping.")
        
        # Provide alternative solution
        print("\n🔧 Creating alternative scraper with Selenium...")
        create_selenium_scraper()

def create_selenium_scraper():
    """Create an alternative scraper using Selenium for JavaScript-heavy sites"""
    selenium_code = '''"""
HSN Scraper using Selenium (for JavaScript-rendered content)
Install: pip install selenium
Also download ChromeDriver: https://chromedriver.chromium.org/
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time

def scrape_with_selenium(url):
    print("🚀 Starting Selenium scraper...")
    
    # Setup Chrome driver
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')  # Run in background
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get(url)
        print("⏳ Waiting for page to load...")
        time.sleep(5)  # Wait for JavaScript to load
        
        # Find table or grid
        wait = WebDriverWait(driver, 10)
        table = wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
        
        rows = table.find_elements(By.TAG_NAME, "tr")
        
        hsn_data = []
        for row in rows[1:]:  # Skip header
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 2:
                hsn_data.append({
                    'hsn_code': cells[0].text.strip(),
                    'description': cells[1].text.strip() if len(cells) > 1 else '',
                    'gst_rate': cells[-1].text.strip()
                })
        
        print(f"✅ Extracted {len(hsn_data)} entries")
        return hsn_data
        
    finally:
        driver.quit()

if __name__ == "__main__":
    url = "https://www.vasai.icai.org/resources/Utilities/HSN_RATE_LIST/HSN_RATE_LIST.aspx"
    data = scrape_with_selenium(url)
    
    with open('hsn_gst_rates_selenium.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    print("💾 Data saved to hsn_gst_rates_selenium.json")
'''
    
    with open('hsn_scraper_selenium.py', 'w', encoding='utf-8') as f:
        f.write(selenium_code)
    
    print("📝 Created hsn_scraper_selenium.py")
    print("   Run this if the main scraper doesn't work due to JavaScript")
