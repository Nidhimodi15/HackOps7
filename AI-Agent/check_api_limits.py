"""
Check RapidAPI GST Insights API limits and usage
"""
import requests

api_key = "74a674e197msh302bfc0624c615ap13e7fejsnfa8d2224e24f"
api_host = "gst-insights-api1.p.rapidapi.com"

# Try to get API info
url = f"https://{api_host}/gstin/27AAPFU0939F1ZV"  # Sample GST for testing

headers = {
    "x-rapidapi-key": api_key,
    "x-rapidapi-host": api_host
}

print("=" * 60)
print("🔍 CHECKING RAPIDAPI LIMITS")
print("=" * 60)
print(f"API Host: {api_host}")
print(f"API Key: {api_key[:20]}...")
print()

try:
    response = requests.get(url, headers=headers, timeout=10)
    
    print(f"Status Code: {response.status_code}")
    print(f"\n📋 Response Headers:")
    
    # Check for rate limit headers
    important_headers = [
        'x-ratelimit-requests-limit',
        'x-ratelimit-requests-remaining',
        'x-ratelimit-requests-reset',
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'x-ratelimit-reset',
        'x-subscription-requests-limit',
        'x-subscription-requests-remaining'
    ]
    
    found_headers = False
    for header in important_headers:
        if header in response.headers:
            print(f"  {header}: {response.headers[header]}")
            found_headers = True
    
    if not found_headers:
        print("  No rate limit headers found")
        print("\n  All headers:")
        for key, value in response.headers.items():
            if 'rate' in key.lower() or 'limit' in key.lower() or 'subscription' in key.lower():
                print(f"    {key}: {value}")
    
    print(f"\n📄 Response Body:")
    print(response.text[:500])
    
    # Common RapidAPI Plans
    print("\n" + "=" * 60)
    print("📊 COMMON RAPIDAPI PLANS FOR GST INSIGHTS:")
    print("=" * 60)
    print("🆓 FREE Plan:")
    print("   - 10 requests/month")
    print("   - $0/month")
    print()
    print("💰 BASIC Plan:")
    print("   - 100 requests/month")
    print("   - ~$10-20/month")
    print()
    print("🚀 PRO Plan:")
    print("   - 1000+ requests/month")
    print("   - ~$50-100/month")
    print()
    print("=" * 60)
    
    if response.status_code == 429:
        print("❌ RATE LIMIT EXCEEDED!")
        print("   Your free quota is finished for this month.")
    elif response.status_code == 403:
        print("❌ FORBIDDEN - API Key issue or quota exceeded")
    elif response.status_code == 200:
        print("✅ API is working! You have quota remaining.")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "=" * 60)
print("💡 TIP: Check your RapidAPI dashboard at:")
print("   https://rapidapi.com/hub")
print("   Go to 'My Apps' → 'GST Insights' to see exact usage")
print("=" * 60)
