const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

const rawBodySaver = (req, res, buf) => {
  if (buf?.length) {
    req.rawBody = buf.toString('utf8');
  }
};

// ================= MIDDLEWARES =================
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ verify: rawBodySaver }));

// ================= API ROUTES =================
app.use('/api/auth', require('./src/routes/authRoute'));
app.use('/api/leads', require('./src/routes/leadRoute'));
app.use('/api/webhook', require('./src/routes/webhookRoute'));
app.use('/api/whatsapp', require('./src/routes/whatsappRoute'));
app.use('/api/messages', require('./src/routes/messageRoute'));
app.use('/api/agents', require('./src/routes/agentRoute'));
app.use('/api/analytics', require('./src/routes/analyticRoute'));
app.use('/api/templates', require('./src/routes/templateRoute'));

// ================= HEALTH CHECK =================
app.get('/api/health', (req, res) => {
  res.json({ message: 'WhatsApp CRM Server is running!' });
});

// ================= SERVE FRONTEND =================
app.use(express.static(path.join(__dirname, '../client/dist')));

// ================= FALLBACK (FIXED ✅) =================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

module.exports = app;
