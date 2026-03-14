const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    name: {
      type:     String,
      required: [true, 'Template name is required'],
      trim:     true,
      maxlength: 100,
    },

    body: {
      type:     String,
      required: [true, 'Template body is required'],
      maxlength: 1024,
    },

    category: {
      type:    String,
      enum:    ['greeting', 'follow_up', 'closing', 'reminder', 'promotion', 'support', 'custom'],
      default: 'custom',
    },

    // Variables used in template e.g. ['name', 'phone', 'businessName']
    // Detected automatically from {{variable}} patterns
    variables: [{ type: String }],

    // How many times this template has been used (sent)
    usageCount: {
      type:    Number,
      default: 0,
    },

    isFavourite: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,  // createdAt, updatedAt
  }
);

// Auto-extract variable names from {{variable}} placeholders before save
// Use a synchronous hook (no `next`) and guard missing `body` to avoid kareem next errors
templateSchema.pre('save', function () {
  if (!this.body) {
    this.variables = [];
    return;
  }
  const matches = this.body.match(/\{\{(\w+)\}\}/g) || [];
  this.variables = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
});

module.exports = mongoose.model('Template', templateSchema);
