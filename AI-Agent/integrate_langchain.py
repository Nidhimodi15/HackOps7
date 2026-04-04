"""
Integration layer to add LangChain to existing system
Adds AI-powered analysis alongside rule-based detection
"""

from langchain_agent import analyze_invoice_with_agent
from database import FintelDatabase

def analyze_invoice_hybrid(invoice_data: dict, use_ai: bool = False):
    """
    Hybrid analysis - Rule-based + AI (optional)
    
    Args:
        invoice_data: Invoice data from OCR
        use_ai: If True, also run AI agent analysis
    
    Returns:
        dict with both rule-based and AI analysis
    """
    db = FintelDatabase()
    
    # 1. EXISTING: Rule-based detection (fast, always runs)
    rule_based_anomalies = db.detect_anomalies(invoice_data)
    
    result = {
        "rule_based_anomalies": rule_based_anomalies,
        "ai_analysis": None,
        "ai_used": False
    }
    
    # 2. NEW: AI Agent analysis (optional, for high-value invoices)
    if use_ai:
        try:
            ai_result = analyze_invoice_with_agent({
                "invoice_number": invoice_data.get("invoice_number"),
                "vendor_name": invoice_data.get("vendor_name"),
                "total_amount": invoice_data.get("total_amount", 0),
                "gst_numbers": invoice_data.get("gst_numbers", [])
            })
            
            result["ai_analysis"] = ai_result.get("analysis")
            result["ai_used"] = True
            result["ai_confidence"] = ai_result.get("confidence")
            
        except Exception as e:
            print(f"AI analysis failed: {e}")
            result["ai_error"] = str(e)
    
    db.close()
    return result


# Add to fintel_api_fixed.py
def add_ai_endpoint():
    """
    Add this to your fintel_api_fixed.py:
    """
    code = '''
from integrate_langchain import analyze_invoice_hybrid

@app.post("/api/invoices/upload-with-ai")
async def upload_invoice_with_ai(
    file: UploadFile = File(...),
    use_ai: bool = False  # Optional AI analysis
):
    """
    Upload invoice with optional AI analysis
    
    - use_ai=False: Fast rule-based only (default)
    - use_ai=True: Rule-based + AI agent analysis
    """
    
    # Existing OCR extraction
    ocr_result = gemini_ocr.extract_invoice_data(file_path)
    
    # Hybrid analysis (rule-based + optional AI)
    analysis = analyze_invoice_hybrid(
        invoice_data=ocr_result["structured_data"],
        use_ai=use_ai
    )
    
    return {
        "success": True,
        "ocr_result": ocr_result,
        "rule_based_anomalies": analysis["rule_based_anomalies"],
        "ai_analysis": analysis["ai_analysis"],
        "ai_used": analysis["ai_used"]
    }
'''
    return code


if __name__ == "__main__":
    print("=" * 60)
    print("LANGCHAIN INTEGRATION GUIDE")
    print("=" * 60)
    print("\nAdd this endpoint to fintel_api_fixed.py:")
    print(add_ai_endpoint())
    print("\n" + "=" * 60)
    print("\nUSAGE:")
    print("1. Normal upload (fast): POST /api/invoices/upload")
    print("2. With AI analysis: POST /api/invoices/upload-with-ai?use_ai=true")
    print("=" * 60)
