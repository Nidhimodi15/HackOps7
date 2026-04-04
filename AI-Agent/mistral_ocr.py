"""
Mistral OCR Engine for FINTEL AI
Uses Mistral's OCR API to extract invoice data from PDFs
Two-step process: Upload file → Run OCR → Parse structured data
"""

import requests
import json
import re
import time
from pathlib import Path
from typing import Optional, Dict


class MistralOCR:
    def __init__(self, api_key="v58fKoQPEuLKUQYmxz5eizI2kdgCZBRD"):
        """Initialize Mistral OCR with API key"""
        print("🚀 Initializing Mistral OCR Engine...")
        self.api_key = api_key
        self.base_url = "https://api.mistral.ai/v1"
        self.headers_auth = {
            "Authorization": f"Bearer {self.api_key}"
        }
        self.headers_json = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        print("✅ Mistral OCR Engine initialized!")

    def upload_file(self, file_path: str) -> Optional[str]:
        """
        Step 1: Upload PDF file to Mistral for OCR processing
        Returns: file_id or None on failure
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                print(f"❌ File not found: {file_path}")
                return None

            print(f"📤 Uploading file to Mistral: {file_path.name}")

            url = f"{self.base_url}/files"

            with open(file_path, "rb") as f:
                files = {
                    "file": (file_path.name, f, "application/pdf"),
                }
                data = {
                    "purpose": "ocr"
                }

                response = requests.post(
                    url,
                    headers=self.headers_auth,
                    files=files,
                    data=data,
                    timeout=60
                )

            if response.status_code == 200:
                result = response.json()
                file_id = result.get("id")
                print(f"✅ File uploaded successfully! File ID: {file_id}")
                return file_id
            else:
                print(f"❌ File upload failed: {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return None

        except Exception as e:
            print(f"❌ File upload error: {e}")
            return None

    def run_ocr(self, file_id: str) -> Optional[Dict]:
        """
        Step 2: Run OCR on the uploaded file
        Returns: OCR result with extracted text or None on failure
        """
        try:
            print(f"🔍 Running Mistral OCR on file: {file_id}")

            url = f"{self.base_url}/ocr"

            payload = {
                "model": "mistral-ocr-latest",
                "document": {
                    "type": "file",
                    "file_id": file_id
                }
            }

            response = requests.post(
                url,
                headers=self.headers_json,
                json=payload,
                timeout=120
            )

            if response.status_code == 200:
                result = response.json()
                print(f"✅ OCR completed successfully!")

                # Extract text from all pages
                pages = result.get("pages", [])
                print(f"📄 Extracted text from {len(pages)} page(s)")

                return result
            else:
                print(f"❌ OCR failed: {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return None

        except Exception as e:
            print(f"❌ OCR error: {e}")
            return None

    def extract_all_text(self, ocr_result: Dict) -> str:
        """Extract all text from OCR result pages"""
        pages = ocr_result.get("pages", [])
        all_text = []

        for page in pages:
            markdown_text = page.get("markdown", "")
            if markdown_text:
                all_text.append(markdown_text)

        combined_text = "\n\n--- PAGE BREAK ---\n\n".join(all_text)
        return combined_text

    def parse_invoice_data(self, ocr_text: str) -> Optional[Dict]:
        """
        Parse the OCR-extracted text into structured invoice data
        Uses Mistral chat API to intelligently extract fields
        """
        try:
            print("🧠 Parsing invoice data with Mistral AI...")

            url = f"{self.base_url}/chat/completions"

            prompt = """You are an expert invoice data extraction AI. Analyze this OCR-extracted invoice text carefully and extract ALL the following information:

**CRITICAL INSTRUCTIONS:**
1. Extract data EXACTLY as it appears on the invoice
2. For dates, use DD-MM-YYYY or DD/MM/YYYY format
3. For amounts, extract only numbers (no currency symbols)
4. **GST NUMBERS - EXTREMELY IMPORTANT:**
   - **ONLY extract the VENDOR/SELLER/SUPPLIER GST number (the company issuing the invoice)**
   - **DO NOT extract the buyer/recipient/customer GST number**
   - Look for GST in the "Vendor Details", "Seller Details", "From", or top section of invoice
   - IGNORE GST in "Bill To", "Ship To", "Customer Details", or buyer section
   - GST MUST be EXACTLY 15 characters (no more, no less)
   - Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
   - Example: 24AAACI0931P1ZL (exactly 15 chars)
   - If you see a GST with extra characters, extract ONLY the valid 15-character portion
   - Double-check the length before adding to the list
   - Only include GST numbers that are EXACTLY 15 characters
5. If any field is not found, use "Unknown" for text fields and 0 for numeric fields

**EXTRACT THE FOLLOWING:**

1. **Invoice Number**: The invoice/bill number (look for: Invoice No, Bill No, Inv No, etc.)
2. **Vendor/Company Name**: The company/vendor issuing the invoice (usually at top in large text)
3. **Invoice Date**: The date of invoice (look for: Date, Invoice Date, Bill Date, etc.)
4. **Total Amount**: The final total amount payable (look for: Total, Grand Total, Amount Payable, Net Amount)
5. **GST Numbers**: ONLY the VENDOR/SELLER GST number (from vendor details section, NOT from buyer/customer section)
6. **GST Rate**: The TOTAL GST percentage applied
   - If CGST and SGST are separate, ADD them together (e.g., CGST 9% + SGST 9% = 18% total GST)
   - If IGST is given, use that directly
   - If only one GST rate is shown, use that
   - Examples: 
     * CGST 9% + SGST 9% → return "18%"
     * CGST 6% + SGST 6% → return "12%"
     * IGST 18% → return "18%"
7. **CGST Rate**: The CGST percentage if shown separately (e.g., 9%, 6%, 2.5%)
8. **SGST Rate**: The SGST percentage if shown separately (e.g., 9%, 6%, 2.5%)
9. **IGST Rate**: The IGST percentage if shown (e.g., 18%, 12%, 5%)
10. **HSN Number**: The primary HSN/SAC code (4-8 digit code, look for: HSN, SAC, HSN Code, SAC Code)
11. **Vendor Address**: Complete address of the vendor
12. **Line Items**: Extract all items/services with:
    - Item description
    - HSN/SAC code (if present)
    - Quantity
    - Rate/Price
    - Amount

**RETURN FORMAT:**
Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks, just pure JSON):

{
  "invoice_number": "extracted invoice number or Unknown",
  "vendor_name": "extracted vendor/company name or Unknown",
  "invoice_date": "DD-MM-YYYY or Unknown",
  "total_amount": 0.0,
  "gst_numbers": ["list of all vendor GST numbers found"],
  "gst_rate": "TOTAL GST percentage (CGST+SGST or IGST) e.g., 18%, 12%, 5% or Unknown",
  "cgst_rate": "CGST percentage if separate (e.g., 9%, 6%) or Unknown",
  "sgst_rate": "SGST percentage if separate (e.g., 9%, 6%) or Unknown",
  "igst_rate": "IGST percentage if applicable (e.g., 18%, 12%) or Unknown",
  "hsn_number": "primary HSN/SAC code or Unknown",
  "vendor_address": "complete address or Unknown",
  "line_items": [
    {
      "description": "item description",
      "hsn_code": "HSN/SAC code or empty",
      "quantity": 0,
      "rate": 0.0,
      "amount": 0.0
    }
  ],
  "hsn_codes": ["list of all HSN/SAC codes found"],
  "raw_extracted_text": "any other important text you see"
}

**IMPORTANT:**
- Be thorough and accurate
- Extract ALL GST numbers you find (VENDOR ONLY)
- Extract ALL HSN/SAC codes
- If you see multiple amounts, choose the FINAL TOTAL
- Return ONLY the JSON, nothing else"""

            payload = {
                "model": "mistral-small-latest",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert invoice data extraction AI. You always return valid JSON only, no markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": f"{prompt}\n\n--- INVOICE TEXT ---\n\n{ocr_text}"
                    }
                ],
                "temperature": 0.0,
                "max_tokens": 4096
            }

            response = requests.post(
                url,
                headers=self.headers_json,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")

                # Clean up response
                content = content.strip()
                if content.startswith("```json"):
                    content = content.replace("```json", "").replace("```", "").strip()
                elif content.startswith("```"):
                    content = content.replace("```", "").strip()

                # Parse JSON
                try:
                    extracted_data = json.loads(content)
                    print("✅ Successfully parsed structured invoice data")
                    return extracted_data
                except json.JSONDecodeError as e:
                    print(f"⚠️ JSON parse error: {e}")
                    print(f"   Response: {content[:500]}")
                    # Try to extract JSON from text
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        extracted_data = json.loads(json_match.group())
                        print("✅ Extracted JSON from response")
                        return extracted_data
                    return None
            else:
                print(f"❌ Chat API failed: {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return None

        except Exception as e:
            print(f"❌ Parse error: {e}")
            return None

    def process_invoice(self, file_path: str) -> Dict:
        """
        Main processing function - handles PDFs via Mistral OCR
        Returns structured invoice data (same format as gemini_vision_ocr)
        """
        print(f"\n{'='*60}")
        print(f"🔍 Processing Invoice: {Path(file_path).name}")
        print(f"{'='*60}")

        # Step 1: Upload file to Mistral
        file_id = self.upload_file(file_path)
        if not file_id:
            return {
                'success': False,
                'error': 'Failed to upload file to Mistral'
            }

        # Small delay to ensure file is processed
        time.sleep(1)

        # Step 2: Run OCR
        ocr_result = self.run_ocr(file_id)
        if not ocr_result:
            return {
                'success': False,
                'error': 'Mistral OCR processing failed'
            }

        # Extract all text from pages
        all_text = self.extract_all_text(ocr_result)
        page_count = len(ocr_result.get("pages", []))

        if not all_text.strip():
            return {
                'success': False,
                'error': 'No text extracted from document'
            }

        print(f"📝 Extracted {len(all_text)} characters from {page_count} page(s)")

        # Step 3: Parse into structured data using Mistral chat
        extracted_data = self.parse_invoice_data(all_text)

        if not extracted_data:
            return {
                'success': False,
                'error': 'Failed to parse invoice data from OCR text'
            }

        # Validate and clean GST numbers (MUST be exactly 15 characters)
        raw_gst_numbers = extracted_data.get('gst_numbers', [])
        valid_gst_numbers = []

        for gst in raw_gst_numbers:
            cleaned_gst = gst.replace(" ", "").upper()
            if len(cleaned_gst) == 15:
                valid_gst_numbers.append(cleaned_gst)
                print(f"✅ Valid GST: {cleaned_gst} (15 chars)")
            else:
                print(f"❌ Invalid GST: {gst} ({len(cleaned_gst)} chars) - REJECTED")

        # Calculate total GST rate from CGST+SGST if needed
        gst_rate = extracted_data.get('gst_rate', 'Unknown')
        cgst_rate = extracted_data.get('cgst_rate', 'Unknown')
        sgst_rate = extracted_data.get('sgst_rate', 'Unknown')
        igst_rate = extracted_data.get('igst_rate', 'Unknown')

        # If gst_rate is Unknown but CGST and SGST are available, calculate it
        if gst_rate == 'Unknown' and cgst_rate != 'Unknown' and sgst_rate != 'Unknown':
            try:
                cgst_val = float(cgst_rate.replace('%', '').strip())
                sgst_val = float(sgst_rate.replace('%', '').strip())
                total_gst = cgst_val + sgst_val
                gst_rate = f"{total_gst}%"
                print(f"✅ Calculated GST Rate: CGST {cgst_val}% + SGST {sgst_val}% = {total_gst}%")
            except:
                pass

        # Structure the response (same format as gemini_vision_ocr)
        structured_data = {
            'invoice_number': extracted_data.get('invoice_number', 'Unknown'),
            'vendor_name': extracted_data.get('vendor_name', 'Unknown'),
            'invoice_date': extracted_data.get('invoice_date', 'Unknown'),
            'total_amount': float(extracted_data.get('total_amount', 0)),
            'gst_numbers': valid_gst_numbers,
            'gst_rate': gst_rate,
            'cgst_rate': cgst_rate,
            'sgst_rate': sgst_rate,
            'igst_rate': igst_rate,
            'hsn_number': extracted_data.get('hsn_number', 'Unknown'),
            'vendor_address': extracted_data.get('vendor_address', 'Unknown'),
            'hsn_codes': extracted_data.get('hsn_codes', []),
            'line_items': extracted_data.get('line_items', [])
        }

        # Print summary
        print(f"\n📊 EXTRACTION SUMMARY:")
        print(f"  Invoice #: {structured_data['invoice_number']}")
        print(f"  Vendor: {structured_data['vendor_name']}")
        print(f"  Date: {structured_data['invoice_date']}")
        print(f"  Amount: ₹{structured_data['total_amount']:,.2f}")
        print(f"  GST Numbers: {len(structured_data['gst_numbers'])} found")
        print(f"  GST Rate: {structured_data['gst_rate']}")
        print(f"  HSN Number: {structured_data['hsn_number']}")
        print(f"  HSN Codes: {len(structured_data['hsn_codes'])} found")
        print(f"  Line Items: {len(structured_data['line_items'])} items")
        print(f"  OCR Engine: Mistral OCR")

        return {
            'success': True,
            'raw_text': all_text,
            'confidence': 95.0,
            'structured_data': structured_data
        }


# Create global instance
mistral_ocr = MistralOCR()

if __name__ == "__main__":
    # Test
    import sys
    if len(sys.argv) > 1:
        result = mistral_ocr.process_invoice(sys.argv[1])
        if result['success']:
            print("\n" + "=" * 60)
            print("✅ EXTRACTION SUCCESSFUL!")
            print("=" * 60)
            print(json.dumps(result['structured_data'], indent=2))
        else:
            print(f"\n❌ Error: {result.get('error')}")
    else:
        print("Usage: python mistral_ocr.py <path_to_invoice.pdf>")
