const mongoose = require('mongoose');

const whatsAppConnectionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    metaBusinessId: {
      type: String,
      default: '',
      index: true,
    },
    wabaId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phoneNumberId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      default: '',
    },
    displayPhoneNumber: {
      type: String,
      default: '',
    },
    verifiedName: {
      type: String,
      default: '',
    },
    accessTokenCiphertext: {
      type: String,
      required: true,
      select: false,
    },
    accessTokenIv: {
      type: String,
      required: true,
      select: false,
    },
    accessTokenTag: {
      type: String,
      required: true,
      select: false,
    },
    tokenLastValidatedAt: {
      type: Date,
      default: null,
    },
    webhookSubscribedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['connected', 'needs_reauth', 'disconnected'],
      default: 'connected',
      index: true,
    },
    lastError: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsAppConnection', whatsAppConnectionSchema);
