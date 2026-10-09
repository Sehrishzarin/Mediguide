const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register, login, getMe, updateProfile, changePassword, deleteAccount
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Slow down password guessing / signup spam. Only failed attempts count, so a demo
// with many people on one Wi-Fi network is not locked out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.delete('/me', protect, deleteAccount);

module.exports = router;
