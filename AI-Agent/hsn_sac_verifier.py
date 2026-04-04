"""
HSN/SAC Code Verification System for FINTEL AI
Uses FastGST TaxLookup API to verify HSN (goods) and SAC (services) codes
Integrated with invoice processing pipeline
"""

import requests
import json
from typing import Dict, List, Optional, Union


class HSNSACVerifier:
    """
    Unified HSN/SAC verification system
    Automatically detects and verifies both HSN codes (goods) and SAC codes (services)
    """
    
    def __init__(self):
        """Initialize with FastGST API credentials"""
        self.api_base_url = "https://api.taxlookup.fastgst.in"
        self.api_key = "fgst_act-8ed1htad-me8z8dem-63s5_vooo_6001b1927cfdbafa115d9a4fbdf9aef0"
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    def detect_code_type(self, code: str) -> str:
        """
        Detect if code is HSN or SAC
        
        Args:
            code: The code to check
            
        Returns:
            'HSN', 'SAC', or 'UNKNOWN'
        """
        clean_code = ''.join(filter(str.isdigit, str(code)))
        
        # SAC codes are typically 6 digits starting with 99
        if len(clean_code) == 6 and clean_code.startswith('99'):
            return 'SAC'
        
        # HSN codes are 4, 6, or 8 digits (not starting with 99)
        if len(clean_code) in [4, 6, 8]:
            return 'HSN'
        
        return 'UNKNOWN'
    
    def verify_hsn_code(self, hsn_code: str) -> Dict:
        """
        Verify HSN code and get GST rates
        
        Args:
            hsn_code: HSN code to verify
            
        Returns:
            Dictionary with verification results
        """
        clean_code = ''.join(filter(str.isdigit, str(hsn_code)))
        
        if not clean_code or len(clean_code) < 4:
            return {
                'success': False,
                'code': hsn_code,
                'error': 'Invalid HSN code. Must be at least 4 digits.'
            }
        
        try:
            print(f"🔍 Fetching HSN data: {clean_code}")
            
            url = f"{self.api_base_url}/search/hsn/{clean_code}/taxes"
            response = requests.get(url, headers=self.headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                api_data = data.get('data', data)
                gst_breakdown = api_data.get('gst_breakdown', {})
                
                return {
                    'success': True,
                    'is_valid': True,
                    'code': clean_code,
                    'code_type': 'HSN',
                    'is_goods': True,
                    'is_service': False,
                    'description': api_data.get('description', 'N/A'),
                    'gst_rates': {
                        'cgst': float(gst_breakdown.get('cgst', 0)),
                        'sgst': float(gst_breakdown.get('sgst', 0)),
                        'igst': float(gst_breakdown.get('igst', 0)),
                        'cess': float(api_data.get('cess', 0)),
                        'total': float(api_data.get('gst_rate', gst_breakdown.get('igst', 0)))
                    },
                    'category': api_data.get('broad_categeory', ''),
                    'is_exempted': api_data.get('is_exempted', False),
                    'exemption_status': api_data.get('exemption_status', ''),
                    'last_updated': api_data.get('last_updated', None),
                    'source': 'FastGST TaxLookup API'
                }
            elif response.status_code == 404:
                return {
                    'success': False,
                    'is_valid': False,
                    'code': hsn_code,
                    'error': 'HSN code not found in GST database'
                }
            else:
                return {
                    'success': False,
                    'is_valid': False,
                    'code': hsn_code,
                    'error': f'API error: Status {response.status_code}'
                }
                
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'is_valid': False,
                'code': hsn_code,
                'error': f'Request failed: {str(e)}'
            }
    
    def verify_sac_code(self, sac_code: str) -> Dict:
        """
        Verify SAC code and get GST rates
        
        Args:
            sac_code: SAC code to verify
            
        Returns:
            Dictionary with verification results
        """
        clean_code = ''.join(filter(str.isdigit, str(sac_code)))
        
        if not clean_code or len(clean_code) < 4:
            return {
                'success': False,
                'code': sac_code,
                'error': 'Invalid SAC code. Must be at least 4 digits.'
            }
        
        try:
            print(f"🔍 Fetching SAC data: {clean_code}")
            
            url = f"{self.api_base_url}/search/sac/{clean_code}/taxes"
            response = requests.get(url, headers=self.headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                api_data = data.get('data', data)
                gst_breakdown = api_data.get('gst_breakdown', {})
                
                return {
                    'success': True,
                    'is_valid': True,
                    'code': clean_code,
                    'code_type': 'SAC',
                    'is_goods': False,
                    'is_service': True,
                    'description': api_data.get('description', 'N/A'),
                    'gst_rates': {
                        'cgst': float(gst_breakdown.get('cgst', 0)),
                        'sgst': float(gst_breakdown.get('sgst', 0)),
                        'igst': float(gst_breakdown.get('igst', 0)),
                        'cess': float(api_data.get('cess', 0)),
                        'total': float(api_data.get('gst_rate', gst_breakdown.get('igst', 0)))
                    },
                    'category': api_data.get('broad_categeory', ''),
                    'is_exempted': api_data.get('is_exempted', False),
                    'exemption_status': api_data.get('exemption_status', ''),
                    'last_updated': api_data.get('last_updated', None),
                    'source': 'FastGST TaxLookup API'
                }
            elif response.status_code == 404:
                return {
                    'success': False,
                    'is_valid': False,
                    'code': sac_code,
                    'error': 'SAC code not found in GST database'
                }
            else:
                return {
                    'success': False,
                    'is_valid': False,
                    'code': sac_code,
                    'error': f'API error: Status {response.status_code}'
                }
                
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'is_valid': False,
                'code': sac_code,
                'error': f'Request failed: {str(e)}'
            }
    
    def verify_code(self, code: str) -> Dict:
        """
        Automatically detect and verify any code (HSN or SAC)
        
        Args:
            code: HSN or SAC code
            
        Returns:
            Dictionary with verification results
        """
        code_type = self.detect_code_type(code)
        
        print(f"🔍 Detected code type: {code_type} for code: {code}")
        
        if code_type == 'SAC':
            return self.verify_sac_code(code)
        elif code_type == 'HSN':
            return self.verify_hsn_code(code)
        else:
            # Try both if uncertain
            print("⚠️ Code type uncertain, trying HSN first...")
            hsn_result = self.verify_hsn_code(code)
            if hsn_result['success']:
                return hsn_result
            
            print("⚠️ HSN failed, trying SAC...")
            sac_result = self.verify_sac_code(code)
            if sac_result['success']:
                return sac_result
            
            return {
                'success': False,
                'is_valid': False,
                'code': code,
                'code_type': 'UNKNOWN',
                'error': 'Code not found in HSN or SAC database'
            }
    
    def compare_rate(self, code: str, extracted_rate: float) -> Dict:
        """
        Compare extracted rate with actual rate from API
        
        Args:
            code: HSN or SAC code
            extracted_rate: Rate extracted from invoice
            
        Returns:
            Dictionary with comparison results
        """
        verification = self.verify_code(code)
        
        if not verification['success']:
            return {
                'match': False,
                'code': code,
                'extracted_rate': f"{extracted_rate}%",
                'actual_rate': 'Not found',
                'error': verification.get('error', 'Unknown error')
            }
        
        actual_rate = verification['gst_rates']['total']
        match = abs(float(extracted_rate) - float(actual_rate)) < 0.5
        
        return {
            'match': match,
            'code': code,
            'code_type': verification['code_type'],
            'extracted_rate': f"{extracted_rate}%",
            'actual_rate': f"{actual_rate}%",
            'description': verification['description'],
            'breakdown': {
                'cgst': f"{verification['gst_rates']['cgst']}%",
                'sgst': f"{verification['gst_rates']['sgst']}%",
                'igst': f"{verification['gst_rates']['igst']}%",
                'cess': f"{verification['gst_rates']['cess']}%" if verification['gst_rates']['cess'] > 0 else 'N/A'
            },
            'discrepancy': None if match else {
                'message': f"⚠️ Rate mismatch: Expected {actual_rate}%, but found {extracted_rate}%",
                'difference': abs(float(extracted_rate) - float(actual_rate)),
                'severity': 'HIGH' if abs(float(extracted_rate) - float(actual_rate)) > 5 else 'LOW'
            }
        }
    
    def verify_invoice_codes(self, hsn_codes: List[str]) -> Dict:
        """
        Verify all HSN/SAC codes from an invoice
        
        Args:
            hsn_codes: List of HSN/SAC codes extracted from invoice
            
        Returns:
            Dictionary with verification results
        """
        results = []
        valid_count = 0
        invalid_count = 0
        
        for code in hsn_codes:
            if not code or code == 'Unknown':
                continue
                
            verification = self.verify_code(code)
            results.append(verification)
            
            if verification.get('is_valid'):
                valid_count += 1
            else:
                invalid_count += 1
        
        return {
            'total_codes': len(hsn_codes),
            'verified_codes': len(results),
            'valid_codes': valid_count,
            'invalid_codes': invalid_count,
            'all_valid': invalid_count == 0,
            'verifications': results
        }
    
    def verify_with_line_items(self, line_items: List[Dict]) -> Dict:
        """
        Verify HSN/SAC codes from line items and match GST rates
        
        Args:
            line_items: List of line items with HSN codes and amounts
            
        Returns:
            Dictionary with verification and rate matching results
        """
        results = []
        rate_mismatches = []
        
        for item in line_items:
            hsn_code = item.get('hsn_code') or item.get('hsn_sac_code')
            if not hsn_code or hsn_code == 'Unknown':
                continue
            
            # Verify the code
            verification = self.verify_code(hsn_code)
            
            # Check if extracted GST rate matches
            extracted_rate = item.get('gst_rate') or item.get('tax_rate')
            if extracted_rate and verification.get('is_valid'):
                actual_rate = verification['gst_rates']['total']
                rate_match = abs(float(extracted_rate) - float(actual_rate)) < 0.5
                
                verification['rate_comparison'] = {
                    'extracted_rate': float(extracted_rate),
                    'actual_rate': float(actual_rate),
                    'match': rate_match,
                    'difference': abs(float(extracted_rate) - float(actual_rate))
                }
                
                if not rate_match:
                    rate_mismatches.append({
                        'item': item.get('description', 'Unknown'),
                        'hsn_code': hsn_code,
                        'extracted_rate': extracted_rate,
                        'actual_rate': actual_rate,
                        'difference': abs(float(extracted_rate) - float(actual_rate))
                    })
            
            verification['item_description'] = item.get('description', 'Unknown')
            verification['item_amount'] = item.get('amount', 0)
            results.append(verification)
        
        return {
            'total_items': len(line_items),
            'verified_items': len(results),
            'valid_codes': sum(1 for v in results if v.get('is_valid')),
            'invalid_codes': sum(1 for v in results if not v.get('is_valid')),
            'rate_mismatches': rate_mismatches,
            'rate_mismatch_count': len(rate_mismatches),
            'all_rates_match': len(rate_mismatches) == 0,
            'verifications': results
        }


# Initialize global verifier instance
hsn_sac_verifier = HSNSACVerifier()


# Example usage
if __name__ == "__main__":
    verifier = HSNSACVerifier()
    
    print("=" * 70)
    print("🧪 HSN/SAC Verification System - FINTEL AI")
    print("=" * 70)
    
    # Test HSN code
    print("\n📋 Test 1: Verify HSN Code (Mobile Phone)\n")
    result = verifier.verify_code('8517')
    if result['success']:
        print(f"✅ Valid HSN Code: {result['code']}")
        print(f"   Description: {result['description']}")
        print(f"   GST Rate: {result['gst_rates']['total']}%")
        print(f"   Type: {'Goods' if result['is_goods'] else 'Services'}")
    else:
        print(f"❌ Invalid: {result['error']}")
    
    # Test SAC code
    print("\n📋 Test 2: Verify SAC Code (Consulting Service)\n")
    result = verifier.verify_code('998311')
    if result['success']:
        print(f"✅ Valid SAC Code: {result['code']}")
        print(f"   Description: {result['description']}")
        print(f"   GST Rate: {result['gst_rates']['total']}%")
        print(f"   Type: {'Goods' if result['is_goods'] else 'Services'}")
    else:
        print(f"❌ Invalid: {result['error']}")
    
    print("\n" + "=" * 70)
    print("✅ HSN/SAC Verifier Ready for Integration!")
    print("=" * 70)
