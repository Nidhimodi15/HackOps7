const express = require('express');
const Invoice = require('../models/Invoice');

const router = express.Router();

/**
 * Get anomaly dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { timeRange = '30' } = req.query;
    const days = parseInt(timeRange);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get anomaly statistics
    const anomalyStats = await Invoice.aggregate([
      {
        $match: {
          uploadedAt: { $gte: dateFrom },
          anomalies: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$anomalies'
      },
      {
        $group: {
          _id: {
            type: '$anomalies.type',
            severity: '$anomalies.severity'
          },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$anomalies.confidence' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get risk score distribution
    const riskDistribution = await Invoice.aggregate([
      {
        $match: {
          uploadedAt: { $gte: dateFrom },
          processingStatus: 'completed'
        }
      },
      {
        $bucket: {
          groupBy: '$riskScore',
          boundaries: [0, 30, 70, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgAmount: { $avg: '$invoiceAmount' }
          }
        }
      }
    ]);

    // Get top risky invoices
    const topRiskyInvoices = await Invoice.find({
      uploadedAt: { $gte: dateFrom },
      processingStatus: 'completed'
    })
    .sort({ riskScore: -1 })
    .limit(10)
    .select('invoiceNumber vendorName invoiceAmount riskScore anomalies uploadedAt');

    // Get anomaly trends
    const anomalyTrends = await Invoice.aggregate([
      {
        $match: {
          uploadedAt: { $gte: dateFrom },
          anomalies: { $exists: true, $ne: [] }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$uploadedAt'
              }
            }
          },
          totalAnomalies: { $sum: { $size: '$anomalies' } },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      summary: {
        totalInvoicesProcessed: await Invoice.countDocuments({
          uploadedAt: { $gte: dateFrom },
          processingStatus: 'completed'
        }),
        totalAnomaliesDetected: anomalyStats.reduce((sum, stat) => sum + stat.count, 0),
        avgRiskScore: await Invoice.aggregate([
          {
            $match: {
              uploadedAt: { $gte: dateFrom },
              processingStatus: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              avgRisk: { $avg: '$riskScore' }
            }
          }
        ]).then(result => result[0]?.avgRisk || 0),
        highRiskInvoices: await Invoice.countDocuments({
          uploadedAt: { $gte: dateFrom },
          riskScore: { $gte: 70 }
        })
      },
      anomalyStats,
      riskDistribution,
      topRiskyInvoices,
      anomalyTrends
    });

  } catch (error) {
    console.error('Anomaly dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get detailed anomalies with filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      severity,
      dateFrom,
      dateTo,
      minConfidence
    } = req.query;

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          anomalies: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$anomalies'
      }
    ];

    // Add filters
    const matchConditions = {};
    
    if (type) matchConditions['anomalies.type'] = type;
    if (severity) matchConditions['anomalies.severity'] = severity;
    if (minConfidence) matchConditions['anomalies.confidence'] = { $gte: parseFloat(minConfidence) };
    
    if (dateFrom || dateTo) {
      matchConditions.uploadedAt = {};
      if (dateFrom) matchConditions.uploadedAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.uploadedAt.$lte = new Date(dateTo);
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add pagination
    pipeline.push(
      { $sort: { 'anomalies.confidence': -1, uploadedAt: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $project: {
          invoiceId: '$_id',
          invoiceNumber: 1,
          vendorName: 1,
          invoiceAmount: 1,
          riskScore: 1,
          uploadedAt: 1,
          anomaly: '$anomalies'
        }
      }
    );

    const anomalies = await Invoice.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [
      {
        $match: {
          anomalies: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$anomalies'
      }
    ];

    if (Object.keys(matchConditions).length > 0) {
      totalPipeline.push({ $match: matchConditions });
    }

    totalPipeline.push({ $count: 'total' });

    const totalResult = await Invoice.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.json({
      anomalies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalAnomalies: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get anomalies error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get anomaly types and their counts
 */
router.get('/types', async (req, res) => {
  try {
    const anomalyTypes = await Invoice.aggregate([
      {
        $match: {
          anomalies: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$anomalies'
      },
      {
        $group: {
          _id: '$anomalies.type',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$anomalies.confidence' },
          severityBreakdown: {
            $push: '$anomalies.severity'
          }
        }
      },
      {
        $addFields: {
          severityStats: {
            $reduce: {
              input: '$severityBreakdown',
              initialValue: { low: 0, medium: 0, high: 0, critical: 0 },
              in: {
                low: {
                  $cond: [{ $eq: ['$$this', 'low'] }, { $add: ['$$value.low', 1] }, '$$value.low']
                },
                medium: {
                  $cond: [{ $eq: ['$$this', 'medium'] }, { $add: ['$$value.medium', 1] }, '$$value.medium']
                },
                high: {
                  $cond: [{ $eq: ['$$this', 'high'] }, { $add: ['$$value.high', 1] }, '$$value.high']
                },
                critical: {
                  $cond: [{ $eq: ['$$this', 'critical'] }, { $add: ['$$value.critical', 1] }, '$$value.critical']
                }
              }
            }
          }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          avgConfidence: { $round: ['$avgConfidence', 2] },
          severityStats: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json(anomalyTypes);

  } catch (error) {
    console.error('Get anomaly types error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark anomaly as resolved
 */
router.put('/:invoiceId/anomalies/:anomalyIndex/resolve', async (req, res) => {
  try {
    const { invoiceId, anomalyIndex } = req.params;
    const { resolution, notes } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const index = parseInt(anomalyIndex);
    if (index < 0 || index >= invoice.anomalies.length) {
      return res.status(400).json({ error: 'Invalid anomaly index' });
    }

    // Mark anomaly as resolved
    invoice.anomalies[index].resolved = true;
    invoice.anomalies[index].resolution = resolution;
    invoice.anomalies[index].resolutionNotes = notes;
    invoice.anomalies[index].resolvedAt = new Date();

    // Recalculate risk score
    invoice.calculateRiskScore();

    await invoice.save();

    res.json({
      message: 'Anomaly marked as resolved',
      anomaly: invoice.anomalies[index]
    });

  } catch (error) {
    console.error('Resolve anomaly error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get vendor risk analysis
 */
router.get('/vendors/risk-analysis', async (req, res) => {
  try {
    const vendorRisks = await Invoice.aggregate([
      {
        $match: {
          processingStatus: 'completed',
          vendorGSTNumber: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$vendorGSTNumber',
          vendorName: { $first: '$vendorName' },
          totalInvoices: { $sum: 1 },
          avgRiskScore: { $avg: '$riskScore' },
          totalAmount: { $sum: '$invoiceAmount' },
          totalAnomalies: { $sum: { $size: '$anomalies' } },
          highRiskInvoices: {
            $sum: {
              $cond: [{ $gte: ['$riskScore', 70] }, 1, 0]
            }
          },
          lastInvoiceDate: { $max: '$uploadedAt' }
        }
      },
      {
        $addFields: {
          riskLevel: {
            $switch: {
              branches: [
                { case: { $gte: ['$avgRiskScore', 70] }, then: 'High' },
                { case: { $gte: ['$avgRiskScore', 30] }, then: 'Medium' }
              ],
              default: 'Low'
            }
          },
          anomalyRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalAnomalies', '$totalInvoices'] }, 100] },
              2
            ]
          }
        }
      },
      {
        $sort: { avgRiskScore: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json(vendorRisks);

  } catch (error) {
    console.error('Vendor risk analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
