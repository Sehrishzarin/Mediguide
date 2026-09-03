const express = require('express');
const { register, login, getMe, updateMedicalProfile } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateMedicalProfile);

module.exports = router;
