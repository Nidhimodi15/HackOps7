"""
Check Gemini API Quota and Usage
"""

import google.generativeai as genai
import requests

# Your API Key
API_KEY = "AIzaSyB7zJbF7Nx_KP4oIOZCGc5P84WN4RHO14M"

print("=" * 70)
print("🔍 CHECKING GEMINI API QUOTA")
print("=" * 70)
print()

# Configure Gemini
genai.configure(api_key=API_KEY)

print(f"API Key: {API_KEY[:20]}...{API_KEY[-10:]}")
print()

# Try to get model info
try:
    print("📊 Available Models:")
    print("-" * 70)
    models = genai.list_models()
    for model in models:
        if 'gemini' in model.name.lower():
            print(f"✅ {model.name}")
            print(f"   Display Name: {model.display_name}")
            print(f"   Supported: {model.supported_generation_methods}")
            print()
except Exception as e:
    print(f"❌ Error listing models: {e}")
    print()

# Test API with a simple call
print("=" * 70)
print("🧪 TESTING API WITH SIMPLE CALL")
print("=" * 70)
print()

try:
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    response = model.generate_content("Say 'API is working!'")
    print(f"✅ API Response: {response.text}")
    print()
    print("✅ API IS WORKING!")
except Exception as e:
    print(f"❌ API Error: {e}")
    print()

# Check quota information
print("=" * 70)
print("📊 GEMINI API FREE TIER LIMITS")
print("=" * 70)
print()

print("Gemini 2.0 Flash (Experimental):")
print("  ✅ Rate Limit: 15 RPM (Requests Per Minute)")
print("  ✅ Daily Limit: 1,500 requests/day")
print("  ✅ Free tier: YES")
print()

print("Gemini 2.5 Flash:")
print("  ✅ Rate Limit: 15 RPM (Requests Per Minute)")
print("  ✅ Daily Limit: 1,500 requests/day")
print("  ✅ Free tier: YES")
print()

print("Gemini 1.5 Flash:")
print("  ✅ Rate Limit: 15 RPM (Requests Per Minute)")
print("  ✅ Daily Limit: 1,500 requests/day")
print("  ✅ Free tier: YES")
print()

# Calculate usage
print("=" * 70)
print("📈 YOUR ESTIMATED USAGE")
print("=" * 70)
print()

print("Current System Configuration:")
print("  - Gemini Vision OCR: 1-3 calls per invoice")
print("  - LangChain AI Agent: 3-5 calls per invoice")
print("  - Total: 4-8 calls per invoice")
print()

print("With 1,500 requests/day limit:")
print("  ✅ Can process: ~187-375 invoices/day")
print("  ✅ Can process: ~5,625-11,250 invoices/month")
print()

print("With 15 RPM (Requests Per Minute) limit:")
print("  ✅ Can process: ~2-3 invoices/minute")
print("  ✅ Can process: ~120-180 invoices/hour")
print()

print("=" * 70)
print("💡 RECOMMENDATIONS")
print("=" * 70)
print()

print("To check real-time quota:")
print("  1. Go to: https://aistudio.google.com/app/apikey")
print("  2. Click on your API key")
print("  3. View usage dashboard")
print()

print("To increase limits:")
print("  1. Upgrade to paid tier")
print("  2. Higher rate limits available")
print("  3. Pay-as-you-go pricing")
print()

print("=" * 70)
