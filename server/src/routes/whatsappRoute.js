const express = require('express');
const { protect, ownerOnly } = require('../middlewares/auth');
const { verifyWebhook, handleWebhook } = require('../controllers/webhookController');
const {
  connectEmbeddedSignup,
  getConnectionStatus,
  sendTestMessage,
} = require('../controllers/whatsappController');

const router = express.Router();

router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

router.use(protect);
router.get('/connection', ownerOnly, getConnectionStatus);
router.post('/connect', ownerOnly, connectEmbeddedSignup);
router.post('/test-message', ownerOnly, sendTestMessage);

module.exports = router;
