const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  type: {
    type: String,
    enum: [
      'created',
      'replied',
      'status_changed',
      'note_added',
      'reminder_set',
      'assigned'
    ],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

activitySchema.index({ leadId: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema);
