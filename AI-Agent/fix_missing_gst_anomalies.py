"""
Fix Missing GST Anomalies
Scans all existing invoices and creates MISSING_GST anomalies for those without GST numbers
"""

from database import FintelDatabase
from datetime import datetime

def fix_missing_gst_anomalies():
    """Scan all invoices and create missing GST anomalies"""
    
    print("=" * 60)
    print("FIXING MISSING GST ANOMALIES")
    print("=" * 60)
    
    db = FintelDatabase()
    
    # Get all invoices
    all_invoices = list(db.invoices.find())
    print(f"\n📊 Total invoices in database: {len(all_invoices)}")
    
    missing_gst_count = 0
    anomalies_created = 0
    
    for invoice in all_invoices:
        invoice_id = str(invoice['_id'])
        invoice_number = invoice.get('invoiceNumber', 'Unknown')
        vendor_name = invoice.get('vendorName', 'Unknown')
        gst_numbers = invoice.get('gstNumbers', [])
        upload_date = invoice.get('uploadDate', datetime.now())
        
        # Check if GST is missing
        is_missing = False
        
        if not gst_numbers or len(gst_numbers) == 0:
            is_missing = True
        elif gst_numbers == ['N/A'] or gst_numbers == ['Unknown'] or gst_numbers == ['']:
            is_missing = True
        
        if is_missing:
            missing_gst_count += 1
            
            # Check if anomaly already exists
            existing_anomaly = db.anomalies.find_one({
                'invoiceId': invoice_id,
                'anomalyType': 'MISSING_GST'
            })
            
            if not existing_anomaly:
                # Create MISSING_GST anomaly
                anomaly_data = {
                    'invoiceId': invoice_id,
                    'invoiceNumber': invoice_number,
                    'anomalyType': 'MISSING_GST',
                    'severity': 'HIGH',
                    'description': f"Invoice missing GST number - Vendor: {vendor_name}",
                    'detectedAt': upload_date,  # Use invoice upload date
                    'status': 'OPEN',
                    'vendorName': vendor_name
                }
                
                db.anomalies.insert_one(anomaly_data)
                anomalies_created += 1
                print(f"✅ Created MISSING_GST anomaly for invoice: {invoice_number}")
            else:
                print(f"⏭️  Anomaly already exists for invoice: {invoice_number}")
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"📊 Total invoices scanned: {len(all_invoices)}")
    print(f"🟣 Invoices with missing GST: {missing_gst_count}")
    print(f"✅ New anomalies created: {anomalies_created}")
    print(f"⏭️  Anomalies already existed: {missing_gst_count - anomalies_created}")
    print("=" * 60)
    
    # Show anomaly breakdown
    print("\n📊 ANOMALY BREAKDOWN:")
    anomaly_types = db.anomalies.aggregate([
        {'$group': {
            '_id': '$anomalyType',
            'count': {'$sum': 1}
        }}
    ])
    
    for anomaly in anomaly_types:
        print(f"   {anomaly['_id']}: {anomaly['count']}")
    
    db.close()
    print("\n✅ Done! Refresh your dashboard to see updated anomaly trends.")

if __name__ == "__main__":
    fix_missing_gst_anomalies()
