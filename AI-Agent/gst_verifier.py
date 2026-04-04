"""
GST Verification using GSTIN Check API
Real-time GST validation with Government data
API: https://sheet.gstincheck.co.in/check/{API_KEY}/{GSTIN}
"""

import requests
from typing import Dict, Optional
import re

class GSTVerifier:
    def __init__(self):
        # Circular queue of API keys for rate limit failover
        self.api_keys = [
            "fe832c00bc8be1690eeba69f78506316",
            "3080f8c4f23eaa7c1f20d9c12c97f882",
            "2fb55fbd8bbd3865c7be9f1e5bd9368c",
            "0d68fb5c57ff8a9aebec8a22dd1f71aa"
        ]
        self.current_key_index = 0
        self.base_url = "https://sheet.gstincheck.co.in/check"
        print(f"🔑 GST Verifier initialized with {len(self.api_keys)} API keys (circular failover)")
    
    def _get_current_key(self):
        """Get current API key"""
        return self.api_keys[self.current_key_index]
    
    def _rotate_key(self):
        """Rotate to next API key in circular queue"""
        old_index = self.current_key_index
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        print(f"🔄 Rotating API key: #{old_index + 1} → #{self.current_key_index + 1}")
    
    def clean_gst_number(self, gst_number: str) -> Optional[str]:
        """
        Clean and extract valid 15-character GST from potentially malformed input
        Returns None if no valid GST found
        """
        if not gst_number:
            return None
        
        # Remove spaces and convert to uppercase
        cleaned = gst_number.replace(" ", "").upper()
        
        # If already 15 chars, return as is
        if len(cleaned) == 15:
            return cleaned
        
        # If longer than 15, try to extract valid 15-char GST
        if len(cleaned) > 15:
            # Try to find 15-char pattern in the string
            gst_pattern = r'[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}'
            match = re.search(gst_pattern, cleaned)
            if match:
                extracted = match.group()
                print(f"✅ Extracted valid GST: {extracted} from {gst_number}")
                return extracted
            else:
                print(f"❌ Could not extract valid GST from: {gst_number}")
                return None
        
        # If shorter than 15, invalid
        print(f"❌ GST too short: {gst_number} ({len(cleaned)} chars)")
        return None
        
    def validate_gst_format(self, gst_number: str) -> bool:
        """Validate GST number format (MUST be EXACTLY 15 characters)"""
        if not gst_number:
            return False
        
        # Remove spaces and convert to uppercase
        gst_number = gst_number.replace(" ", "").upper()
        
        # CRITICAL: GST MUST be EXACTLY 15 characters
        if len(gst_number) != 15:
            print(f"❌ GST Length Error: {gst_number} has {len(gst_number)} chars (must be 15)")
            return False
        
        # GST format: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
        gst_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$'
        
        is_valid = bool(re.match(gst_pattern, gst_number))
        
        if not is_valid:
            print(f"❌ GST Format Error: {gst_number} doesn't match pattern")
        
        return is_valid
    
    def verify_gst(self, gst_number: str) -> Dict:
        """
        Verify GST number with GSTIN Check API
        Returns detailed GST information
        """
        # Clean and extract valid GST number
        cleaned_gst = self.clean_gst_number(gst_number)
        
        if not cleaned_gst:
            return {
                "success": False,
                "error": f"Invalid GST: '{gst_number}' - Must be exactly 15 characters",
                "gst_number": gst_number,
                "is_valid": False,
                "length": len(gst_number.replace(" ", ""))
            }
        
        # Validate format
        if not self.validate_gst_format(cleaned_gst):
            return {
                "success": False,
                "error": f"Invalid GST format: {cleaned_gst}",
                "gst_number": cleaned_gst,
                "is_valid": False
            }
        
        # Use cleaned GST for API call
        gst_number = cleaned_gst
        
        # Try all API keys in circular queue
        attempts = len(self.api_keys)
        last_error = None
        
        for attempt in range(attempts):
            current_key = self._get_current_key()
            key_num = self.current_key_index + 1
            
            try:
                # Call GSTIN Check API
                url = f"{self.base_url}/{current_key}/{gst_number}"
                
                response = requests.get(url, timeout=15)
                
                # Debug logging
                print(f"🔍 GST API [Key #{key_num}] Response for {gst_number}:")
                print(f"   Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("flag"):
                        gst_data = data.get("data", {})
                        
                        # Extract address
                        pradr = gst_data.get("pradr", {})
                        address = pradr.get("adr", "") if isinstance(pradr, dict) else ""
                        
                        # Extract pincode from address
                        addr_details = pradr.get("addr", {}) if isinstance(pradr, dict) else {}
                        pincode = addr_details.get("pncd", "") if isinstance(addr_details, dict) else ""
                        
                        return {
                            "success": True,
                            "is_valid": True,
                            "gst_number": gst_number,
                            "status": gst_data.get("sts", "Unknown"),
                            "is_active": gst_data.get("sts") == "Active",
                            "legal_name": gst_data.get("lgnm", "").strip(),
                            "trade_name": gst_data.get("tradeNam", "").strip(),
                            "pan": gst_number[2:12],
                            "address": address,
                            "pincode": pincode,
                            "business_type": gst_data.get("ctb", ""),
                            "registration_date": gst_data.get("rgdt", ""),
                            "dealer_type": gst_data.get("dty", ""),
                            "einvoice_status": gst_data.get("einvoiceStatus", ""),
                            "nature_of_business": gst_data.get("nba", []),
                            "verification_date": None,
                            "api_key_used": key_num
                        }
                    else:
                        error_msg = data.get("message", "GST not found")
                        print(f"   ❌ API returned flag=False: {error_msg}")
                        
                        # Check if it's a credit/quota error — rotate key
                        if "credit" in error_msg.lower() or "limit" in error_msg.lower() or "quota" in error_msg.lower():
                            print(f"   ⚠️ Key #{key_num} credits exhausted! Rotating...")
                            self._rotate_key()
                            last_error = error_msg
                            continue  # Try next key
                        
                        # Actual GST not found — return error
                        return {
                            "success": False,
                            "is_valid": False,
                            "error": error_msg,
                            "gst_number": gst_number
                        }
                
                elif response.status_code == 404:
                    print(f"   ❌ 404 - GST not found")
                    return {
                        "success": False,
                        "is_valid": False,
                        "error": "GST number not found",
                        "gst_number": gst_number
                    }
                
                elif response.status_code == 429:
                    print(f"   ⚠️ Key #{key_num} rate limited! Rotating...")
                    self._rotate_key()
                    last_error = "Rate limit exceeded on all API keys"
                    continue  # Try next key
                
                else:
                    print(f"   ⚠️ Key #{key_num} error {response.status_code}, rotating...")
                    self._rotate_key()
                    last_error = f"API error: {response.status_code}"
                    continue  # Try next key
                    
            except requests.Timeout:
                print(f"   ⚠️ Key #{key_num} timed out, rotating...")
                self._rotate_key()
                last_error = "All API keys timed out"
                continue  # Try next key
            except Exception as e:
                print(f"   ⚠️ Key #{key_num} failed: {e}, rotating...")
                self._rotate_key()
                last_error = f"Verification failed: {str(e)}"
                continue  # Try next key
        
        # All keys exhausted
        print(f"❌ All {attempts} API keys failed for {gst_number}")
        return {
            "success": False,
            "is_valid": None,
            "error": last_error or "All API keys exhausted",
            "gst_number": gst_number
        }
    
    def check_vendor_name_match(self, gst_data: Dict, vendor_name: str) -> Dict:
        """
        Check if vendor name matches GST registered name
        """
        if not gst_data.get("success"):
            return {"match": False, "reason": "GST verification failed"}
        
        legal_name = gst_data.get("legal_name", "").lower()
        trade_name = gst_data.get("trade_name", "").lower()
        vendor_name_lower = vendor_name.lower()
        
        # Check if vendor name is in legal or trade name
        if vendor_name_lower in legal_name or legal_name in vendor_name_lower:
            return {"match": True, "matched_with": "legal_name"}
        
        if vendor_name_lower in trade_name or trade_name in vendor_name_lower:
            return {"match": True, "matched_with": "trade_name"}
        
        # Partial match (at least 50% words match)
        vendor_words = set(vendor_name_lower.split())
        legal_words = set(legal_name.split())
        
        if len(vendor_words) > 0:
            match_ratio = len(vendor_words & legal_words) / len(vendor_words)
            if match_ratio >= 0.5:
                return {"match": True, "matched_with": "partial_match", "ratio": match_ratio}
        
        return {
            "match": False,
            "reason": f"Vendor name '{vendor_name}' doesn't match GST name '{legal_name}'"
        }

# Create global instance
gst_verifier = GSTVerifier()

if __name__ == "__main__":
    # Test
    import json
    print("Testing GSTIN Check API...")
    result = gst_verifier.verify_gst("24AAACI0931P1ZL")
    print("GST Verification Result:")
    print(json.dumps(result, indent=2))
