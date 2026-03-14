const express = require('express');
const router  = express.Router();
const { verifyWebhook, handleWebhook } = require('../controllers/webhookController');

// Meta calls GET to verify your webhook endpoint
router.get('/whatsapp', verifyWebhook);

// Meta sends all events here (messages, status updates)
// NOTE: No auth middleware — Meta doesn't send your JWT
router.post('/whatsapp', handleWebhook);

module.exports = router;
