const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// @route   GET /api/health
// @desc    API + database status (503 when the database is not connected)
// @access  Public
router.get('/health', (req, res) => {
  const database = DB_STATES[mongoose.connection.readyState] || 'unknown';
  const ok = database === 'connected';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'success' : 'degraded',
    database,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
