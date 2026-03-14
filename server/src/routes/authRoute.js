const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/auth');
const {
  register,
  login,
  getMe,
  updateWA,
  updateProfile,
  verifyWA,
} = require('../controllers/authController');

// Public
router.post('/register', register);
router.post('/login',    login);

// Protected
router.use(protect);
router.get('/me',               getMe);
router.patch('/update-wa',      updateWA);
router.patch('/update-profile', updateProfile);
router.post('/verify-wa',       verifyWA);

module.exports = router;
