"""
MongoDB Database Module for FINTEL AI
Handles invoice storage, vendor tracking, and anomaly detection
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime
from typing import Dict, List, Optional, Any
import json
from bson import ObjectId

class FintelDatabase:
    def __init__(self, connection_string="mongodb://localhost:27017/"):
        """Initialize MongoDB connection"""
        self.client = MongoClient(connection_string)
        self.db = self.client['fintel_ai']
        
        # Collections
        self.invoices = self.db['invoices']
        self.vendors = self.db['vendors']
        self.anomalies = self.db['anomalies']
        
        # Create indexes for faster queries
        self._create_indexes()
        
        print("✅ MongoDB connected successfully!")
        print(f"   Database: fintel_ai")
        print(f"   Collections: invoices, vendors, anomalies")
    
    def _create_indexes(self):
        """Create indexes for optimized queries"""
        # Invoice indexes
        self.invoices.create_index([("invoiceNumber", ASCENDING)], unique=False)
        self.invoices.create_index([("gstNumber", ASCENDING)])
        self.invoices.create_index([("vendorName", ASCENDING)])
        self.invoices.create_index([("uploadDate", DESCENDING)])
        
        # Vendor indexes
        self.vendors.create_index([("gstNumber", ASCENDING)], unique=True)
        self.vendors.create_index([("vendorName", ASCENDING)])
        
        # Anomaly indexes
        self.anomalies.create_index([("invoiceId", ASCENDING)])
        self.anomalies.create_index([("anomalyType", ASCENDING)])
        self.anomalies.create_index([("severity", ASCENDING)])
    
    def store_invoice(self, invoice_data: Dict[str, Any]) -> str:
        """
        Store invoice in database
        Returns: invoice_id
        """
        invoice_doc = {
            'filename': invoice_data.get('filename'),
            'uploadDate': datetime.now(),
            'invoiceNumber': invoice_data.get('invoice_number'),
            'vendorName': invoice_data.get('vendor_name'),
            'gstNumber': invoice_data.get('gst_numbers', [])[0] if invoice_data.get('gst_numbers') else None,
            'allGstNumbers': invoice_data.get('gst_numbers', []),
            'totalAmount': float(invoice_data.get('total_amount', 0)),
            'invoiceDate': invoice_data.get('invoice_date'),
            'gstRate': invoice_data.get('gst_rate', 'Unknown'),
            'hsnNumber': invoice_data.get('hsn_number', 'Unknown'),
            'hsnCodes': invoice_data.get('hsn_sac_codes', []),
            'itemDescriptions': invoice_data.get('item_descriptions', []),
            'quantities': invoice_data.get('quantities', []),
            'ocrConfidence': float(invoice_data.get('ocr_confidence', 0)),
            'complianceResults': invoice_data.get('compliance_results', {}),
            'gstVerification': invoice_data.get('gst_verification', []),
            'mlPrediction': invoice_data.get('ml_prediction', {}),
            'rawText': invoice_data.get('raw_text', '')[:1000]  # Store first 1000 chars
        }
        
        result = self.invoices.insert_one(invoice_doc)
        invoice_id = str(result.inserted_id)
        
        # Update vendor statistics
        self._update_vendor_stats(invoice_doc)
        
        print(f"✅ Invoice stored: {invoice_doc['invoiceNumber']} (ID: {invoice_id})")
        return invoice_id
    
    def _update_vendor_stats(self, invoice_doc: Dict):
        """Update or create vendor statistics"""
        gst_number = invoice_doc.get('gstNumber')
        vendor_name = invoice_doc.get('vendorName')
        
        if not gst_number or gst_number == 'Unknown':
            return
        
        vendor = self.vendors.find_one({'gstNumber': gst_number})
        
        if vendor:
            # Update existing vendor
            self.vendors.update_one(
                {'gstNumber': gst_number},
                {
                    '$inc': {
                        'totalInvoices': 1,
                        'totalAmount': invoice_doc.get('totalAmount', 0)
                    },
                    '$set': {
                        'lastInvoiceDate': datetime.now(),
                        'vendorName': vendor_name  # Update in case name changed
                    }
                }
            )
        else:
            # Create new vendor
            self.vendors.insert_one({
                'gstNumber': gst_number,
                'vendorName': vendor_name,
                'totalInvoices': 1,
                'totalAmount': invoice_doc.get('totalAmount', 0),
                'firstInvoiceDate': datetime.now(),
                'lastInvoiceDate': datetime.now()
            })
    
    def detect_anomalies(self, invoice_data: Dict[str, Any], invoice_id: str) -> List[Dict]:
        """
        Detect anomalies by comparing with historical data
        Returns: List of detected anomalies
        """
        from bson import ObjectId
        anomalies = []
        
        # Convert invoice_id to ObjectId for comparison
        try:
            obj_id = ObjectId(invoice_id)
        except:
            obj_id = invoice_id
        
        # 1. Check for duplicate invoice number
        duplicate = self.invoices.find_one({
            'invoiceNumber': invoice_data.get('invoice_number'),
            '_id': {'$ne': obj_id}
        })
        if duplicate:
            anomalies.append({
                'type': 'DUPLICATE_INVOICE',
                'severity': 'HIGH',
                'description': f"Duplicate invoice number: {invoice_data.get('invoice_number')}",
                'relatedInvoiceId': str(duplicate['_id'])
            })
        
        # 2. Check for missing GST number (No GST found in invoice)
        gst_numbers = invoice_data.get('gst_numbers', [])
        gst_missing = invoice_data.get('gst_missing', False)
        
        if not gst_numbers or len(gst_numbers) == 0 or gst_missing:
            anomalies.append({
                'type': 'MISSING_GST',
                'severity': 'HIGH',
                'description': f"No GST number found in invoice - Vendor: {invoice_data.get('vendor_name', 'Unknown')}",
            })
        
        # 3. Check for invalid GST number (GST found but invalid format/verification failed)
        gst_number = gst_numbers[0] if gst_numbers else None
        if gst_number:
            # Check if GST verification failed
            gst_verification = invoice_data.get('gst_verification', [])
            if gst_verification and len(gst_verification) > 0:
                verification_result = gst_verification[0]
                if not verification_result.get('success') or not verification_result.get('is_active'):
                    anomalies.append({
                        'type': 'INVALID_GST',
                        'severity': 'HIGH',
                        'description': f"Invalid GST number: {gst_number} - Verification failed",
                    })
        
        # 4. Check for GST number with different vendor name
        if gst_number:
            different_vendor = self.invoices.find_one({
                'gstNumber': gst_number,
                'vendorName': {'$ne': invoice_data.get('vendor_name')},
                '_id': {'$ne': obj_id}
            })
            if different_vendor:
                anomalies.append({
                    'type': 'GST_VENDOR_MISMATCH',
                    'severity': 'HIGH',
                    'description': f"GST {gst_number} used by different vendor: {different_vendor['vendorName']} vs {invoice_data.get('vendor_name')}",
                    'relatedInvoiceId': str(different_vendor['_id'])
                })
        
        # 4. Check for unusual amount from same vendor
        vendor_name = invoice_data.get('vendor_name')
        if vendor_name and vendor_name != 'Unknown':
            # Get average amount for this vendor
            pipeline = [
                {'$match': {'vendorName': vendor_name}},
                {'$group': {
                    '_id': None,
                    'avgAmount': {'$avg': '$totalAmount'},
                    'maxAmount': {'$max': '$totalAmount'},
                    'minAmount': {'$min': '$totalAmount'}
                }}
            ]
            stats = list(self.vendors_stats(vendor_name))
            if stats:
                avg_amount = stats[0].get('avgAmount', 0)
                current_amount = float(invoice_data.get('total_amount', 0))
                
                # If amount is 3x more than average
                if avg_amount > 0 and current_amount > (avg_amount * 3):
                    anomalies.append({
                        'type': 'UNUSUAL_AMOUNT',
                        'severity': 'MEDIUM',
                        'description': f"Amount ₹{current_amount} is 3x higher than vendor average ₹{avg_amount:.2f}"
                    })
        
        # 5. Check for invalid HSN/SAC codes
        hsn_sac_verification = invoice_data.get('hsn_sac_verification', [])
        if hsn_sac_verification:
            invalid_codes = [v for v in hsn_sac_verification if not v.get('is_valid')]
            if invalid_codes:
                for invalid in invalid_codes:
                    anomalies.append({
                        'type': 'INVALID_HSN_SAC',
                        'severity': 'HIGH',
                        'description': f"Invalid HSN/SAC code: {invalid.get('code')} - {invalid.get('error', 'Not found in GST database')}"
                    })
        
        # 5b. Check for GST rate mismatches in line items
        line_items_verification = invoice_data.get('hsn_sac_line_items_verification')
        if line_items_verification and line_items_verification.get('rate_mismatches'):
            for mismatch in line_items_verification['rate_mismatches']:
                anomalies.append({
                    'type': 'HSN_GST_RATE_MISMATCH',
                    'severity': 'HIGH',
                    'description': f"GST rate mismatch for {mismatch['item']}: HSN {mismatch['hsn_code']} should have {mismatch['actual_rate']}% but invoice shows {mismatch['extracted_rate']}%"
                })
        
        # 6. Check for same HSN code with very different price
        hsn_codes = invoice_data.get('hsn_sac_codes', [])
        if hsn_codes:
            for hsn in hsn_codes[:3]:  # Check first 3 HSN codes
                similar_invoices = list(self.invoices.find({
                    'hsnCodes': hsn,
                    '_id': {'$ne': invoice_id}
                }).limit(10))
                
                if len(similar_invoices) >= 3:
                    amounts = [inv['totalAmount'] for inv in similar_invoices if inv.get('totalAmount', 0) > 0]
                    if amounts:
                        avg_hsn_amount = sum(amounts) / len(amounts)
                        current_amount = float(invoice_data.get('total_amount', 0))
                        
                        # If amount differs by more than 50%
                        if avg_hsn_amount > 0 and abs(current_amount - avg_hsn_amount) > (avg_hsn_amount * 0.5):
                            anomalies.append({
                                'type': 'HSN_PRICE_DEVIATION',
                                'severity': 'MEDIUM',
                                'description': f"HSN {hsn}: Amount ₹{current_amount} deviates significantly from historical average ₹{avg_hsn_amount:.2f}"
                            })
                            break  # Only report once
        
        # Store anomalies in database
        for anomaly in anomalies:
            self.anomalies.insert_one({
                'invoiceId': invoice_id,
                'invoiceNumber': invoice_data.get('invoice_number'),
                'anomalyType': anomaly['type'],
                'severity': anomaly['severity'],
                'description': anomaly['description'],
                'detectedDate': datetime.now(),
                'relatedInvoiceId': anomaly.get('relatedInvoiceId')
            })
        
        return anomalies
    
    def vendors_stats(self, vendor_name: str) -> List[Dict]:
        """Get statistics for a vendor"""
        pipeline = [
            {'$match': {'vendorName': vendor_name}},
            {'$group': {
                '_id': None,
                'avgAmount': {'$avg': '$totalAmount'},
                'maxAmount': {'$max': '$totalAmount'},
                'minAmount': {'$min': '$totalAmount'},
                'totalInvoices': {'$sum': 1}
            }}
        ]
        return list(self.invoices.aggregate(pipeline))
    
    def get_invoice_history(self, limit: int = 50) -> List[Dict]:
        """Get recent invoice history with anomalies"""
        invoices = list(self.invoices.find().sort('uploadDate', DESCENDING).limit(limit))
        
        # Convert ObjectId to string and attach anomalies
        for inv in invoices:
            invoice_id = inv['_id']
            invoice_id_str = str(inv['_id'])
            inv['_id'] = invoice_id_str
            inv['uploadDate'] = inv['uploadDate'].isoformat() if inv.get('uploadDate') else None
            
            # Fetch anomalies for this invoice (search both ObjectId and string)
            anomalies = list(self.anomalies.find({'$or': [
                {'invoiceId': invoice_id},
                {'invoiceId': invoice_id_str}
            ]}))
            for anomaly in anomalies:
                anomaly['_id'] = str(anomaly['_id'])
                if anomaly.get('detectedDate'):
                    anomaly['detectedDate'] = anomaly['detectedDate'].isoformat()
            inv['anomalies'] = anomalies
        
        return invoices
    
    def get_vendor_list(self) -> List[Dict]:
        """Get list of all vendors"""
        vendors = list(self.vendors.find().sort('totalAmount', DESCENDING))
        
        for vendor in vendors:
            vendor['_id'] = str(vendor['_id'])
            vendor['firstInvoiceDate'] = vendor['firstInvoiceDate'].isoformat() if vendor.get('firstInvoiceDate') else None
            vendor['lastInvoiceDate'] = vendor['lastInvoiceDate'].isoformat() if vendor.get('lastInvoiceDate') else None
        
        return vendors
    
    def get_anomalies(self, severity: Optional[str] = None, limit: int = 500) -> List[Dict]:
        """Get detected anomalies with vendor information"""
        query = {}
        if severity:
            query['severity'] = severity
        
        anomalies = list(self.anomalies.find(query).sort('detectedDate', DESCENDING).limit(limit))
        
        for anomaly in anomalies:
            anomaly['_id'] = str(anomaly['_id'])
            anomaly['detectedDate'] = anomaly['detectedDate'].isoformat() if anomaly.get('detectedDate') else None
            
            # Fetch vendor name from invoice
            if anomaly.get('invoiceId'):
                inv_id = anomaly['invoiceId']
                # Try both string and ObjectId lookup
                try:
                    obj_id = ObjectId(inv_id)
                except:
                    obj_id = inv_id
                invoice = self.invoices.find_one({'$or': [{'_id': obj_id}, {'_id': inv_id}]})
                if invoice:
                    anomaly['vendor_name'] = invoice.get('vendorName', 'Unknown')
                    anomaly['invoice_number'] = invoice.get('invoiceNumber', anomaly.get('invoiceNumber', 'N/A'))
                    anomaly['amount'] = invoice.get('totalAmount', invoice.get('total_amount', 0))
                    anomaly['invoiceDate'] = invoice.get('invoiceDate', invoice.get('invoice_date', ''))
                else:
                    anomaly['vendor_name'] = 'Unknown'
                    anomaly['amount'] = 0
            else:
                anomaly['vendor_name'] = 'Unknown'
                anomaly['amount'] = 0
        
        return anomalies
    
    def get_dashboard_stats(self) -> Dict:
        """Get statistics for dashboard"""
        total_invoices = self.invoices.count_documents({})
        total_vendors = self.vendors.count_documents({})
        total_anomalies = self.anomalies.count_documents({})
        high_severity_anomalies = self.anomalies.count_documents({'severity': 'HIGH'})
        
        # Total amount processed
        pipeline = [
            {'$group': {
                '_id': None,
                'totalAmount': {'$sum': '$totalAmount'}
            }}
        ]
        amount_result = list(self.invoices.aggregate(pipeline))
        total_amount = amount_result[0]['totalAmount'] if amount_result else 0
        
        return {
            'totalInvoices': total_invoices,
            'totalVendors': total_vendors,
            'totalAnomalies': total_anomalies,
            'highSeverityAnomalies': high_severity_anomalies,
            'totalAmountProcessed': total_amount
        }
    
    def get_anomaly_trends(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get anomaly trends for the last N days
        Returns daily counts of each anomaly type
        """
        from datetime import timedelta
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Aggregate anomalies by date and type
        pipeline = [
            {
                '$match': {
                    'detectedDate': {'$gte': start_date, '$lte': end_date}
                }
            },
            {
                '$group': {
                    '_id': {
                        'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$detectedDate'}},
                        'type': '$anomalyType'
                    },
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'_id.date': 1}
            }
        ]
        
        results = list(self.anomalies.aggregate(pipeline))
        
        # Organize data by date
        trends_by_date = {}
        for result in results:
            date = result['_id']['date']
            anomaly_type = result['_id']['type']
            count = result['count']
            
            if date not in trends_by_date:
                trends_by_date[date] = {
                    'date': date,
                    'duplicates': 0,
                    'invalidGst': 0,
                    'missingGst': 0,
                    'hsnAnomalies': 0,
                    'total': 0
                }
            
            # Map anomaly types to keys
            if anomaly_type == 'DUPLICATE_INVOICE':
                trends_by_date[date]['duplicates'] += count
            elif anomaly_type in ['INVALID_GST', 'GST_VENDOR_MISMATCH']:
                trends_by_date[date]['invalidGst'] += count
            elif anomaly_type == 'MISSING_GST':
                trends_by_date[date]['missingGst'] += count
            elif anomaly_type in ['INVALID_HSN_SAC', 'HSN_GST_RATE_MISMATCH', 'HSN_PRICE_DEVIATION', 'UNUSUAL_AMOUNT']:
                trends_by_date[date]['hsnAnomalies'] += count
            
            trends_by_date[date]['total'] += count
        
        # Fill in missing dates with zeros
        all_trends = []
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            if date_str in trends_by_date:
                all_trends.append(trends_by_date[date_str])
            else:
                all_trends.append({
                    'date': date_str,
                    'duplicates': 0,
                    'invalidGst': 0,
                    'missingGst': 0,
                    'hsnAnomalies': 0,
                    'total': 0
                })
            current_date += timedelta(days=1)
        
        return all_trends
    
    def close(self):
        """Close database connection"""
        self.client.close()
        print("MongoDB connection closed")


# Test connection
if __name__ == "__main__":
    db = FintelDatabase()
    print("\n📊 Database Stats:")
    stats = db.get_dashboard_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    db.close()
