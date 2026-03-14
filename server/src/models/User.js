const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  businessName: {
    type: String,
    default: ''
  },
  waPhoneNumberId: {
    type: String,
    default: ''
  },
  waAccessToken: {
    type: String,
    default: ''
  },
  plan: {
    type: String,
    enum: ['starter', 'business', 'agency'],
    default: 'starter'
  },
  planExpiry: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Auto hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare given password with stored hash
userSchema.methods.matchPassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Return public-safe user object
userSchema.methods.toPublic = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    businessName: this.businessName,
    waPhoneNumberId: this.waPhoneNumberId,
    plan: this.plan,
    planExpiry: this.planExpiry,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);