const Invoice = require('../models/Invoice');

class AnomalyDetector {
  constructor() {
    this.thresholds = {
      duplicateSimilarity: 0.85,
      priceDeviationPercent: 30,
      gstRateTolerance: 0.1
    };
  }

  /**
   * Main anomaly detection function
   */
  async detectAnomalies(invoice) {
    const anomalies = [];

    try {
      // 1. Check for duplicates
      const duplicateAnomalies = await this.detectDuplicates(invoice);
      anomalies.push(...duplicateAnomalies);

      // 2. Check price anomalies
      const priceAnomalies = await this.detectPriceAnomalies(invoice);
      anomalies.push(...priceAnomalies);

      // 3. Check GST rate compliance
      const gstAnomalies = this.detectGSTAnomalies(invoice);
      anomalies.push(...gstAnomalies);

      // 4. Check arithmetic accuracy
      const arithmeticAnomalies = this.detectArithmeticAnomalies(invoice);
      anomalies.push(...arithmeticAnomalies);

      // 5. Check suspicious patterns
      const patternAnomalies = await this.detectSuspiciousPatterns(invoice);
      anomalies.push(...patternAnomalies);

      return anomalies;
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return [];
    }
  }

  /**
   * Detect duplicate invoices
   */
  async detectDuplicates(invoice) {
    const anomalies = [];

    try {
      // Find potential duplicates based on invoice number and vendor
      const potentialDuplicates = await Invoice.find({
        $and: [
          { _id: { $ne: invoice._id } },
          {
            $or: [
              { invoiceNumber: invoice.invoiceNumber },
              {
                $and: [
                  { vendorGSTNumber: invoice.vendorGSTNumber },
                  { invoiceAmount: invoice.invoiceAmount },
                  {
                    invoiceDate: {
                      $gte: new Date(invoice.invoiceDate.getTime() - 7 * 24 * 60 * 60 * 1000),
                      $lte: new Date(invoice.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                    }
                  }
                ]
              }
            ]
          }
        ]
      });

      for (const duplicate of potentialDuplicates) {
        const similarity = this.calculateSimilarity(invoice, duplicate);
        
        if (similarity >= this.thresholds.duplicateSimilarity) {
          anomalies.push({
            type: 'duplicate',
            severity: similarity > 0.95 ? 'critical' : 'high',
            description: `Potential duplicate of invoice ${duplicate.invoiceNumber}`,
            confidence: similarity * 100,
            details: {
              duplicateId: duplicate._id,
              duplicateInvoiceNumber: duplicate.invoiceNumber,
              similarity: similarity,
              matchingFields: this.getMatchingFields(invoice, duplicate)
            }
          });
        }
      }
    } catch (error) {
      console.error('Duplicate detection error:', error);
    }

    return anomalies;
  }

  /**
   * Detect price anomalies using statistical analysis
   */
  async detectPriceAnomalies(invoice) {
    const anomalies = [];

    try {
      // Get historical data for similar vendors/items
      const historicalInvoices = await Invoice.find({
        vendorGSTNumber: invoice.vendorGSTNumber,
        _id: { $ne: invoice._id }
      }).limit(50);

      if (historicalInvoices.length < 3) return anomalies;

      // Analyze each item for price anomalies
      for (const item of invoice.items) {
        const historicalPrices = this.getHistoricalPrices(item, historicalInvoices);
        
        if (historicalPrices.length > 0) {
          const stats = this.calculatePriceStatistics(historicalPrices);
          const deviation = this.calculatePriceDeviation(item.rate, stats);

          if (Math.abs(deviation) > this.thresholds.priceDeviationPercent) {
            anomalies.push({
              type: 'price_outlier',
              severity: Math.abs(deviation) > 50 ? 'high' : 'medium',
              description: `Price deviation of ${deviation.toFixed(1)}% for item ${item.description}`,
              confidence: Math.min(Math.abs(deviation), 100),
              details: {
                itemDescription: item.description,
                currentPrice: item.rate,
                averagePrice: stats.mean,
                deviation: deviation,
                historicalPrices: historicalPrices.slice(0, 5)
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Price anomaly detection error:', error);
    }

    return anomalies;
  }

  /**
   * Detect GST rate compliance issues
   */
  detectGSTAnomalies(invoice) {
    const anomalies = [];

    // Standard GST rates in India
    const standardGSTRates = [0, 5, 12, 18, 28];

    for (const item of invoice.items) {
      if (item.gstRate !== undefined) {
        const isValidRate = standardGSTRates.some(rate => 
          Math.abs(item.gstRate - rate) <= this.thresholds.gstRateTolerance
        );

        if (!isValidRate) {
          anomalies.push({
            type: 'gst_mismatch',
            severity: 'medium',
            description: `Invalid GST rate ${item.gstRate}% for HSN ${item.hsnSacCode}`,
            confidence: 90,
            details: {
              itemDescription: item.description,
              hsnSacCode: item.hsnSacCode,
              appliedRate: item.gstRate,
              standardRates: standardGSTRates
            }
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect arithmetic errors in invoice calculations
   */
  detectArithmeticAnomalies(invoice) {
    const anomalies = [];

    try {
      let calculatedSubtotal = 0;
      let calculatedGST = 0;

      // Check item-wise calculations
      for (const item of invoice.items) {
        if (item.quantity && item.rate) {
          const expectedAmount = item.quantity * item.rate;
          const tolerance = expectedAmount * 0.01; // 1% tolerance

          if (Math.abs(item.amount - expectedAmount) > tolerance) {
            anomalies.push({
              type: 'arithmetic_error',
              severity: 'medium',
              description: `Arithmetic error in item: ${item.description}`,
              confidence: 95,
              details: {
                itemDescription: item.description,
                calculatedAmount: expectedAmount,
                invoiceAmount: item.amount,
                difference: item.amount - expectedAmount
              }
            });
          }

          calculatedSubtotal += expectedAmount;
          
          if (item.gstRate) {
            calculatedGST += (expectedAmount * item.gstRate) / 100;
          }
        }
      }

      // Check total calculations
      const totalTolerance = invoice.totalAmount * 0.01;
      const expectedTotal = calculatedSubtotal + calculatedGST;

      if (Math.abs(invoice.totalAmount - expectedTotal) > totalTolerance) {
        anomalies.push({
          type: 'arithmetic_error',
          severity: 'high',
          description: 'Total amount calculation error',
          confidence: 90,
          details: {
            calculatedTotal: expectedTotal,
            invoiceTotal: invoice.totalAmount,
            difference: invoice.totalAmount - expectedTotal,
            calculatedSubtotal: calculatedSubtotal,
            calculatedGST: calculatedGST
          }
        });
      }
    } catch (error) {
      console.error('Arithmetic anomaly detection error:', error);
    }

    return anomalies;
  }

  /**
   * Detect suspicious patterns
   */
  async detectSuspiciousPatterns(invoice) {
    const anomalies = [];

    try {
      // Check for round number amounts (suspicious)
      if (invoice.invoiceAmount % 1000 === 0 && invoice.invoiceAmount > 10000) {
        anomalies.push({
          type: 'suspicious_pattern',
          severity: 'low',
          description: 'Invoice amount is a round number',
          confidence: 60,
          details: {
            amount: invoice.invoiceAmount,
            pattern: 'round_amount'
          }
        });
      }

      // Check for weekend/holiday invoicing (if unusual for vendor)
      const invoiceDay = invoice.invoiceDate.getDay();
      if (invoiceDay === 0 || invoiceDay === 6) { // Sunday or Saturday
        const vendorWeekendInvoices = await Invoice.countDocuments({
          vendorGSTNumber: invoice.vendorGSTNumber,
          $expr: {
            $or: [
              { $eq: [{ $dayOfWeek: '$invoiceDate' }, 1] }, // Sunday
              { $eq: [{ $dayOfWeek: '$invoiceDate' }, 7] }  // Saturday
            ]
          }
        });

        const totalVendorInvoices = await Invoice.countDocuments({
          vendorGSTNumber: invoice.vendorGSTNumber
        });

        if (totalVendorInvoices > 10 && (vendorWeekendInvoices / totalVendorInvoices) < 0.1) {
          anomalies.push({
            type: 'suspicious_pattern',
            severity: 'low',
            description: 'Invoice created on weekend (unusual for this vendor)',
            confidence: 70,
            details: {
              invoiceDate: invoice.invoiceDate,
              vendorWeekendInvoices: vendorWeekendInvoices,
              totalVendorInvoices: totalVendorInvoices
            }
          });
        }
      }

    } catch (error) {
      console.error('Pattern anomaly detection error:', error);
    }

    return anomalies;
  }

  /**
   * Calculate similarity between two invoices
   */
  calculateSimilarity(invoice1, invoice2) {
    let score = 0;
    let factors = 0;

    // Invoice number match
    if (invoice1.invoiceNumber === invoice2.invoiceNumber) {
      score += 0.4;
    }
    factors += 0.4;

    // Amount match (within 1%)
    const amountDiff = Math.abs(invoice1.invoiceAmount - invoice2.invoiceAmount);
    const amountSimilarity = Math.max(0, 1 - (amountDiff / Math.max(invoice1.invoiceAmount, invoice2.invoiceAmount)));
    score += amountSimilarity * 0.3;
    factors += 0.3;

    // Vendor match
    if (invoice1.vendorGSTNumber === invoice2.vendorGSTNumber) {
      score += 0.2;
    }
    factors += 0.2;

    // Date proximity (within 7 days)
    const dateDiff = Math.abs(invoice1.invoiceDate - invoice2.invoiceDate) / (1000 * 60 * 60 * 24);
    const dateSimilarity = Math.max(0, 1 - (dateDiff / 7));
    score += dateSimilarity * 0.1;
    factors += 0.1;

    return score / factors;
  }

  /**
   * Get matching fields between two invoices
   */
  getMatchingFields(invoice1, invoice2) {
    const matching = [];
    
    if (invoice1.invoiceNumber === invoice2.invoiceNumber) matching.push('invoiceNumber');
    if (invoice1.vendorGSTNumber === invoice2.vendorGSTNumber) matching.push('vendorGSTNumber');
    if (Math.abs(invoice1.invoiceAmount - invoice2.invoiceAmount) < 0.01) matching.push('invoiceAmount');
    
    return matching;
  }

  /**
   * Get historical prices for similar items
   */
  getHistoricalPrices(item, historicalInvoices) {
    const prices = [];
    
    for (const invoice of historicalInvoices) {
      for (const historicalItem of invoice.items) {
        if (this.isSimilarItem(item, historicalItem)) {
          prices.push(historicalItem.rate);
        }
      }
    }
    
    return prices;
  }

  /**
   * Check if two items are similar
   */
  isSimilarItem(item1, item2) {
    // Check HSN/SAC code match
    if (item1.hsnSacCode && item2.hsnSacCode) {
      return item1.hsnSacCode === item2.hsnSacCode;
    }
    
    // Check description similarity (basic)
    if (item1.description && item2.description) {
      const desc1 = item1.description.toLowerCase();
      const desc2 = item2.description.toLowerCase();
      return desc1.includes(desc2) || desc2.includes(desc1);
    }
    
    return false;
  }

  /**
   * Calculate price statistics
   */
  calculatePriceStatistics(prices) {
    const sorted = prices.sort((a, b) => a - b);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    return { mean, median, min: sorted[0], max: sorted[sorted.length - 1] };
  }

  /**
   * Calculate price deviation percentage
   */
  calculatePriceDeviation(currentPrice, stats) {
    return ((currentPrice - stats.mean) / stats.mean) * 100;
  }
}

module.exports = new AnomalyDetector();
