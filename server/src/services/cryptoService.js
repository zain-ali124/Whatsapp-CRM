const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY is missing');
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  const maybeBase64 = Buffer.from(raw, 'base64');
  if (maybeBase64.length === 32) {
    return maybeBase64;
  }

  throw new Error('META_TOKEN_ENCRYPTION_KEY must be 32-byte base64 or 64-char hex');
}

function encryptSecret(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    accessTokenCiphertext: ciphertext.toString('base64'),
    accessTokenIv: iv.toString('base64'),
    accessTokenTag: tag.toString('base64'),
  };
}

function decryptSecret(payload) {
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.accessTokenIv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(payload.accessTokenTag, 'base64'));

  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.accessTokenCiphertext, 'base64')),
    decipher.final(),
  ]);

  return plain.toString('utf8');
}

module.exports = {
  encryptSecret,
  decryptSecret,
};
