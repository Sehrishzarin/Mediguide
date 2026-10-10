const express = require('express');
const rateLimit = require('express-rate-limit');
const { evaluateTriageWithAI } = require('../controllers/ai.controller');
const { protect } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/error');

const router = express.Router();

// Protects the (paid) AI quota from abuse
const triageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'You are sending messages too quickly. Please wait a moment.' }
});

// asyncHandler: an unexpected error returns a 500 instead of crashing the server
router.post('/triage', protect, triageLimiter, asyncHandler(evaluateTriageWithAI));

module.exports = router;
