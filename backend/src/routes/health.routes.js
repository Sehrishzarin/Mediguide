const express = require('express');
const router = express.Router();

// @route   GET /api/health
// @desc    Check API health status
// @access  Public
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Backend server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
