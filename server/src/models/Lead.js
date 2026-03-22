const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    default: 'Unknown'
  },
  phone: {
    type: String,
    required: true
  },
  waId: {
    type: String,
    default: ''
  },
  source: {
  type: String,
  enum: ['instagram', 'facebook', 'whatsapp_ad', 'organic', 'other', 'whatsapp_direct', 'referral', 'website'],
  default: 'whatsapp_direct'
},
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'closed', 'lost'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  source: {
    type: String,
    enum: ['instagram', 'facebook', 'whatsapp_ad', 'organic', 'other'],
    default: 'organic'
  },
  tags: {
    type: [String],
    default: []
  },
  notes: {
    type: [noteSchema],
    default: []
  },
  leadScore: {
    type: Number,
    default: 0
  },
  lastMessageAt: {
    type: Date,
    default: null
  },
  reminderAt: {
    type: Date,
    default: null
  },
  aiSummary: {
    type: String,
    default: ''
  },
  followUpSuggestion: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Indexes for fast queries
leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ userId: 1, phone: 1 });
leadSchema.index({ reminderAt: 1 });

module.exports = mongoose.model('Lead', leadSchema);