const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Import routes
const invoiceRoutes = require('./routes/invoiceRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');
const chatRoutes = require('./routes/chatRoutes');
const emailRoutes = require('./emailRoutes');
const scheduledReports = require('./scheduledReports');
const { router: authRoutes } = require('./authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/fintel-ai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🚀 FINTEL AI: Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/email', emailRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'FINTEL AI is running!', 
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      ocr: 'Ready',
      ai_engine: 'Active'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('FINTEL AI Error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message 
  });
});

app.listen(PORT, () => {
  console.log(`
  🤖 FINTEL AI Agent Started Successfully!
  🌐 Server running on: http://localhost:${PORT}
  📊 Dashboard: http://localhost:${PORT}/api/health
  🔍 OCR Engine: Ready
  🧠 AI Engine: Active
  💾 Database: MongoDB Connected
  📧 Email Service: Active
  `);
  
  // Initialize scheduled email reports
  scheduledReports.initializeScheduledReports();
});

module.exports = app;
