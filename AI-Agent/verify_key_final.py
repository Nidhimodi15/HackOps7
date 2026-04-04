import requests
import json

gst_number = "24AAGFD1279G1ZM"
api_key = "8900b371dmshae679431887f9fbfp1282bfjsn2f32a6744755"
api_host = "gst-insights-api1.p.rapidapi.com"

url = f"https://{api_host}/gstin/{gst_number}"
headers = {
    "x-rapidapi-key": api_key,
    "x-rapidapi-host": api_host
}

print(f"REQUESTING: {url}")
print(f"HEADERS: {headers}")

try:
    response = requests.get(url, headers=headers)
    print(f"\nSTATUS CODE: {response.status_code}")
    print(f"RESPONSE RAW: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
