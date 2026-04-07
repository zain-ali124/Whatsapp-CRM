const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// ================= MIDDLEWARES =================
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// ================= API ROUTES =================
app.use('/api/auth', require('./src/routes/authRoute'));
app.use('/api/leads', require('./src/routes/leadRoute'));
app.use('/api/webhook', require('./src/routes/webhookRoute'));
app.use('/api/messages', require('./src/routes/messageRoute'));
app.use('/api/agents', require('./src/routes/agentRoute'));
app.use('/api/analytics', require('./src/routes/analyticRoute'));
app.use('/api/templates', require('./src/routes/templateRoute'));

// ================= HEALTH CHECK =================
app.get('/api/health', (req, res) => {
  res.json({ message: 'WhatsApp CRM Server is running!' });
});

// ================= FRONTEND SERVING =================

// 1. Serve React static files
app.use(express.static(path.join(__dirname, 'client/build')));

// 2. Catch-all route (Express 5 SAFE ✅)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// ================= EXPORT =================
module.exports = app;
