from gst_verifier import GSTVerifier

# Initialize verifier
verifier = GSTVerifier()

# GST number from your invoice
gst_number = "24AAACI0931P1ZL"

print("=" * 60)
print(f"🔍 VERIFYING GST: {gst_number}")
print("=" * 60)

# Verify
result = verifier.verify_gst(gst_number)

print("\n📋 VERIFICATION RESULT:")
print(f"Success: {result.get('success')}")
print(f"Valid: {result.get('is_valid')}")
print(f"Active: {result.get('is_active')}")
print(f"Legal Name: {result.get('legal_name', 'N/A')}")
print(f"Trade Name: {result.get('trade_name', 'N/A')}")
print(f"Status: {result.get('status', 'N/A')}")
print(f"State: {result.get('state', 'N/A')}")
print(f"Registration Date: {result.get('registration_date', 'N/A')}")
print(f"Taxpayer Type: {result.get('taxpayer_type', 'N/A')}")

if result.get('error'):
    print(f"\n❌ Error: {result.get('error')}")

print("\n" + "=" * 60)
if result.get('is_valid') and result.get('is_active'):
    print("✅ GST IS VALID AND ACTIVE!")
elif result.get('is_valid'):
    print("⚠️ GST IS VALID BUT NOT ACTIVE")
else:
    print("❌ GST IS INVALID OR API ERROR")
print("=" * 60)
