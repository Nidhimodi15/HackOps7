import requests
import json

api_keys = [
    "fe832c00bc8be1690eeba69f78506316",
    "3080f8c4f23eaa7c1f20d9c12c97f882",
    "2fb55fbd8bbd3865c7be9f1e5bd9368c",
    "0d68fb5c57ff8a9aebec8a22dd1f71aa"
]

test_gst = "24AAACI0931P1ZL" # Valid GST for testing

results = []

for i, key in enumerate(api_keys):
    url = f"https://sheet.gstincheck.co.in/check/{key}/{test_gst}"
    try:
        response = requests.get(url, timeout=10)
        status = "Unknown"
        message = ""
        
        if response.status_code == 200:
            data = response.json()
            if data.get("flag"):
                status = "LIVE ✅"
            else:
                error_msg = data.get("message", "")
                if "credit" in error_msg.lower() or "limit" in error_msg.lower() or "quota" in error_msg.lower():
                    status = "EXHAUSTED (Dead for today) ❌"
                else:
                    status = "LIVE (But error) ⚠️"
                message = error_msg
        else:
            status = f"DEAD (Code {response.status_code}) ❌"
            
        results.append({
            "index": i + 1,
            "key": key,
            "status": status,
            "message": message
        })
    except Exception as e:
        results.append({
            "index": i + 1,
            "key": key,
            "status": "DEAD (Connection Error) ❌",
            "message": str(e)
        })

print("\n📊 API Key Status Report:")
print("-" * 50)
live_count = 0
for res in results:
    print(f"Key #{res['index']} ({res['key'][:6]}...): {res['status']}")
    if "LIVE" in res['status']:
        live_count += 1
    if res['message']:
        print(f"   Note: {res['message']}")

print("-" * 50)
print(f"Total Live: {live_count}")
print(f"Total Dead/Exhausted: {len(api_keys) - live_count}")
