const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/auth');
const { getMessages, sendMessage } = require('../controllers/messageController');

router.use(protect);

// ✅ CRITICAL: /send must be registered BEFORE /:leadId
// If /:leadId comes first, Express matches POST /send with leadId = "send"
router.post('/send',   sendMessage);   // POST /api/messages/send
router.get('/:leadId', getMessages);   // GET  /api/messages/:leadId

module.exports = router;