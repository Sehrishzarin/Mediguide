const express = require('express');
const { evaluateTriageWithAI } = require('../controllers/ai.controller');

const router = express.Router();

router.post('/triage', evaluateTriageWithAI);

module.exports = router;
