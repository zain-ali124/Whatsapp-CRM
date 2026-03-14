const User = require('../models/User');
const jwt  = require('jsonwebtoken');
const { verifyCredentials } = require('../services/whatsappService');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

/* ─── Register ──────────────────────────────────────────────── */
exports.register = async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user  = await User.create({ name, email, password, businessName });
    const token = signToken(user._id);

    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Login ─────────────────────────────────────────────────── */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Get Me ─────────────────────────────────────────────────── */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Update WhatsApp Credentials ───────────────────────────── */
exports.updateWA = async (req, res) => {
  try {
    const { waPhoneNumberId, waAccessToken, waVerifyToken } = req.body;

    const update = {};
    if (waPhoneNumberId) update.waPhoneNumberId = waPhoneNumberId;
    if (waAccessToken)   update.waAccessToken   = waAccessToken;
    if (waVerifyToken)   update.waVerifyToken   = waVerifyToken;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ user: user.toPublic(), message: 'WhatsApp credentials saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Update Profile ────────────────────────────────────────── */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, businessName } = req.body;

    const update = {};
    if (name)         update.name         = name;
    if (email)        update.email        = email;
    if (businessName) update.businessName = businessName;

    // Check email not taken by someone else
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ user: user.toPublic(), message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── Verify WhatsApp Credentials ───────────────────────────── */
// POST /api/auth/verify-wa
// Lets frontend test if credentials work before saving
exports.verifyWA = async (req, res) => {
  try {
    const { waPhoneNumberId, waAccessToken } = req.body;

    if (!waPhoneNumberId || !waAccessToken) {
      return res.status(400).json({ message: 'Phone Number ID and Access Token required' });
    }

    const result = await verifyCredentials(waPhoneNumberId, waAccessToken);

    if (result.valid) {
      res.json({
        valid:       true,
        phoneNumber: result.phoneNumber,
        displayName: result.displayName,
        message:     `Connected: ${result.displayName} (${result.phoneNumber})`,
      });
    } else {
      res.status(400).json({ valid: false, message: result.error });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
