from database import FintelDatabase
import sys
import os

# Add AI-Agent to path
sys.path.append(os.getcwd())

db = FintelDatabase()

anomalies = db.get_anomalies()

duplicate_count = sum(1 for a in anomalies if a['anomalyType'] == 'DUPLICATE_INVOICE')
invalid_gst_count = sum(1 for a in anomalies if a['anomalyType'] == 'INVALID_GST')
missing_gst_count = sum(1 for a in anomalies if a['anomalyType'] == 'MISSING_GST')
gst_vendor_mismatch_count = sum(1 for a in anomalies if a['anomalyType'] == 'GST_VENDOR_MISMATCH')

print(f"Total Anomalies: {len(anomalies)}")
print(f"Duplicate Invoices: {duplicate_count}")
print(f"Invalid GST: {invalid_gst_count}")
print(f"Missing GST: {missing_gst_count}")
print(f"GST Vendor Mismatch: {gst_vendor_mismatch_count}")

db.close()
