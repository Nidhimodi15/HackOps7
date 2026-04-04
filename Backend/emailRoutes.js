/**
 * Email API Routes
 * Endpoints for sending reports and notifications
 */

const express = require('express');
const router = express.Router();
const emailService = require('./emailService');

/**
 * POST /api/email/send-report
 * Send anomaly report to specified email
 */
router.post('/send-report', async (req, res) => {
  try {
    const { email, reportData } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const result = await emailService.sendAnomalyReport(email, reportData);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/send-digest
 * Send daily digest
 */
router.post('/send-digest', async (req, res) => {
  try {
    const { email, digestData } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const result = await emailService.sendDailyDigest(email, digestData);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/send-alert
 * Send high priority alert
 */
router.post('/send-alert', async (req, res) => {
  try {
    const { email, alertData } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const result = await emailService.sendHighPriorityAlert(email, alertData);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/email/test
 * Test email configuration
 */
router.get('/test', async (req, res) => {
  try {
    const result = await emailService.testEmailConfig();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/send-immediate
 * Send immediate report to finance team
 */
router.post('/send-immediate', async (req, res) => {
  try {
    const scheduledReports = require('./scheduledReports');
    const { emails } = req.body;
    
    // Use provided emails or default to finance team
    const recipients = emails || scheduledReports.FINANCE_TEAM_EMAILS;
    
    const results = await scheduledReports.sendImmediateReport(recipients);
    
    res.json({
      success: true,
      message: 'Immediate reports sent',
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
