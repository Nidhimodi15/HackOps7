# 🚀 Start Email Service - Quick Guide

## 📧 Automatic + Manual Email Reports

### ✅ What You Get:

**1. Automatic Daily Reports** 📅
- Sent every day at **9:00 AM IST**
- Sent every day at **6:00 PM IST** (Digest)
- Sent every **Monday at 10:00 AM IST** (Weekly)

**2. Manual Instant Reports** ⚡
- Send report immediately anytime
- Click button on dashboard
- Or use API endpoint

---

## 🔧 Setup Steps:

### Step 1: Install Dependencies
```bash
cd Backend
npm install nodemailer dotenv node-cron axios
```

### Step 2: Configure Email (.env file)
```bash
# Create .env file in Backend folder
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

**Get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Go to https://myaccount.google.com/apppasswords
4. Generate password for "Mail"
5. Copy 16-character password to .env

### Step 3: Configure Finance Team Emails
Edit `scheduledReports.js`:
```javascript
const FINANCE_TEAM_EMAILS = [
  'finance@iitgn.ac.in',
  'accounts@iitgn.ac.in',
  'cfo@iitgn.ac.in',
  // Add more emails
];
```

### Step 4: Add to Your Server
In your main server file (e.g., `index.js` or `app.js`):

```javascript
require('dotenv').config();
const emailRoutes = require('./emailRoutes');
const scheduledReports = require('./scheduledReports');

// Add email routes
app.use('/api/email', emailRoutes);

// Start scheduled reports
scheduledReports.initializeScheduledReports();

// Server start
app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('📧 Email service is active!');
});
```

### Step 5: Start Server
```bash
node server.js
```

You should see:
```
✅ Daily Report scheduled: Every day at 9:00 AM IST
✅ Daily Digest scheduled: Every day at 6:00 PM IST
✅ Weekly Report scheduled: Every Monday at 10:00 AM IST
📧 Scheduled reports are now active!
```

---

## 📊 Scheduled Reports:

### Daily Report (9:00 AM)
**Contains:**
- Total invoices processed
- Total anomalies detected
- Breakdown: Duplicates, GST Mismatches, Missing GST
- Visual stats cards
- Link to dashboard

### Daily Digest (6:00 PM)
**Contains:**
- Today's invoice count
- Anomalies detected today
- Total amount processed
- Top 5 vendors
- Summary statistics

### Weekly Report (Monday 10:00 AM)
**Contains:**
- Full week summary
- All anomaly types
- Trends and patterns
- Action items

---

## ⚡ Send Immediate Report:

### Method 1: API Call
```bash
curl -X POST http://localhost:3000/api/email/send-immediate \
  -H "Content-Type: application/json"
```

### Method 2: Custom Recipients
```bash
curl -X POST http://localhost:3000/api/email/send-immediate \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["custom@email.com", "another@email.com"]
  }'
```

### Method 3: From Code
```javascript
const scheduledReports = require('./scheduledReports');

// Send to default finance team
await scheduledReports.sendImmediateReport();

// Send to custom emails
await scheduledReports.sendImmediateReport(['custom@email.com']);
```

---

## 🎯 Email Schedule:

```
Monday    10:00 AM  →  Weekly Report
Tuesday    9:00 AM  →  Daily Report
           6:00 PM  →  Daily Digest
Wednesday  9:00 AM  →  Daily Report
           6:00 PM  →  Daily Digest
Thursday   9:00 AM  →  Daily Report
           6:00 PM  →  Daily Digest
Friday     9:00 AM  →  Daily Report
           6:00 PM  →  Daily Digest
Saturday   9:00 AM  →  Daily Report
           6:00 PM  →  Daily Digest
Sunday     9:00 AM  →  Daily Report
           6:00 PM  →  Daily Digest
```

**Plus:** Immediate reports anytime you want!

---

## 🧪 Testing:

### Test Email Configuration:
```bash
curl http://localhost:3000/api/email/test
```

Expected response:
```json
{
  "success": true
}
```

### Send Test Report Now:
```bash
curl -X POST http://localhost:3000/api/email/send-immediate
```

Check your inbox in 5-10 seconds!

---

## 📧 Email Recipients:

**Finance Team Emails** (configured in `scheduledReports.js`):
```javascript
const FINANCE_TEAM_EMAILS = [
  'finance@iitgn.ac.in',      // Finance Head
  'accounts@iitgn.ac.in',     // Accounts Team
  'cfo@iitgn.ac.in',          // CFO
  // Add more as needed
];
```

**All team members receive:**
- ✅ Daily reports automatically
- ✅ Weekly summaries
- ✅ Immediate reports when triggered

---

## 🎨 Email Content:

### Anomaly Report Email:
```
Subject: 🔍 Anomaly Report - 28 Issues Detected

┌─────────────────────────────┐
│ Total Invoices: 28          │
│ Total Anomalies: 28         │
├─────────────────────────────┤
│ 🔴 Duplicates: 19           │
│ 🟠 GST Mismatches: 3        │
│ 🟣 Missing GST: 28          │
├─────────────────────────────┤
│ [View Detailed Report]      │
└─────────────────────────────┘
```

### Daily Digest Email:
```
Subject: 📊 Daily Digest - November 8, 2024

┌─────────────────────────────┐
│ Invoices Processed: 15      │
│ Anomalies Detected: 5       │
│ Total Amount: ₹1,25,000     │
├─────────────────────────────┤
│ Top Vendors:                │
│ 1. Vendor A - 5 invoices    │
│ 2. Vendor B - 3 invoices    │
└─────────────────────────────┘
```

---

## 🔒 Security:

**Email Credentials:**
- ✅ Stored in `.env` file (not in code)
- ✅ Never committed to git
- ✅ Use app passwords (not account password)

**Best Practices:**
- ✅ Enable 2-Step Verification
- ✅ Use Gmail app passwords
- ✅ Limit recipient list
- ✅ Monitor email logs

---

## 🐛 Troubleshooting:

### Emails not sending?
1. Check `.env` file exists
2. Verify EMAIL_USER and EMAIL_PASSWORD
3. Test with: `curl http://localhost:3000/api/email/test`
4. Check server logs for errors

### Wrong time zone?
- Scheduled for IST (Asia/Kolkata)
- Change in `scheduledReports.js` if needed

### Want different schedule?
Edit cron patterns in `scheduledReports.js`:
```javascript
// Format: minute hour day month weekday
'0 9 * * *'    // 9:00 AM daily
'0 18 * * *'   // 6:00 PM daily
'0 10 * * 1'   // 10:00 AM Monday
```

---

## ✅ Checklist:

- [ ] Install: nodemailer, dotenv, node-cron, axios
- [ ] Create `.env` with EMAIL_USER and EMAIL_PASSWORD
- [ ] Get Gmail app password
- [ ] Configure FINANCE_TEAM_EMAILS
- [ ] Add email routes to server
- [ ] Initialize scheduled reports
- [ ] Start server
- [ ] Test with immediate report
- [ ] Verify email received
- [ ] Wait for scheduled reports

---

## 📞 Quick Commands:

```bash
# Install dependencies
npm install nodemailer dotenv node-cron axios

# Test email config
curl http://localhost:3000/api/email/test

# Send immediate report
curl -X POST http://localhost:3000/api/email/send-immediate

# Check server logs
# Look for: "✅ Report sent to..."
```

---

**🎉 Once configured, finance team will receive automatic daily reports + you can send immediate reports anytime!**
