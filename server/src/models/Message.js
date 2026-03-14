const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'document', 'audio'],
    default: 'text'
  },
  body: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  waMessageId: {
    type: String,
    unique: true,
    sparse: true  // allows multiple nulls
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for fast chat history queries
messageSchema.index({ leadId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);