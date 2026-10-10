const express = require('express');
const c = require('../controllers/monitoring.controller');
const { protect, authorize } = require('../middlewares/auth');
const { userLock } = require('../services/monitoring');

const router = express.Router();

// Handlers that change the patient's monitoring session run one at a time per patient,
// in step with the background scheduler (prevents lost updates and duplicate alerts).
const locked = (handler) => (req, res, next) => userLock(req.user.id, () => handler(req, res, next));

router.use(protect, authorize('user'));

// Emergency contacts (consent-based)
router.get('/contacts', c.listContacts);
router.post('/contacts', c.addContact);
router.post('/contacts/:id/resend', c.resendConsent);
router.delete('/contacts/:id', c.removeContact);
// Demo: what the contact's phone receives, and their replies
router.get('/contacts/:id/messages', c.contactMessages);
router.post('/contacts/:id/reply', locked(c.contactReply));

// Monitoring session
router.get('/current', locked(c.getCurrent));
router.post('/', locked(c.start));
router.post('/checkins/:id/answer', locked(c.answerCheckIn));
router.post('/ok', locked(c.imOk));
router.post('/location', locked(c.updateLocation));
router.post('/stop', locked(c.stop));

module.exports = router;
