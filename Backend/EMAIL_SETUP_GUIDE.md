# 📧 Email Service Setup Guide

## 🚀 Quick Setup

### 1. Install Nodemailer
```bash
cd Backend
npm install nodemailer dotenv
```

### 2. Configure Email Credentials

#### For Gmail (Recommended):

**Step 1:** Enable 2-Step Verification
- Go to https://myaccount.google.com/security
- Enable "2-Step Verification"

**Step 2:** Generate App Password
- Go to https://myaccount.google.com/apppasswords
- Select "Mail" and your device
- Copy the 16-character password

**Step 3:** Create `.env` file
```bash
# In Backend folder
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # 16-character app password
```

#### For Outlook/Hotmail:
```bash
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### For Yahoo:
```bash
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

### 3. Update server.js

Add these lines to your server.js:

```javascript
require('dotenv').config();
const emailRoutes = require('./emailRoutes');

// Add email routes
app.use('/api/email', emailRoutes);
```

### 4. Test Email Configuration

```bash
# Test if email is configured correctly
curl http://localhost:3000/api/email/test
```

---

## 📊 Available Email Types

### 1. Anomaly Report
**Endpoint:** `POST /api/email/send-report`

**Request Body:**
```json
{
  "email": "recipient@example.com",
  "reportData": {
    "totalAnomalies": 28,
    "duplicates": 19,
    "gstMismatches": 3,
    "missingGst": 28,
    "period": "Last 30 Days",
    "invoiceCount": 28
  }
}
```

**Features:**
- ✅ Total anomaly count
- ✅ Breakdown by type
- ✅ Visual stats cards
- ✅ Call-to-action button
- ✅ Professional HTML design

---

### 2. Daily Digest
**Endpoint:** `POST /api/email/send-digest`

**Request Body:**
```json
{
  "email": "recipient@example.com",
  "digestData": {
    "date": "November 8, 2024",
    "invoicesProcessed": 15,
    "anomaliesDetected": 5,
    "totalAmount": 125000,
    "topVendors": [
      { "name": "Vendor A", "count": 5 },
      { "name": "Vendor B", "count": 3 }
    ]
  }
}
```

**Features:**
- ✅ Daily statistics
- ✅ Top vendors list
- ✅ Total amount processed
- ✅ Anomaly summary

---

### 3. High Priority Alert
**Endpoint:** `POST /api/email/send-alert`

**Request Body:**
```json
{
  "email": "recipient@example.com",
  "alertData": {
    "anomalyType": "DUPLICATE_INVOICE",
    "invoiceNumber": "INV-2024-001",
    "vendorName": "ABC Corp",
    "description": "Duplicate invoice detected"
  }
}
```

**Features:**
- ✅ Urgent notification
- ✅ High priority flag
- ✅ Immediate action required
- ✅ Red alert design

---

## 🧪 Testing

### Test Email Configuration:
```bash
curl http://localhost:3000/api/email/test
```

### Send Test Report:
```bash
curl -X POST http://localhost:3000/api/email/send-report \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@gmail.com",
    "reportData": {
      "totalAnomalies": 28,
      "duplicates": 19,
      "gstMismatches": 3,
      "missingGst": 28,
      "period": "Last 30 Days",
      "invoiceCount": 28
    }
  }'
```

---

## 🎨 Email Templates

All emails include:
- ✅ Professional HTML design
- ✅ Responsive layout
- ✅ Color-coded severity
- ✅ Company branding
- ✅ Call-to-action buttons
- ✅ Mobile-friendly

---

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for reference

2. **Use App Passwords**
   - Don't use your actual email password
   - Generate app-specific passwords

3. **Limit Email Rate**
   - Implement rate limiting
   - Avoid spam filters

4. **Validate Recipients**
   - Verify email addresses
   - Check domain validity

---

## 📅 Scheduled Reports (Optional)

### Using node-cron for automated reports:

```bash
npm install node-cron
```

```javascript
const cron = require('node-cron');
const emailService = require('./emailService');

// Send daily digest at 9 AM
cron.schedule('0 9 * * *', async () => {
  const digestData = await getDailyStats();
  await emailService.sendDailyDigest('admin@example.com', digestData);
});

// Send weekly report every Monday at 10 AM
cron.schedule('0 10 * * 1', async () => {
  const reportData = await getWeeklyStats();
  await emailService.sendAnomalyReport('admin@example.com', reportData);
});
```

---

## 🐛 Troubleshooting

### Error: "Invalid login"
- ✅ Check email and password in `.env`
- ✅ Use app password, not account password
- ✅ Enable 2-Step Verification for Gmail

### Error: "Connection timeout"
- ✅ Check internet connection
- ✅ Verify firewall settings
- ✅ Try different email service

### Error: "Message rejected"
- ✅ Check recipient email validity
- ✅ Avoid spam trigger words
- ✅ Verify sender reputation

---

## 📞 Support

For issues or questions:
- Check Nodemailer docs: https://nodemailer.com
- Gmail app passwords: https://support.google.com/accounts/answer/185833
- Outlook setup: https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings

---

## ✅ Checklist

- [ ] Install nodemailer and dotenv
- [ ] Create `.env` file with credentials
- [ ] Generate app password (Gmail)
- [ ] Add email routes to server.js
- [ ] Test email configuration
- [ ] Send test report
- [ ] Verify email received
- [ ] Configure scheduled reports (optional)

---

**Ready to send beautiful email reports!** 📧✨
