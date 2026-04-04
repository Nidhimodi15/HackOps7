"""
Quick script to check GST number from latest invoice
"""
from pymongo import MongoClient
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['fintel_ai']

# Get the latest invoice
latest_invoice = db.invoices.find_one(sort=[('uploadDate', -1)])

if not latest_invoice:
    print("❌ No invoices found in database")
    exit()

print("=" * 60)
print("📄 LATEST INVOICE DETAILS")
print("=" * 60)
print(f"Filename: {latest_invoice.get('filename', 'Unknown')}")
print(f"Invoice Number: {latest_invoice.get('invoiceNumber', 'Unknown')}")
print(f"Vendor Name: {latest_invoice.get('vendorName', 'Unknown')}")
print(f"Upload Date: {latest_invoice.get('uploadDate', 'Unknown')}")
print()

# Get GST numbers
gst_number = latest_invoice.get('gstNumber')
all_gst_numbers = latest_invoice.get('allGstNumbers', [])

print("📋 GST NUMBERS EXTRACTED:")
print(f"Primary GST: {gst_number}")
print(f"All GST Numbers: {all_gst_numbers}")
print()

if not gst_number or gst_number == 'Unknown':
    print("⚠️ No valid GST number found to verify")
    exit()

# Verify with RapidAPI
print("=" * 60)
print("🔍 VERIFYING GST WITH RAPIDAPI...")
print("=" * 60)

api_key = os.getenv('RAPIDAPI_KEY')
if not api_key:
    print("❌ RAPIDAPI_KEY not found in .env file")
    exit()

url = "https://gst-insights.p.rapidapi.com/gstinsights"
headers = {
    "x-rapidapi-key": api_key,
    "x-rapidapi-host": "gst-insights.p.rapidapi.com",
    "Content-Type": "application/json"
}
payload = {"gstin": gst_number}

try:
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    result = response.json()
    
    print(f"\n✅ API Response Status: {response.status_code}")
    print(f"\nGST Number: {gst_number}")
    print(f"Valid: {result.get('valid', False)}")
    print(f"Active: {result.get('active', False)}")
    print(f"Legal Name: {result.get('legalName', 'N/A')}")
    print(f"Trade Name: {result.get('tradeName', 'N/A')}")
    print(f"Status: {result.get('status', 'N/A')}")
    print(f"Registration Date: {result.get('registrationDate', 'N/A')}")
    print(f"State: {result.get('state', 'N/A')}")
    print(f"Taxpayer Type: {result.get('taxpayerType', 'N/A')}")
    
    print("\n" + "=" * 60)
    if result.get('valid') and result.get('active'):
        print("✅ GST NUMBER IS VALID AND ACTIVE!")
    elif result.get('valid'):
        print("⚠️ GST NUMBER IS VALID BUT NOT ACTIVE")
    else:
        print("❌ GST NUMBER IS INVALID")
    print("=" * 60)
    
except Exception as e:
    print(f"❌ Error verifying GST: {str(e)}")
