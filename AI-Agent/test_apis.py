import requests, json

keys = [
    "fe832c00bc8be1690eeba69f78506316",
    "3080f8c4f23eaa7c1f20d9c12c97f882",
    "2fb55fbd8bbd3865c7be9f1e5bd9368c",
    "0d68fb5c57ff8a9aebec8a22dd1f71aa"
]

gst = "24AAACI0931P1ZL"
results = []

for i, key in enumerate(keys):
    try:
        r = requests.get(f"https://sheet.gstincheck.co.in/check/{key}/{gst}", timeout=15)
        status = "WORKING" if r.status_code == 200 else f"FAILED ({r.status_code})"
        name = ""
        if r.status_code == 200:
            data = r.json()
            name = data.get("data", {}).get("lgnm", "")
        results.append(f"Key #{i+1}: {status} | {name}")
    except Exception as e:
        results.append(f"Key #{i+1}: ERROR - {e}")

# Write results
with open("api_results.txt", "w") as f:
    for r in results:
        f.write(r + "\n")

# Also test failover
f2 = open("api_results.txt", "a")
f2.write("\n--- FAILOVER TEST ---\n")
from gst_verifier import GSTVerifier
v = GSTVerifier()
# Simulate: set to key index 0 and verify
v.current_key_index = 0
r1 = v.verify_gst("18AABCU2874Q1ZL")
f2.write(f"Call 1: success={r1.get('success')} key_used=#{r1.get('api_key_used')} name={r1.get('legal_name','')}\n")
r2 = v.verify_gst("27ACCPT7673E1Z9")
f2.write(f"Call 2: success={r2.get('success')} key_used=#{r2.get('api_key_used')} name={r2.get('legal_name','')}\n")
f2.close()
print("Done")
