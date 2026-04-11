const axios = require('axios');
const User = require('../models/User');
const { decryptSecret } = require('../services/cryptoService');
const {
  GRAPH_BASE_URL,
  getAppSecretProof,
  exchangeCodeForAccessToken,
  upsertWhatsAppConnection,
  getTenantWhatsAppConnection,
  markConnectionNeedsReauth,
} = require('../services/metaEmbeddedSignupService');

function getWebhookUrl(req) {
  return `${req.protocol}://${req.get('host')}/api/whatsapp/webhook`;
}

exports.connectEmbeddedSignup = async (req, res) => {
  try {
    const { code, waba_id: wabaId, phone_number_id: phoneNumberId, business_id: metaBusinessId } = req.body;

    if (!code || !wabaId || !phoneNumberId) {
      return res.status(400).json({ message: 'code, waba_id, and phone_number_id are required' });
    }

    const accessToken = await exchangeCodeForAccessToken(code);
    const connection = await upsertWhatsAppConnection({
      tenantId: req.scope.businessId,
      metaBusinessId,
      wabaId,
      phoneNumberId,
      accessToken,
    });

    await User.findByIdAndUpdate(req.scope.businessId, {
      waWabaId: wabaId,
      waPhoneNumberId: phoneNumberId,
    });

    return res.status(201).json({
      message: 'WhatsApp Business connected successfully',
      connection: {
        businessName: connection.businessName,
        displayPhoneNumber: connection.displayPhoneNumber,
        verifiedName: connection.verifiedName,
        metaBusinessId: connection.metaBusinessId,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        status: connection.status,
        tokenLastValidatedAt: connection.tokenLastValidatedAt,
        webhookSubscribedAt: connection.webhookSubscribedAt,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error.response?.data?.error?.message || error.message || 'Could not complete Meta Embedded Signup',
    });
  }
};

exports.getConnectionStatus = async (req, res) => {
  try {
    const connection = await getTenantWhatsAppConnection(req.scope.businessId);

    return res.json({
      connected: Boolean(connection),
      webhookUrl: getWebhookUrl(req),
      connection: connection
        ? {
            businessName: connection.businessName,
            displayPhoneNumber: connection.displayPhoneNumber,
            verifiedName: connection.verifiedName,
            metaBusinessId: connection.metaBusinessId,
            wabaId: connection.wabaId,
            phoneNumberId: connection.phoneNumberId,
            status: connection.status,
            lastError: connection.lastError,
            tokenLastValidatedAt: connection.tokenLastValidatedAt,
            webhookSubscribedAt: connection.webhookSubscribedAt,
            updatedAt: connection.updatedAt,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load connection status' });
  }
};

exports.sendTestMessage = async (req, res) => {
  try {
    const { to, body } = req.body;

    if (!to || !body) {
      return res.status(400).json({ message: 'to and body are required' });
    }

    const connection = await getTenantWhatsAppConnection(req.scope.businessId, { includeToken: true });
    if (!connection) {
      return res.status(404).json({ message: 'No WhatsApp connection found for this tenant' });
    }

    const accessToken = decryptSecret(connection);
    const response = await axios.post(
      `${GRAPH_BASE_URL}/${connection.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[+\s-]/g, ''),
        type: 'text',
        text: { body },
      },
      {
        params: { appsecret_proof: getAppSecretProof(accessToken) },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({ message: 'Test message sent successfully', meta: response.data });
  } catch (error) {
    const message = error.response?.data?.error?.message || error.message;
    if (/token|expired|invalid/i.test(message)) {
      const connection = await getTenantWhatsAppConnection(req.scope.businessId);
      if (connection) {
        await markConnectionNeedsReauth(connection.phoneNumberId, message);
      }
    }

    return res.status(400).json({ message });
  }
};
