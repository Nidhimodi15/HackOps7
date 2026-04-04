"""
LangGraph Workflow for Invoice Processing
Multi-step agentic workflow with decision points
"""

from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

# Define state
class InvoiceState(TypedDict):
    invoice_data: dict
    ocr_result: dict
    gst_validation: dict
    anomalies: Annotated[list, operator.add]
    next_step: str
    final_report: str

# Node functions
def extract_invoice_data(state: InvoiceState) -> InvoiceState:
    """Extract data from invoice using Gemini Vision"""
    print("📄 Step 1: Extracting invoice data...")
    
    # Your existing OCR code
    from gemini_vision_ocr import GeminiVisionOCR
    ocr = GeminiVisionOCR()
    
    # Extract data
    result = ocr.extract_invoice_data(state["invoice_data"]["file_path"])
    
    state["ocr_result"] = result
    state["next_step"] = "validate_gst"
    return state

def validate_gst_numbers(state: InvoiceState) -> InvoiceState:
    """Validate GST numbers"""
    print("🔍 Step 2: Validating GST numbers...")
    
    from gst_verifier import GSTVerifier
    verifier = GSTVerifier()
    
    gst_numbers = state["ocr_result"]["structured_data"].get("gst_numbers", [])
    
    if not gst_numbers:
        state["anomalies"].append({
            "type": "MISSING_GST",
            "severity": "HIGH",
            "description": "No GST number found"
        })
        state["next_step"] = "detect_anomalies"
    else:
        validation_results = []
        for gst in gst_numbers:
            result = verifier.verify_gst(gst)
            validation_results.append(result)
            
            if not result.get("success"):
                state["anomalies"].append({
                    "type": "INVALID_GST",
                    "severity": "HIGH",
                    "description": f"Invalid GST: {gst}"
                })
        
        state["gst_validation"] = validation_results
        state["next_step"] = "detect_anomalies"
    
    return state

def detect_anomalies(state: InvoiceState) -> InvoiceState:
    """Detect various anomalies"""
    print("🚨 Step 3: Detecting anomalies...")
    
    from database import FintelDatabase
    db = FintelDatabase()
    
    invoice_data = state["ocr_result"]["structured_data"]
    
    # Check duplicates
    duplicate = db.invoices.find_one({
        'invoiceNumber': invoice_data.get('invoice_number')
    })
    
    if duplicate:
        state["anomalies"].append({
            "type": "DUPLICATE_INVOICE",
            "severity": "HIGH",
            "description": f"Duplicate invoice: {invoice_data.get('invoice_number')}"
        })
    
    # Check unusual amounts
    vendor_name = invoice_data.get('vendor_name')
    current_amount = float(invoice_data.get('total_amount', 0))
    
    invoices = list(db.invoices.find({'vendorName': vendor_name}))
    if invoices:
        amounts = [inv.get('totalAmount', 0) for inv in invoices]
        avg_amount = sum(amounts) / len(amounts)
        
        if current_amount > avg_amount * 3:
            state["anomalies"].append({
                "type": "UNUSUAL_AMOUNT",
                "severity": "MEDIUM",
                "description": f"Amount ₹{current_amount} is 3x higher than average ₹{avg_amount}"
            })
    
    db.close()
    
    # Decide next step based on anomalies
    if len(state["anomalies"]) > 0:
        state["next_step"] = "ai_analysis"
    else:
        state["next_step"] = "generate_report"
    
    return state

def ai_deep_analysis(state: InvoiceState) -> InvoiceState:
    """Use LLM for deep analysis of anomalies"""
    print("🤖 Step 4: AI deep analysis...")
    
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.prompts import PromptTemplate
    import os
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=0,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    prompt = PromptTemplate.from_template("""
    You are an expert fraud detection analyst. Analyze these invoice anomalies and provide insights.
    
    Invoice Data: {invoice_data}
    Detected Anomalies: {anomalies}
    
    Provide:
    1. Risk assessment (HIGH/MEDIUM/LOW)
    2. Detailed explanation of concerns
    3. Recommended actions
    4. Confidence level
    """)
    
    chain = prompt | llm
    
    result = chain.invoke({
        "invoice_data": str(state["ocr_result"]["structured_data"]),
        "anomalies": str(state["anomalies"])
    })
    
    state["final_report"] = result.content
    state["next_step"] = "generate_report"
    
    return state

def generate_final_report(state: InvoiceState) -> InvoiceState:
    """Generate final compliance report"""
    print("📊 Step 5: Generating final report...")
    
    report = f"""
    ═══════════════════════════════════════
    FINTEL AI - Invoice Analysis Report
    ═══════════════════════════════════════
    
    Invoice Number: {state["ocr_result"]["structured_data"].get("invoice_number")}
    Vendor: {state["ocr_result"]["structured_data"].get("vendor_name")}
    Amount: ₹{state["ocr_result"]["structured_data"].get("total_amount")}
    
    ANOMALIES DETECTED: {len(state["anomalies"])}
    
    """
    
    for i, anomaly in enumerate(state["anomalies"], 1):
        report += f"\n{i}. [{anomaly['severity']}] {anomaly['type']}"
        report += f"\n   {anomaly['description']}\n"
    
    if state.get("final_report"):
        report += f"\n\nAI ANALYSIS:\n{state['final_report']}"
    
    report += "\n\n═══════════════════════════════════════"
    
    state["final_report"] = report
    state["next_step"] = "end"
    
    return state

# Decision function
def should_do_ai_analysis(state: InvoiceState) -> str:
    """Decide if AI deep analysis is needed"""
    if state["next_step"] == "ai_analysis":
        return "ai_analysis"
    return "generate_report"

# Build the graph
def create_invoice_workflow():
    """Create LangGraph workflow"""
    workflow = StateGraph(InvoiceState)
    
    # Add nodes
    workflow.add_node("extract", extract_invoice_data)
    workflow.add_node("validate_gst", validate_gst_numbers)
    workflow.add_node("detect_anomalies", detect_anomalies)
    workflow.add_node("ai_analysis", ai_deep_analysis)
    workflow.add_node("generate_report", generate_final_report)
    
    # Add edges
    workflow.set_entry_point("extract")
    workflow.add_edge("extract", "validate_gst")
    workflow.add_edge("validate_gst", "detect_anomalies")
    
    # Conditional edge - AI decides
    workflow.add_conditional_edges(
        "detect_anomalies",
        should_do_ai_analysis,
        {
            "ai_analysis": "ai_analysis",
            "generate_report": "generate_report"
        }
    )
    
    workflow.add_edge("ai_analysis", "generate_report")
    workflow.add_edge("generate_report", END)
    
    return workflow.compile()

# Example usage
if __name__ == "__main__":
    # Create workflow
    app = create_invoice_workflow()
    
    # Test invoice
    initial_state = {
        "invoice_data": {
            "file_path": "path/to/invoice.pdf"
        },
        "ocr_result": {},
        "gst_validation": {},
        "anomalies": [],
        "next_step": "",
        "final_report": ""
    }
    
    print("🚀 Starting LangGraph Workflow...")
    print("=" * 60)
    
    # Run workflow
    final_state = app.invoke(initial_state)
    
    print("\n" + final_state["final_report"])
