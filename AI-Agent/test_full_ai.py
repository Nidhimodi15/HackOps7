"""
Test script to verify Full AI Integration
"""

from langchain_agent import analyze_invoice_with_agent

# Test invoice data
test_invoice = {
    "invoice_number": "INV-TEST-001",
    "vendor_name": "Test Vendor Corp",
    "total_amount": 75000,
    "gst_numbers": ["24AAACC1206D1ZM"]
}

print("=" * 70)
print("🤖 TESTING FULL AI INTEGRATION")
print("=" * 70)
print()

print("📄 Test Invoice:")
print(f"   Invoice Number: {test_invoice['invoice_number']}")
print(f"   Vendor: {test_invoice['vendor_name']}")
print(f"   Amount: ₹{test_invoice['total_amount']:,.2f}")
print(f"   GST: {test_invoice['gst_numbers']}")
print()

print("🔄 Running AI Agent Analysis...")
print("-" * 70)

try:
    result = analyze_invoice_with_agent(test_invoice)
    
    if result["success"]:
        print("✅ AI ANALYSIS SUCCESSFUL!")
        print()
        print("📊 AI Agent Output:")
        print("-" * 70)
        print(result["analysis"])
        print("-" * 70)
        print()
        
        if result.get("confidence"):
            print(f"🎯 Confidence: {result['confidence']}")
        
        print()
        print("✅ FULL AI INTEGRATION WORKING!")
        
    else:
        print("❌ AI Analysis Failed")
        print(f"Error: {result.get('error')}")
        
except Exception as e:
    print(f"❌ Test Failed: {e}")
    print()
    print("⚠️  Make sure you have:")
    print("   1. Installed: pip install langchain langchain-google-genai")
    print("   2. Set GEMINI_API_KEY in .env")
    print("   3. MongoDB running")

print()
print("=" * 70)
