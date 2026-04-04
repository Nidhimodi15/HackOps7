const express = require('express');
const Invoice = require('../models/Invoice');

const router = express.Router();

/**
 * Natural Language Query Processing
 */
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('🤖 FINTEL AI Chat Query:', query);

    // Parse the natural language query
    const parsedQuery = parseNaturalLanguageQuery(query.toLowerCase());
    
    // Execute the parsed query
    const result = await executeQuery(parsedQuery);
    
    // Format response
    const response = formatChatResponse(parsedQuery, result);

    res.json({
      query: query,
      parsedIntent: parsedQuery.intent,
      response: response,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat query error:', error);
    res.status(500).json({ 
      error: 'Sorry, I encountered an error processing your query.',
      details: error.message 
    });
  }
});

/**
 * Get chat suggestions based on current data
 */
router.get('/suggestions', async (req, res) => {
  try {
    // Get recent statistics for suggestions
    const recentStats = await getRecentStatistics();
    
    const suggestions = [
      "Show me top 5 anomalies this week",
      "What are the high-risk invoices today?",
      "Show duplicate invoices from last month",
      "Which vendors have the highest risk scores?",
      "Show me GST validation failures",
      "What's the total amount of flagged invoices?",
      `Show invoices with risk score above 80`,
      "List all price anomalies this month",
      "Show me arithmetic errors in invoices"
    ];

    // Add dynamic suggestions based on data
    if (recentStats.highRiskCount > 0) {
      suggestions.unshift(`Show me ${recentStats.highRiskCount} high-risk invoices`);
    }

    if (recentStats.duplicateCount > 0) {
      suggestions.unshift(`Show me ${recentStats.duplicateCount} duplicate invoices`);
    }

    res.json({
      suggestions: suggestions.slice(0, 8),
      recentStats
    });

  } catch (error) {
    console.error('Chat suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Parse natural language query into structured intent
 */
function parseNaturalLanguageQuery(query) {
  const intent = {
    action: 'unknown',
    entity: 'invoice',
    filters: {},
    limit: 10,
    sortBy: 'riskScore',
    sortOrder: -1
  };

  // Action detection
  if (query.includes('show') || query.includes('list') || query.includes('get') || query.includes('find')) {
    intent.action = 'show';
  } else if (query.includes('count') || query.includes('how many')) {
    intent.action = 'count';
  } else if (query.includes('total') || query.includes('sum')) {
    intent.action = 'sum';
  } else if (query.includes('average') || query.includes('avg')) {
    intent.action = 'average';
  }

  // Entity detection
  if (query.includes('anomal')) {
    intent.entity = 'anomaly';
  } else if (query.includes('duplicate')) {
    intent.entity = 'duplicate';
    intent.filters.anomalyType = 'duplicate';
  } else if (query.includes('vendor')) {
    intent.entity = 'vendor';
  } else if (query.includes('gst')) {
    intent.entity = 'gst';
  }

  // Number extraction
  const numbers = query.match(/\d+/g);
  if (numbers) {
    const firstNumber = parseInt(numbers[0]);
    
    // Check if it's a limit (top X, first X)
    if (query.includes('top') || query.includes('first') || query.includes('show me')) {
      intent.limit = firstNumber;
    }
    
    // Check if it's a risk score threshold
    if (query.includes('risk') && query.includes('above')) {
      intent.filters.riskScore = { $gte: firstNumber };
    } else if (query.includes('risk') && query.includes('below')) {
      intent.filters.riskScore = { $lt: firstNumber };
    }
  }

  // Risk level detection
  if (query.includes('high risk') || query.includes('high-risk')) {
    intent.filters.riskScore = { $gte: 70 };
  } else if (query.includes('medium risk')) {
    intent.filters.riskScore = { $gte: 30, $lt: 70 };
  } else if (query.includes('low risk')) {
    intent.filters.riskScore = { $lt: 30 };
  }

  // Anomaly type detection
  if (query.includes('price') && query.includes('anomal')) {
    intent.filters.anomalyType = 'price_outlier';
  } else if (query.includes('arithmetic') || query.includes('calculation')) {
    intent.filters.anomalyType = 'arithmetic_error';
  } else if (query.includes('gst') && query.includes('mismatch')) {
    intent.filters.anomalyType = 'gst_mismatch';
  }

  // Time period detection
  if (query.includes('today')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    intent.filters.uploadedAt = { $gte: today };
  } else if (query.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    intent.filters.uploadedAt = { $gte: yesterday, $lt: today };
  } else if (query.includes('this week')) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    intent.filters.uploadedAt = { $gte: weekStart };
  } else if (query.includes('this month')) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    intent.filters.uploadedAt = { $gte: monthStart };
  } else if (query.includes('last month')) {
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);
    
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(1);
    lastMonthEnd.setHours(0, 0, 0, 0);
    
    intent.filters.uploadedAt = { $gte: lastMonthStart, $lt: lastMonthEnd };
  }

  return intent;
}

/**
 * Execute the parsed query
 */
async function executeQuery(intent) {
  try {
    switch (intent.entity) {
      case 'anomaly':
        return await executeAnomalyQuery(intent);
      case 'duplicate':
        return await executeDuplicateQuery(intent);
      case 'vendor':
        return await executeVendorQuery(intent);
      case 'gst':
        return await executeGSTQuery(intent);
      default:
        return await executeInvoiceQuery(intent);
    }
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

/**
 * Execute anomaly-specific queries
 */
async function executeAnomalyQuery(intent) {
  const pipeline = [
    {
      $match: {
        anomalies: { $exists: true, $ne: [] },
        ...intent.filters
      }
    },
    {
      $unwind: '$anomalies'
    }
  ];

  // Add anomaly type filter if specified
  if (intent.filters.anomalyType) {
    pipeline.push({
      $match: { 'anomalies.type': intent.filters.anomalyType }
    });
  }

  if (intent.action === 'count') {
    pipeline.push({ $count: 'total' });
    const result = await Invoice.aggregate(pipeline);
    return { count: result[0]?.total || 0 };
  }

  pipeline.push(
    { $sort: { 'anomalies.confidence': -1, uploadedAt: -1 } },
    { $limit: intent.limit },
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

  return await Invoice.aggregate(pipeline);
}

/**
 * Execute duplicate-specific queries
 */
async function executeDuplicateQuery(intent) {
  const filter = {
    'anomalies.type': 'duplicate',
    ...intent.filters
  };

  if (intent.action === 'count') {
    const count = await Invoice.countDocuments(filter);
    return { count };
  }

  return await Invoice.find(filter)
    .sort({ riskScore: -1 })
    .limit(intent.limit)
    .select('invoiceNumber vendorName invoiceAmount riskScore anomalies uploadedAt');
}

/**
 * Execute vendor-specific queries
 */
async function executeVendorQuery(intent) {
  const pipeline = [
    {
      $match: {
        processingStatus: 'completed',
        vendorGSTNumber: { $exists: true, $ne: null },
        ...intent.filters
      }
    },
    {
      $group: {
        _id: '$vendorGSTNumber',
        vendorName: { $first: '$vendorName' },
        totalInvoices: { $sum: 1 },
        avgRiskScore: { $avg: '$riskScore' },
        totalAmount: { $sum: '$invoiceAmount' },
        totalAnomalies: { $sum: { $size: '$anomalies' } }
      }
    },
    {
      $sort: { avgRiskScore: -1 }
    },
    {
      $limit: intent.limit
    }
  ];

  return await Invoice.aggregate(pipeline);
}

/**
 * Execute GST-specific queries
 */
async function executeGSTQuery(intent) {
  const filter = {
    $or: [
      { 'validationResults.vendorGSTValid': false },
      { 'validationResults.companyGSTValid': false }
    ],
    ...intent.filters
  };

  if (intent.action === 'count') {
    const count = await Invoice.countDocuments(filter);
    return { count };
  }

  return await Invoice.find(filter)
    .sort({ riskScore: -1 })
    .limit(intent.limit)
    .select('invoiceNumber vendorName vendorGSTNumber companyGSTNumber validationResults riskScore uploadedAt');
}

/**
 * Execute general invoice queries
 */
async function executeInvoiceQuery(intent) {
  if (intent.action === 'count') {
    const count = await Invoice.countDocuments(intent.filters);
    return { count };
  }

  if (intent.action === 'sum') {
    const result = await Invoice.aggregate([
      { $match: intent.filters },
      { $group: { _id: null, total: { $sum: '$invoiceAmount' } } }
    ]);
    return { total: result[0]?.total || 0 };
  }

  if (intent.action === 'average') {
    const result = await Invoice.aggregate([
      { $match: intent.filters },
      { $group: { _id: null, average: { $avg: '$invoiceAmount' } } }
    ]);
    return { average: result[0]?.average || 0 };
  }

  return await Invoice.find(intent.filters)
    .sort({ [intent.sortBy]: intent.sortOrder })
    .limit(intent.limit)
    .select('invoiceNumber vendorName invoiceAmount riskScore anomalies uploadedAt');
}

/**
 * Format chat response based on query and results
 */
function formatChatResponse(intent, result) {
  if (intent.action === 'count') {
    return `I found ${result.count} ${intent.entity}${result.count !== 1 ? 's' : ''} matching your criteria.`;
  }

  if (intent.action === 'sum') {
    return `The total amount is ₹${result.total.toLocaleString('en-IN')}.`;
  }

  if (intent.action === 'average') {
    return `The average amount is ₹${result.average.toLocaleString('en-IN')}.`;
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return `I didn't find any ${intent.entity}s matching your criteria.`;
    }

    const count = Math.min(result.length, intent.limit);
    let response = `Here are the top ${count} ${intent.entity}${count !== 1 ? 's' : ''}:\n\n`;

    result.forEach((item, index) => {
      if (intent.entity === 'anomaly') {
        response += `${index + 1}. **${item.invoiceNumber}** - ${item.anomaly.description} (Confidence: ${item.anomaly.confidence.toFixed(1)}%)\n`;
      } else if (intent.entity === 'vendor') {
        response += `${index + 1}. **${item.vendorName || 'Unknown'}** - Risk Score: ${item.avgRiskScore.toFixed(1)}, Invoices: ${item.totalInvoices}\n`;
      } else {
        response += `${index + 1}. **${item.invoiceNumber}** - ₹${item.invoiceAmount.toLocaleString('en-IN')} (Risk: ${item.riskScore})\n`;
      }
    });

    return response;
  }

  return 'Here are the results for your query.';
}

/**
 * Get recent statistics for suggestions
 */
async function getRecentStatistics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [highRiskCount, duplicateCount, totalToday] = await Promise.all([
    Invoice.countDocuments({ riskScore: { $gte: 70 }, uploadedAt: { $gte: today } }),
    Invoice.countDocuments({ 'anomalies.type': 'duplicate', uploadedAt: { $gte: today } }),
    Invoice.countDocuments({ uploadedAt: { $gte: today } })
  ]);

  return {
    highRiskCount,
    duplicateCount,
    totalToday
  };
}

module.exports = router;
