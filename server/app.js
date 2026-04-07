const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Middlewares
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

// ================= FRONTEND (IMPORTANT) =================

// 1. Serve static files (React build)
app.use(express.static(path.join(__dirname, 'client/build')));

// 2. Catch-all route (VERY IMPORTANT)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// ================= TEST ROUTE =================
app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp CRM Server is running!' });
});

module.exports = app;
