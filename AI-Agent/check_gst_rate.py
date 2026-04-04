"""
Check GST rate in latest invoice
"""

from database import FintelDatabase

print("=" * 70)
print("📊 CHECKING GST RATE IN LATEST INVOICE")
print("=" * 70)
print()

# Connect to database
db = FintelDatabase()

# Get latest invoice
invoices = list(db.invoices.find().sort('_id', -1).limit(1))

if not invoices:
    print("❌ No invoices found in database!")
else:
    invoice = invoices[0]
    
    print("✅ LATEST INVOICE:")
    print("-" * 70)
    print(f"Invoice Number: {invoice.get('invoiceNumber', 'N/A')}")
    print(f"Vendor Name: {invoice.get('vendorName', 'N/A')}")
    print(f"Total Amount: ₹{invoice.get('totalAmount', 0):,.2f}")
    print()
    print("GST INFORMATION:")
    print("-" * 70)
    print(f"GST Rate: {invoice.get('gstRate', 'NOT FOUND')}")
    print(f"CGST Rate: {invoice.get('cgstRate', 'NOT FOUND')}")
    print(f"SGST Rate: {invoice.get('sgstRate', 'NOT FOUND')}")
    print(f"IGST Rate: {invoice.get('igstRate', 'NOT FOUND')}")
    print(f"GST Numbers: {invoice.get('gstNumbers', [])}")
    print("-" * 70)
    print()
    
    # Check all fields
    print("ALL FIELDS IN INVOICE:")
    print("-" * 70)
    for key in invoice.keys():
        if 'gst' in key.lower() or 'cgst' in key.lower() or 'sgst' in key.lower() or 'igst' in key.lower():
            print(f"{key}: {invoice.get(key)}")
    print("-" * 70)

db.close()

print()
print("=" * 70)
