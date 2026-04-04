from database import FintelDatabase
import sys
import os

# Add AI-Agent to path
sys.path.append(os.getcwd())

db = FintelDatabase()

# Fetch latest invoice from the invoices collection
invoices = list(db.invoices.find().sort("uploadDate", -1).limit(1))

if invoices:
    inv = invoices[0]
    print(f"📄 Latest Invoice Found:")
    print(f"   Name: {inv.get('filename') or inv.get('fileName')}")
    print(f"   Number: {inv.get('invoiceNumber') or inv.get('invoice_number')}")
    print(f"   Amount: ₹{inv.get('totalAmount') or inv.get('total_amount')}")
    print(f"   Vendor: {inv.get('vendorName') or inv.get('vendor_name')}")
    print(f"   Upload Date: {inv.get('uploadDate') or inv.get('upload_date')}")
else:
    print("❌ No invoices found in the database.")

db.close()
