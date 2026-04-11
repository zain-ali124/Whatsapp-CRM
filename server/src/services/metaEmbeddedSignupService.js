const axios = require('axios');
const WhatsAppConnection = require('../models/WhatsAppConnection');
const { encryptSecret, decryptSecret } = require('./cryptoService');

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v23.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

function getAppSecretProof(accessToken) {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(accessToken)
    .digest('hex');
}

async function exchangeCodeForAccessToken(code) {
  const params = {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    code,
  };

  if (process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI) {
    params.redirect_uri = process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI;
  }

  const { data } = await axios.get(`${GRAPH_BASE_URL}/oauth/access_token`, { params });

  if (!data?.access_token) {
    throw new Error('Meta did not return an access token');
  }

  return data.access_token;
}

async function getWabaDetails({ wabaId, accessToken }) {
  const { data } = await axios.get(`${GRAPH_BASE_URL}/${wabaId}`, {
    params: {
      fields: 'id,name,currency,timezone_id',
      appsecret_proof: getAppSecretProof(accessToken),
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data;
}

async function getPhoneNumberDetails({ phoneNumberId, accessToken }) {
  const { data } = await axios.get(`${GRAPH_BASE_URL}/${phoneNumberId}`, {
    params: {
      fields: 'id,display_phone_number,verified_name,name_status,quality_rating',
      appsecret_proof: getAppSecretProof(accessToken),
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data;
}

async function subscribeAppToWaba({ wabaId, accessToken }) {
  try {
    await axios.post(
      `${GRAPH_BASE_URL}/${wabaId}/subscribed_apps`,
      { subscribed_fields: ['messages'] },
      {
        params: { appsecret_proof: getAppSecretProof(accessToken) },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    await axios.post(
      `${GRAPH_BASE_URL}/${wabaId}/subscribed_apps`,
      {},
      {
        params: { appsecret_proof: getAppSecretProof(accessToken) },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

async function upsertWhatsAppConnection({ tenantId, metaBusinessId, wabaId, phoneNumberId, accessToken }) {
  const [wabaDetails, phoneDetails] = await Promise.all([
    getWabaDetails({ wabaId, accessToken }),
    getPhoneNumberDetails({ phoneNumberId, accessToken }),
  ]);

  await subscribeAppToWaba({ wabaId, accessToken });

  const connection = await WhatsAppConnection.findOneAndUpdate(
    { tenantId },
    {
      tenantId,
      metaBusinessId: metaBusinessId || '',
      wabaId,
      phoneNumberId,
      businessName: wabaDetails?.name || '',
      displayPhoneNumber: phoneDetails?.display_phone_number || '',
      verifiedName: phoneDetails?.verified_name || '',
      tokenLastValidatedAt: new Date(),
      webhookSubscribedAt: new Date(),
      status: 'connected',
      lastError: '',
      ...encryptSecret(accessToken),
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  return connection;
}

async function getTenantWhatsAppConnection(tenantId, { includeToken = false } = {}) {
  const query = WhatsAppConnection.findOne({ tenantId });

  if (includeToken) {
    query.select('+accessTokenCiphertext +accessTokenIv +accessTokenTag');
  }

  return query;
}

async function getResolvedTenantCredentials(tenantId) {
  const connection = await getTenantWhatsAppConnection(tenantId, { includeToken: true });

  if (connection) {
    return {
      connection,
      phoneNumberId: connection.phoneNumberId,
      accessToken: decryptSecret(connection),
      wabaId: connection.wabaId,
    };
  }

  if (process.env.META_PHONE_NUMBER_ID && process.env.META_ACCESS_TOKEN) {
    return {
      connection: null,
      phoneNumberId: process.env.META_PHONE_NUMBER_ID,
      accessToken: process.env.META_ACCESS_TOKEN,
      wabaId: process.env.META_WABA_ID || '',
    };
  }

  throw new Error('No WhatsApp connection found for this tenant');
}

async function markConnectionNeedsReauth(phoneNumberId, reason) {
  await WhatsAppConnection.findOneAndUpdate(
    { phoneNumberId },
    {
      status: 'needs_reauth',
      lastError: reason || 'Token invalid or expired',
    }
  );
}

module.exports = {
  GRAPH_BASE_URL,
  META_GRAPH_API_VERSION,
  getAppSecretProof,
  exchangeCodeForAccessToken,
  subscribeAppToWaba,
  upsertWhatsAppConnection,
  getTenantWhatsAppConnection,
  getResolvedTenantCredentials,
  markConnectionNeedsReauth,
};
