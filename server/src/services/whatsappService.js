const axios = require('axios');

const META_API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Get credentials from either user object or .env fallback
 */
function getCreds(user) {
  return {
    phoneNumberId: user?.waPhoneNumberId || process.env.META_PHONE_NUMBER_ID,
    accessToken:   user?.waAccessToken   || process.env.META_ACCESS_TOKEN,
  };
}

/**
 * Send a plain text message to a WhatsApp number
 * @param {string} to      - recipient phone in E.164 format e.g. "923001234567"
 * @param {string} body    - message text
 * @param {object} user    - user document (has waPhoneNumberId + waAccessToken)
 */
async function sendTextMessage(to, body, user) {
  const { phoneNumberId, accessToken } = getCreds(user);

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured. Go to Settings → WhatsApp Setup.');
  }

  // Normalize number: strip +, spaces, dashes
  const normalizedTo = to.replace(/[\s\-\+]/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to:                normalizedTo,
    type:              'text',
    text:              { preview_url: false, body },
  };

  const response = await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    payload,
    {
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

/**
 * Send a template message (e.g., for broadcast / follow-up)
 * @param {string} to           - recipient phone
 * @param {string} templateName - approved template name in Meta
 * @param {string} langCode     - e.g. "en_US"
 * @param {object} user
 */
async function sendTemplateMessage(to, templateName, langCode = 'en_US', user) {
  const { phoneNumberId, accessToken } = getCreds(user);

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured.');
  }

  const normalizedTo = to.replace(/[\s\-\+]/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    to:                normalizedTo,
    type:              'template',
    template: {
      name:     templateName,
      language: { code: langCode },
    },
  };

  const response = await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    payload,
    {
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

/**
 * Mark a message as read
 * @param {string} messageId - WhatsApp message ID (wamid.xxx)
 * @param {object} user
 */
async function markAsRead(messageId, user) {
  const { phoneNumberId, accessToken } = getCreds(user);
  if (!phoneNumberId || !accessToken) return;

  try {
    await axios.post(
      `${BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status:            'read',
        message_id:        messageId,
      },
      {
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    // Non-critical — don't throw
    console.warn('⚠️  markAsRead failed:', err.message);
  }
}

/**
 * Verify if credentials are valid by calling the Meta API
 * Returns { valid: true/false, phoneNumber, displayName }
 */
async function verifyCredentials(phoneNumberId, accessToken) {
  try {
    const response = await axios.get(
      `${BASE_URL}/${phoneNumberId}`,
      {
        params: { fields: 'display_phone_number,verified_name' },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return {
      valid:       true,
      phoneNumber: response.data.display_phone_number,
      displayName: response.data.verified_name,
    };
  } catch (err) {
    return {
      valid:   false,
      error:   err.response?.data?.error?.message || err.message,
    };
  }
}

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  markAsRead,
  verifyCredentials,
};
