import requests
import json

# Test GST API
gst_number = "24AAGFD1279G1ZM"
api_key = "6fd01788b9msh331d803d9427ba0p1089bcjsn9be0ba0f4de0"
api_host = "gst-insights.p.rapidapi.com"

url = f"https://{api_host}/gstin/{gst_number}"
headers = {
    "x-rapidapi-key": api_key,
    "x-rapidapi-host": api_host
}

print(f"Testing GST: {gst_number}")
print(f"URL: {url}")
print(f"Headers: {headers}")
print("-" * 60)

try:
    response = requests.get(url, headers=headers, timeout=10)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print("-" * 60)
    print(f"Response Text:")
    print(response.text)
    print("-" * 60)
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Parsed JSON:")
            print(json.dumps(data, indent=2))
        except:
            print("Could not parse JSON")
    
except Exception as e:
    print(f"Error: {e}")
