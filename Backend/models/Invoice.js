const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  // Basic Invoice Information
  invoiceNumber: {
    type: String,
    required: true,
    index: true
  },
  invoiceAmount: {
    type: Number,
    required: true
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  
  // GST Information
  vendorGSTNumber: {
    type: String,
    required: true,
    index: true
  },
  companyGSTNumber: {
    type: String,
    required: true
  },
  
  // Items and HSN/SAC
  items: [{
    description: String,
    hsnSacCode: String,
    quantity: Number,
    rate: Number,
    amount: Number,
    gstRate: Number,
    gstAmount: Number
  }],
  
  // File Information
  fileName: String,
  filePath: String,
  fileType: String,
  
  // OCR and Processing
  ocrAccuracy: {
    type: Number,
    default: 0
  },
  extractedText: String,
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Validation Results
  validationResults: {
    vendorGSTValid: {
      type: Boolean,
      default: null
    },
    companyGSTValid: {
      type: Boolean,
      default: null
    },
    hsnRatesValid: {
      type: Boolean,
      default: null
    },
    arithmeticValid: {
      type: Boolean,
      default: null
    }
  },
  
  // Anomaly Detection
  anomalies: [{
    type: {
      type: String,
      enum: ['duplicate', 'price_outlier', 'gst_mismatch', 'arithmetic_error', 'suspicious_pattern']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    confidence: Number,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Risk Scoring
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Vendor Information
  vendorName: String,
  vendorAddress: String,
  
  // Company Information
  companyName: String,
  companyAddress: String,
  
  // Totals
  subtotal: Number,
  totalGST: Number,
  totalAmount: Number,
  
  // Metadata
  uploadedBy: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // AI Learning
  feedbackScore: Number,
  userCorrections: [{
    field: String,
    originalValue: String,
    correctedValue: String,
    timestamp: Date
  }]
}, {
  timestamps: true
});

// Indexes for performance
InvoiceSchema.index({ invoiceNumber: 1, vendorGSTNumber: 1 });
InvoiceSchema.index({ invoiceDate: -1 });
InvoiceSchema.index({ riskScore: -1 });
InvoiceSchema.index({ 'anomalies.type': 1 });

// Methods
InvoiceSchema.methods.calculateRiskScore = function() {
  let score = 0;
  
  // Base score from anomalies
  this.anomalies.forEach(anomaly => {
    switch(anomaly.severity) {
      case 'critical': score += 40; break;
      case 'high': score += 25; break;
      case 'medium': score += 15; break;
      case 'low': score += 5; break;
    }
  });
  
  // Validation failures
  if (this.validationResults.vendorGSTValid === false) score += 20;
  if (this.validationResults.companyGSTValid === false) score += 20;
  if (this.validationResults.hsnRatesValid === false) score += 15;
  if (this.validationResults.arithmeticValid === false) score += 10;
  
  // OCR accuracy penalty
  if (this.ocrAccuracy < 80) score += 10;
  
  this.riskScore = Math.min(score, 100);
  return this.riskScore;
};

InvoiceSchema.methods.addAnomaly = function(type, severity, description, confidence, details) {
  this.anomalies.push({
    type,
    severity,
    description,
    confidence,
    details
  });
  this.calculateRiskScore();
};

module.exports = mongoose.model('Invoice', InvoiceSchema);
