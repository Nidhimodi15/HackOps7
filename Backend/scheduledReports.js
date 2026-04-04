/**
 * Scheduled Email Reports
 * Automatically sends reports to finance team at specific times
 */

const cron = require('node-cron');
const emailService = require('./emailService');
const axios = require('axios');

// Finance team email addresses (configure these)
const FINANCE_TEAM_EMAILS = [
  'nidhimodi970@gmail.com',   // Primary recipient
  // Add more finance team emails as needed:
  // 'finance@company.com',
];

/**
 * Fetch dashboard stats from API
 */
async function getDashboardStats() {
  try {
    const response = await axios.get('http://localhost:8000/api/dashboard/stats');
    return response.data.stats || {};
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    return {};
  }
}

/**
 * Fetch anomaly counts
 */
async function getAnomalyCounts() {
  try {
    const response = await axios.get('http://localhost:8000/api/anomalies');
    const anomalies = response.data.anomalies || [];

    const counts = {
      duplicates: 0,
      gstMismatches: 0,
      missingGst: 0,
      total: anomalies.length
    };

    anomalies.forEach(anomaly => {
      if (anomaly.anomalyType === 'DUPLICATE_INVOICE') counts.duplicates++;
      if (anomaly.anomalyType === 'GST_VENDOR_MISMATCH') counts.gstMismatches++;
      if (anomaly.anomalyType === 'MISSING_GST') counts.missingGst++;
    });

    return counts;
  } catch (error) {
    console.error('Error fetching anomaly counts:', error.message);
    return { duplicates: 0, gstMismatches: 0, missingGst: 0, total: 0 };
  }
}

/**
 * Fetch invoice history
 */
async function getInvoiceHistory() {
  try {
    const response = await axios.get('http://localhost:8000/api/invoices/history');
    return response.data.invoices || [];
  } catch (error) {
    console.error('Error fetching invoice history:', error.message);
    return [];
  }
}

/**
 * Send daily report to all finance team members
 */
async function sendDailyReportToTeam() {
  console.log('\n📧 Sending daily report to finance team...');

  try {
    // Fetch data
    const stats = await getDashboardStats();
    const anomalyCounts = await getAnomalyCounts();
    const invoices = await getInvoiceHistory();

    // Prepare report data
    const reportData = {
      totalAnomalies: anomalyCounts.total,
      duplicates: anomalyCounts.duplicates,
      gstMismatches: anomalyCounts.gstMismatches,
      missingGst: anomalyCounts.missingGst,
      period: 'Last 30 Days',
      invoiceCount: stats.totalInvoices || 0
    };

    // Send to each team member
    for (const email of FINANCE_TEAM_EMAILS) {
      try {
        const result = await emailService.sendAnomalyReport(email, reportData);
        if (result.success) {
          console.log(`✅ Report sent to ${email}`);
        } else {
          console.log(`❌ Failed to send to ${email}: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Error sending to ${email}: ${error.message}`);
      }
    }

    console.log('📧 Daily report sending completed!\n');
  } catch (error) {
    console.error('❌ Error in daily report:', error.message);
  }
}

/**
 * Send daily digest to team
 */
async function sendDailyDigestToTeam() {
  console.log('\n📊 Sending daily digest to finance team...');

  try {
    const stats = await getDashboardStats();
    const anomalyCounts = await getAnomalyCounts();
    const invoices = await getInvoiceHistory();

    // Get top vendors from today's invoices
    const today = new Date().toISOString().split('T')[0];
    const todayInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.uploadDate).toISOString().split('T')[0];
      return invDate === today;
    });

    const vendorCounts = {};
    todayInvoices.forEach(inv => {
      const vendor = inv.vendorName || 'Unknown';
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    });

    const topVendors = Object.entries(vendorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const digestData = {
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      invoicesProcessed: todayInvoices.length,
      anomaliesDetected: anomalyCounts.total,
      totalAmount: stats.totalAmountProcessed || 0,
      topVendors: topVendors
    };

    // Send to each team member
    for (const email of FINANCE_TEAM_EMAILS) {
      try {
        const result = await emailService.sendDailyDigest(email, digestData);
        if (result.success) {
          console.log(`✅ Digest sent to ${email}`);
        } else {
          console.log(`❌ Failed to send to ${email}: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Error sending to ${email}: ${error.message}`);
      }
    }

    console.log('📊 Daily digest sending completed!\n');
  } catch (error) {
    console.error('❌ Error in daily digest:', error.message);
  }
}

/**
 * Initialize scheduled reports
 */
function initializeScheduledReports() {
  console.log('🕐 Initializing scheduled email reports...\n');

  // Daily Report - Every day at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ Triggered: Daily Report (9:00 AM)');
    sendDailyReportToTeam();
  }, {
    timezone: "Asia/Kolkata"
  });
  console.log('✅ Daily Report scheduled: Every day at 9:00 AM IST');

  // Daily Digest - Every day at 6:00 PM
  cron.schedule('0 18 * * *', () => {
    console.log('⏰ Triggered: Daily Digest (6:00 PM)');
    sendDailyDigestToTeam();
  }, {
    timezone: "Asia/Kolkata"
  });
  console.log('✅ Daily Digest scheduled: Every day at 6:00 PM IST');

  // Weekly Report - Every Monday at 10:00 AM
  cron.schedule('0 10 * * 1', () => {
    console.log('⏰ Triggered: Weekly Report (Monday 10:00 AM)');
    sendDailyReportToTeam();
  }, {
    timezone: "Asia/Kolkata"
  });
  console.log('✅ Weekly Report scheduled: Every Monday at 10:00 AM IST');

  console.log('\n📧 Scheduled reports are now active!');
  console.log('📧 Finance team will receive emails automatically.\n');
}

/**
 * Send immediate report (manual trigger)
 */
async function sendImmediateReport(recipientEmails = FINANCE_TEAM_EMAILS) {
  console.log('\n📧 Sending immediate report...');

  try {
    const stats = await getDashboardStats();
    const anomalyCounts = await getAnomalyCounts();

    const reportData = {
      totalAnomalies: anomalyCounts.total,
      duplicates: anomalyCounts.duplicates,
      gstMismatches: anomalyCounts.gstMismatches,
      missingGst: anomalyCounts.missingGst,
      period: 'Current Status',
      invoiceCount: stats.totalInvoices || 0
    };

    const results = [];
    for (const email of recipientEmails) {
      try {
        const result = await emailService.sendAnomalyReport(email, reportData);
        results.push({ email, success: result.success });
        if (result.success) {
          console.log(`✅ Immediate report sent to ${email}`);
        }
      } catch (error) {
        results.push({ email, success: false, error: error.message });
        console.log(`❌ Failed to send to ${email}`);
      }
    }

    console.log('📧 Immediate report sending completed!\n');
    return results;
  } catch (error) {
    console.error('❌ Error in immediate report:', error.message);
    return [];
  }
}

module.exports = {
  initializeScheduledReports,
  sendDailyReportToTeam,
  sendDailyDigestToTeam,
  sendImmediateReport,
  FINANCE_TEAM_EMAILS
};
