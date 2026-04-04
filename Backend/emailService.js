/**
 * Email Service using Nodemailer
 * Sends reports, alerts, and notifications
 */

const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
  service: 'gmail', // or 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
};

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

/**
 * Send Anomaly Report Email
 */
async function sendAnomalyReport(recipientEmail, reportData) {
  try {
    const { 
      totalAnomalies, 
      duplicates, 
      gstMismatches, 
      missingGst,
      period,
      invoiceCount 
    } = reportData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stat-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-title { font-size: 14px; color: #666; margin-bottom: 5px; }
          .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
          .anomaly-section { margin-top: 20px; }
          .anomaly-item { display: flex; justify-content: space-between; padding: 12px; background: white; margin: 8px 0; border-radius: 6px; border-left: 4px solid #ef4444; }
          .high-severity { border-left-color: #ef4444; }
          .medium-severity { border-left-color: #f59e0b; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔍 FINTEL AI Anomaly Report</h1>
            <p>Invoice Compliance Analysis - ${period}</p>
          </div>
          
          <div class="content">
            <div class="stat-card">
              <div class="stat-title">Total Invoices Processed</div>
              <div class="stat-value">${invoiceCount}</div>
            </div>

            <div class="stat-card">
              <div class="stat-title">Total Anomalies Detected</div>
              <div class="stat-value" style="color: ${totalAnomalies > 0 ? '#ef4444' : '#10b981'};">${totalAnomalies}</div>
            </div>

            <div class="anomaly-section">
              <h2>📊 Anomaly Breakdown</h2>
              
              <div class="anomaly-item high-severity">
                <div>
                  <strong>🔴 Duplicate Invoices</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Same invoice number detected multiple times</p>
                </div>
                <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${duplicates}</div>
              </div>

              <div class="anomaly-item high-severity">
                <div>
                  <strong>🟠 GST Vendor Mismatches</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">GST number used by different vendors</p>
                </div>
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${gstMismatches}</div>
              </div>

              <div class="anomaly-item high-severity">
                <div>
                  <strong>🟣 Missing GST Numbers</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Invoices without GST identification</p>
                </div>
                <div style="font-size: 24px; font-weight: bold; color: #a855f7;">${missingGst}</div>
              </div>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
              <strong>⚠️ Action Required:</strong>
              <p style="margin: 10px 0 0 0;">Please review the detected anomalies and take necessary corrective actions to ensure compliance.</p>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated report from FINTEL AI</p>
            <p>© 2025 IIT Gandhinagar - Invoice Compliance System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"FINTEL AI" <${EMAIL_CONFIG.auth.user}>`,
      to: recipientEmail,
      subject: `🔍 Anomaly Report - ${totalAnomalies} Issues Detected (${period})`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Daily Digest Email
 */
async function sendDailyDigest(recipientEmail, digestData) {
  try {
    const { 
      date,
      invoicesProcessed,
      anomaliesDetected,
      topVendors,
      totalAmount 
    } = digestData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-value { font-size: 28px; font-weight: bold; color: #667eea; }
          .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
          .vendor-list { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
          .vendor-item { padding: 10px; border-bottom: 1px solid #eee; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Digest</h1>
            <p>${date}</p>
          </div>
          
          <div class="content">
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-value">${invoicesProcessed}</div>
                <div class="stat-label">Invoices Processed</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" style="color: ${anomaliesDetected > 0 ? '#ef4444' : '#10b981'};">${anomaliesDetected}</div>
                <div class="stat-label">Anomalies Detected</div>
              </div>
            </div>

            <div class="stat-card" style="margin-top: 15px;">
              <div class="stat-value">₹${totalAmount.toLocaleString()}</div>
              <div class="stat-label">Total Amount Processed</div>
            </div>

            <div class="vendor-list">
              <h3>Top Vendors Today</h3>
              ${topVendors.map((vendor, index) => `
                <div class="vendor-item">
                  <strong>${index + 1}. ${vendor.name}</strong>
                  <span style="float: right; color: #667eea;">${vendor.count} invoices</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="footer">
            <p>FINTEL AI - Automated Daily Report</p>
            <p>© 2024 IIT Gandhinagar</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"FINTEL AI" <${EMAIL_CONFIG.auth.user}>`,
      to: recipientEmail,
      subject: `📊 Daily Digest - ${date}`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Daily digest sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send High Priority Alert
 */
async function sendHighPriorityAlert(recipientEmail, alertData) {
  try {
    const { anomalyType, invoiceNumber, vendorName, description } = alertData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert-box { background: #fee; border: 2px solid #ef4444; border-radius: 10px; padding: 30px; }
          .alert-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
          .alert-title { font-size: 24px; font-weight: bold; color: #ef4444; text-align: center; margin-bottom: 20px; }
          .detail-row { padding: 12px; background: white; margin: 10px 0; border-radius: 6px; }
          .detail-label { font-weight: bold; color: #666; }
          .btn { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert-box">
            <div class="alert-icon">🚨</div>
            <div class="alert-title">High Priority Anomaly Detected!</div>
            
            <div class="detail-row">
              <div class="detail-label">Anomaly Type:</div>
              <div>${anomalyType}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Invoice Number:</div>
              <div>${invoiceNumber}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Vendor:</div>
              <div>${vendorName}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Description:</div>
              <div>${description}</div>
            </div>

            <div style="text-align: center;">
              <a href="http://localhost:8080/anomalies" class="btn">Review Immediately</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"FINTEL AI Alert" <${EMAIL_CONFIG.auth.user}>`,
      to: recipientEmail,
      subject: `🚨 URGENT: High Priority Anomaly - ${anomalyType}`,
      html: htmlContent,
      priority: 'high'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Alert sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email server is ready');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAnomalyReport,
  sendDailyDigest,
  sendHighPriorityAlert,
  testEmailConfig
};
