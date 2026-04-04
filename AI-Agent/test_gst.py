from gst_verifier import gst_verifier

# Test GST number
gst_number = "24ABYFM2874M1ZD"

print(f"🔍 Testing GST Number: {gst_number}")
print("=" * 60)

result = gst_verifier.verify_gst(gst_number)

print("\n📋 Verification Result:")
print("=" * 60)
print(f"Success: {result.get('success')}")
print(f"Valid: {result.get('is_valid')}")
print(f"Active: {result.get('is_active')}")

if result.get('success'):
    print(f"\n✅ GST Details:")
    print(f"   Legal Name: {result.get('legal_name', 'N/A')}")
    print(f"   Trade Name: {result.get('trade_name', 'N/A')}")
    print(f"   Status: {result.get('status', 'N/A')}")
    print(f"   Registration Date: {result.get('registration_date', 'N/A')}")
    print(f"   State: {result.get('state', 'N/A')}")
    print(f"   Business Type: {result.get('business_type', 'N/A')}")
else:
    print(f"\n❌ Error: {result.get('error', 'Unknown error')}")

print("\n" + "=" * 60)
print("✅ Test Complete!")
