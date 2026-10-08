const express = require('express');
const rateLimit = require('express-rate-limit');
const { evaluateTriageWithAI } = require('../controllers/ai.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Protects the (paid) AI quota from abuse
const triageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'You are sending messages too quickly. Please wait a moment.' }
});

router.post('/triage', protect, triageLimiter, evaluateTriageWithAI);

module.exports = router;
