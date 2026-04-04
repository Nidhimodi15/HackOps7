const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Invoice = require('../models/Invoice');
const ocrService = require('../services/ocrService');
const gstValidationService = require('../services/gstValidationService');
const anomalyDetector = require('../ai-engine/anomalyDetector');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and GIF are allowed.'));
    }
  }
});

/**
 * Upload and process invoice
 */
router.post('/upload', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('🔍 FINTEL AI: Processing invoice:', req.file.filename);

    // Create initial invoice record
    const invoice = new Invoice({
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      processingStatus: 'processing'
    });

    await invoice.save();

    // Start processing in background
    processInvoiceAsync(invoice._id, req.file.path, req.file.mimetype);

    res.json({
      message: 'Invoice uploaded successfully. Processing started.',
      invoiceId: invoice._id,
      fileName: req.file.originalname,
      status: 'processing'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get invoice processing status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      invoiceId: invoice._id,
      status: invoice.processingStatus,
      ocrAccuracy: invoice.ocrAccuracy,
      riskScore: invoice.riskScore,
      anomaliesCount: invoice.anomalies.length,
      lastUpdated: invoice.lastUpdated
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get processed invoice details
 */
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all invoices with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      riskLevel,
      vendor,
      dateFrom,
      dateTo
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (status) filter.processingStatus = status;
    if (vendor) filter.vendorGSTNumber = vendor;
    
    if (riskLevel) {
      switch (riskLevel) {
        case 'low':
          filter.riskScore = { $lt: 30 };
          break;
        case 'medium':
          filter.riskScore = { $gte: 30, $lt: 70 };
          break;
        case 'high':
          filter.riskScore = { $gte: 70 };
          break;
      }
    }

    if (dateFrom || dateTo) {
      filter.invoiceDate = {};
      if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { uploadedAt: -1 },
      populate: []
    };

    const invoices = await Invoice.find(filter)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .exec();

    const total = await Invoice.countDocuments(filter);

    res.json({
      invoices,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalInvoices: total,
        hasNext: options.page < Math.ceil(total / options.limit),
        hasPrev: options.page > 1
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update invoice with user corrections
 */
router.put('/:id/correct', async (req, res) => {
  try {
    const { corrections } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Apply corrections
    for (const correction of corrections) {
      const { field, value } = correction;
      
      // Store original value for learning
      invoice.userCorrections.push({
        field: field,
        originalValue: invoice[field],
        correctedValue: value,
        timestamp: new Date()
      });
      
      // Apply correction
      invoice[field] = value;
    }

    // Recalculate risk score
    invoice.calculateRiskScore();
    
    await invoice.save();

    res.json({
      message: 'Corrections applied successfully',
      invoice: invoice
    });

  } catch (error) {
    console.error('Correction error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete invoice
 */
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Delete file
    if (fs.existsSync(invoice.filePath)) {
      fs.unlinkSync(invoice.filePath);
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({ message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Async function to process invoice
 */
async function processInvoiceAsync(invoiceId, filePath, fileType) {
  try {
    console.log(`🤖 FINTEL AI: Starting processing for invoice ${invoiceId}`);
    
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return;

    // Step 1: OCR Extraction
    console.log('📄 Step 1: OCR Text Extraction');
    const ocrResult = await ocrService.extractText(filePath, fileType);
    
    invoice.extractedText = ocrResult.text;
    invoice.ocrAccuracy = ocrResult.accuracy;
    
    // Step 2: Extract structured data
    console.log('🔍 Step 2: Extracting structured data');
    const extractedData = ocrService.extractInvoiceData(ocrResult.text);
    
    // Update invoice with extracted data
    Object.assign(invoice, extractedData);
    
    await invoice.save();

    // Step 3: GST Validation
    console.log('✅ Step 3: GST Validation');
    if (invoice.vendorGSTNumber) {
      const vendorGSTResult = await gstValidationService.validateGSTNumber(invoice.vendorGSTNumber);
      invoice.validationResults.vendorGSTValid = vendorGSTResult.valid;
      if (vendorGSTResult.businessName) {
        invoice.vendorName = vendorGSTResult.businessName;
      }
    }

    if (invoice.companyGSTNumber) {
      const companyGSTResult = await gstValidationService.validateGSTNumber(invoice.companyGSTNumber);
      invoice.validationResults.companyGSTValid = companyGSTResult.valid;
      if (companyGSTResult.businessName) {
        invoice.companyName = companyGSTResult.businessName;
      }
    }

    // Step 4: HSN/SAC Validation
    console.log('🏷️ Step 4: HSN/SAC Validation');
    let hsnValid = true;
    for (const item of invoice.items) {
      if (item.hsnSacCode) {
        const hsnResult = gstValidationService.validateHSNCode(item.hsnSacCode);
        if (!hsnResult.valid) {
          hsnValid = false;
        }
      }
    }
    invoice.validationResults.hsnRatesValid = hsnValid;

    // Step 5: Anomaly Detection
    console.log('🚨 Step 5: Anomaly Detection');
    const anomalies = await anomalyDetector.detectAnomalies(invoice);
    invoice.anomalies = anomalies;

    // Step 6: Calculate final risk score
    console.log('📊 Step 6: Risk Score Calculation');
    invoice.calculateRiskScore();

    // Step 7: Mark as completed
    invoice.processingStatus = 'completed';
    invoice.lastUpdated = new Date();
    
    await invoice.save();

    console.log(`✅ FINTEL AI: Processing completed for invoice ${invoiceId}`);
    console.log(`📊 Risk Score: ${invoice.riskScore}/100`);
    console.log(`🚨 Anomalies Found: ${invoice.anomalies.length}`);

  } catch (error) {
    console.error(`❌ FINTEL AI: Processing failed for invoice ${invoiceId}:`, error);
    
    // Update invoice status to failed
    await Invoice.findByIdAndUpdate(invoiceId, {
      processingStatus: 'failed',
      lastUpdated: new Date()
    });
  }
}

module.exports = router;
