const tesseract = require('node-tesseract-ocr');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

class OCRService {
  constructor() {
    // Configure Tesseract
    this.tesseractConfig = {
      lang: 'eng',
      oem: 1,
      psm: 3,
      tesseractPath: 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
    };
  }

  /**
   * Extract text from various file formats
   */
  async extractText(filePath, fileType) {
    try {
      let extractedText = '';
      
      if (fileType === 'application/pdf') {
        extractedText = await this.extractFromPDF(filePath);
      } else if (fileType.startsWith('image/')) {
        extractedText = await this.extractFromImage(filePath);
      } else {
        throw new Error('Unsupported file type');
      }

      return {
        text: extractedText,
        accuracy: this.calculateAccuracy(extractedText)
      };
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  async extractFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract text from image files using Tesseract
   */
  async extractFromImage(filePath) {
    try {
      const text = await tesseract.recognize(filePath, this.tesseractConfig);
      return text;
    } catch (error) {
      console.error('Image OCR error:', error);
      throw error;
    }
  }

  /**
   * Calculate OCR accuracy based on text quality
   */
  calculateAccuracy(text) {
    if (!text || text.length === 0) return 0;
    
    // Simple accuracy calculation based on:
    // - Text length
    // - Presence of numbers and letters
    // - Common invoice keywords
    
    let score = 0;
    
    // Base score for having text
    if (text.length > 50) score += 30;
    
    // Check for invoice keywords
    const invoiceKeywords = [
      'invoice', 'bill', 'amount', 'total', 'gst', 'tax',
      'date', 'number', 'vendor', 'company', 'hsn', 'sac'
    ];
    
    invoiceKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        score += 5;
      }
    });
    
    // Check for numbers (amounts, dates, etc.)
    const numberMatches = text.match(/\d+/g);
    if (numberMatches && numberMatches.length > 5) score += 20;
    
    // Check for GST pattern
    if (/\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/.test(text)) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Extract structured invoice data from text
   */
  extractInvoiceData(text) {
    const data = {
      invoiceNumber: this.extractInvoiceNumber(text),
      invoiceAmount: this.extractAmount(text),
      invoiceDate: this.extractDate(text),
      vendorGSTNumber: this.extractGSTNumber(text, 'vendor'),
      companyGSTNumber: this.extractGSTNumber(text, 'company'),
      items: this.extractItems(text),
      vendorName: this.extractVendorName(text),
      companyName: this.extractCompanyName(text)
    };

    return data;
  }

  /**
   * Extract invoice number
   */
  extractInvoiceNumber(text) {
    const patterns = [
      /invoice\s*(?:no|number|#)\s*:?\s*([A-Z0-9\-\/]+)/i,
      /bill\s*(?:no|number|#)\s*:?\s*([A-Z0-9\-\/]+)/i,
      /inv\s*(?:no|#)\s*:?\s*([A-Z0-9\-\/]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  /**
   * Extract total amount
   */
  extractAmount(text) {
    const patterns = [
      /total\s*amount\s*:?\s*₹?\s*([0-9,]+\.?\d*)/i,
      /grand\s*total\s*:?\s*₹?\s*([0-9,]+\.?\d*)/i,
      /amount\s*payable\s*:?\s*₹?\s*([0-9,]+\.?\d*)/i,
      /total\s*:?\s*₹?\s*([0-9,]+\.?\d*)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }
    return null;
  }

  /**
   * Extract invoice date
   */
  extractDate(text) {
    const patterns = [
      /invoice\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /bill\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[1]);
      }
    }
    return null;
  }

  /**
   * Extract GST numbers
   */
  extractGSTNumber(text, type) {
    // GST number pattern: 22AAAAA0000A1Z5
    const gstPattern = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/g;
    const matches = text.match(gstPattern);
    
    if (matches && matches.length > 0) {
      // Return first GST for vendor, second for company (if available)
      return type === 'vendor' ? matches[0] : (matches[1] || matches[0]);
    }
    return null;
  }

  /**
   * Extract line items
   */
  extractItems(text) {
    // This is a simplified extraction - in production, you'd use more sophisticated parsing
    const items = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Look for HSN/SAC codes
      const hsnMatch = line.match(/(\d{4,8})/);
      if (hsnMatch) {
        const amountMatch = line.match(/₹?\s*([0-9,]+\.?\d*)/);
        if (amountMatch) {
          items.push({
            description: line.trim(),
            hsnSacCode: hsnMatch[1],
            amount: parseFloat(amountMatch[1].replace(/,/g, ''))
          });
        }
      }
    }
    
    return items;
  }

  /**
   * Extract vendor name
   */
  extractVendorName(text) {
    // Look for patterns that typically indicate vendor names
    const lines = text.split('\n');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 5 && line.length < 50 && 
          !line.toLowerCase().includes('invoice') &&
          !line.toLowerCase().includes('bill')) {
        return line;
      }
    }
    return null;
  }

  /**
   * Extract company name
   */
  extractCompanyName(text) {
    // Look for "To:" or "Bill To:" patterns
    const patterns = [
      /(?:bill\s*to|to)\s*:?\s*([^\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }
}

module.exports = new OCRService();
