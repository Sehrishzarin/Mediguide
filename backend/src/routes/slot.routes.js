const express = require('express');
const { getAvailableSlots, bookSlot, getMyAppointments, cancelBooking } = require('../controllers/slot.controller');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect, authorize('user'));

router.get('/mine', getMyAppointments);
router.get('/', getAvailableSlots);
router.post('/:id/book', bookSlot);
router.delete('/:id/book', cancelBooking);

module.exports = router;
