"""
LangChain Agent for Intelligent Invoice Analysis
Uses LLM to make smart decisions about anomaly detection
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_react_agent, AgentExecutor
from langchain.tools import Tool
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize LLM - Using Gemini (you already have this!)
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables!")

llm = ChatGoogleGenerativeAI(
    model="models/gemini-2.0-flash-exp",
    temperature=0,
    google_api_key=api_key
)

# Define tools that the agent can use
def check_duplicate_tool(invoice_number: str) -> str:
    """Check if invoice number already exists in database"""
    from database import FintelDatabase
    db = FintelDatabase()
    existing = db.invoices.find_one({'invoiceNumber': invoice_number})
    db.close()
    
    if existing:
        return f"DUPLICATE FOUND: Invoice {invoice_number} already exists from {existing.get('uploadDate')}"
    return f"No duplicate found for {invoice_number}"

def validate_gst_tool(gst_number: str) -> str:
    """Validate GST number using RapidAPI"""
    from gst_verifier import GSTVerifier
    verifier = GSTVerifier()
    result = verifier.verify_gst(gst_number)
    
    if result.get('success'):
        return f"GST {gst_number} is VALID. Company: {result.get('legal_name')}, Status: {result.get('status')}"
    return f"GST {gst_number} is INVALID or not found"

def analyze_amount_tool(input_string: str) -> str:
    """Analyze if invoice amount is unusual for this vendor"""
    try:
        # Parse input: "vendor_name,amount"
        parts = input_string.split(',')
        vendor_name = parts[0].strip()
        amount = float(parts[1].strip())
    except:
        return "Error: Input should be 'vendor_name,amount'"
    
    from database import FintelDatabase
    db = FintelDatabase()
    
    # Get vendor's invoice history
    invoices = list(db.invoices.find({'vendorName': vendor_name}))
    db.close()
    
    if not invoices:
        return f"No history for vendor {vendor_name}. Cannot determine if amount is unusual."
    
    amounts = [inv.get('totalAmount', 0) for inv in invoices]
    avg_amount = sum(amounts) / len(amounts)
    max_amount = max(amounts)
    min_amount = min(amounts)
    
    analysis = f"Vendor: {vendor_name}\n"
    analysis += f"Current Amount: ₹{amount:,.2f}\n"
    analysis += f"Average: ₹{avg_amount:,.2f}\n"
    analysis += f"Range: ₹{min_amount:,.2f} - ₹{max_amount:,.2f}\n"
    
    if amount > avg_amount * 3:
        analysis += "⚠️ UNUSUAL: Amount is 3x higher than average!"
    elif amount > avg_amount * 2:
        analysis += "⚠️ WARNING: Amount is 2x higher than average"
    else:
        analysis += "✅ NORMAL: Amount is within expected range"
    
    return analysis

def check_gst_vendor_match_tool(input_string: str) -> str:
    """Check if GST number has been used by different vendors"""
    try:
        # Parse input: "gst_number,vendor_name"
        parts = input_string.split(',')
        gst_number = parts[0].strip()
        vendor_name = parts[1].strip()
    except:
        return "Error: Input should be 'gst_number,vendor_name'"
    
    from database import FintelDatabase
    db = FintelDatabase()
    
    # Find invoices with this GST but different vendor
    different_vendor = db.invoices.find_one({
        'gstNumbers': gst_number,
        'vendorName': {'$ne': vendor_name}
    })
    db.close()
    
    if different_vendor:
        return f"⚠️ MISMATCH: GST {gst_number} was previously used by {different_vendor['vendorName']}, now showing as {vendor_name}"
    return f"✅ MATCH: GST {gst_number} consistently used by {vendor_name}"

# Create tools for the agent
tools = [
    Tool(
        name="check_duplicate",
        func=check_duplicate_tool,
        description="Check if an invoice number already exists in the database. Use this when you need to verify if an invoice is a duplicate. Input should be the invoice number as a string."
    ),
    Tool(
        name="validate_gst",
        func=validate_gst_tool,
        description="Validate a GST number using government API. Use this to check if a GST number is valid and active. Input should be the GST number as a string."
    ),
    Tool(
        name="analyze_amount",
        func=analyze_amount_tool,
        description="Analyze if an invoice amount is unusual for a vendor. Use this to detect potential fraud or errors. Input should be 'vendor_name,amount' as a comma-separated string."
    ),
    Tool(
        name="check_gst_vendor_match",
        func=check_gst_vendor_match_tool,
        description="Check if a GST number has been used by different vendors. Use this to detect potential GST fraud. Input should be 'gst_number,vendor_name' as a comma-separated string."
    )
]

# Create agent prompt (ReAct style for Gemini)
prompt = PromptTemplate.from_template("""
You are an expert invoice auditor and fraud detection specialist. 
Your job is to analyze invoices and detect anomalies, fraud, or compliance issues.

You have access to the following tools:
{tools}

Tool Names: {tool_names}

Use this format:
Thought: Think about what to check
Action: tool_name
Action Input: input for the tool
Observation: result from tool
... (repeat Thought/Action/Observation as needed)
Thought: I now have enough information
Final Answer: Your detailed analysis with severity levels

Question: {input}

{agent_scratchpad}
""")

# Create agent
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=5,
    handle_parsing_errors=True
)

def analyze_invoice_with_agent(invoice_data: dict) -> dict:
    """
    Use LangChain agent to intelligently analyze invoice
    """
    # Prepare invoice summary for agent
    invoice_summary = f"""
    Analyze this invoice for anomalies:
    
    Invoice Number: {invoice_data.get('invoice_number', 'Unknown')}
    Vendor Name: {invoice_data.get('vendor_name', 'Unknown')}
    Amount: ₹{invoice_data.get('total_amount', 0):,.2f}
    GST Numbers: {', '.join(invoice_data.get('gst_numbers', []))}
    Date: {invoice_data.get('invoice_date', 'Unknown')}
    
    Please check for:
    1. Duplicate invoices
    2. Invalid GST numbers
    3. Unusual amounts
    4. GST-vendor mismatches
    
    Provide a detailed analysis with severity levels.
    """
    
    try:
        # Agent decides what tools to use and in what order
        result = agent_executor.invoke({"input": invoice_summary})
        
        return {
            "success": True,
            "analysis": result["output"],
            "agent_used": True
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "agent_used": False
        }

# Example usage
if __name__ == "__main__":
    # Test invoice
    test_invoice = {
        "invoice_number": "INV-2024-001",
        "vendor_name": "Test Vendor",
        "total_amount": 50000,
        "gst_numbers": ["24AAACC1206D1ZM"],
        "invoice_date": "2024-11-08"
    }
    
    print("🤖 LangChain Agent Analysis:")
    print("=" * 60)
    
    result = analyze_invoice_with_agent(test_invoice)
    
    if result["success"]:
        print(result["analysis"])
    else:
        print(f"Error: {result['error']}")
