import requests

api_key = "7bc4a1b959msh1e1dc9c6075cdc8p1ff4e0jsn178b4d51fccd"
api_host = "gst-insights-api1.p.rapidapi.com"
gst = "24AAACI0931P1ZL"

url = f"https://{api_host}/gstin/{gst}"

headers = {
    "x-rapidapi-key": api_key,
    "x-rapidapi-host": api_host
}

print("=" * 60)
print(f"Testing New API Key")
print("=" * 60)
print(f"URL: {url}")
print(f"GST: {gst}")
print()

try:
    response = requests.get(url, headers=headers, timeout=10)
    
    print(f"Status Code: {response.status_code}")
    print(f"\nHeaders:")
    for key, value in response.headers.items():
        if 'rate' in key.lower() or 'limit' in key.lower():
            print(f"  {key}: {value}")
    
    print(f"\nResponse:")
    print(response.text)
    
    if response.status_code == 200:
        print("\n✅ API KEY WORKING!")
        data = response.json()
        print(f"\nGST Details:")
        print(f"  Legal Name: {data.get('legalName', 'N/A')}")
        print(f"  Trade Name: {data.get('tradeName', 'N/A')}")
        print(f"  Status: {data.get('status', 'N/A')}")
        print(f"  State: {data.get('state', 'N/A')}")
    elif response.status_code == 403:
        print("\n❌ 403 Forbidden - Check API subscription")
    elif response.status_code == 429:
        print("\n❌ 429 Rate Limit Exceeded")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
