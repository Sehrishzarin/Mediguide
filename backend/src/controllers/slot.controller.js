const Slot = require('../models/Slot');
const { asyncHandler, HttpError } = require('../middlewares/error');
const { isoDate } = require('../utils/slots');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toClient = (s) => ({
  id: String(s._id),
  organizationId: String(s.organization),
  org: s.orgName,
  doctor: s.doctor,
  specialty: s.specialty,
  date: s.date,
  time: s.time,
  bookedAt: s.bookedAt
});

// @route GET /api/slots?specialty=&organizationId=&search=
// Upcoming, still-available sessions.
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { specialty, organizationId, search } = req.query;
  const query = { patient: null, date: { $gte: isoDate(new Date()) } };

  if (organizationId) query.organization = organizationId;
  if (specialty) query.specialty = { $regex: escapeRegex(String(specialty)), $options: 'i' };
  if (search) {
    const rx = { $regex: escapeRegex(String(search)), $options: 'i' };
    query.$or = [{ doctor: rx }, { specialty: rx }, { orgName: rx }];
  }

  const slots = await Slot.find(query).sort({ date: 1, time: 1 }).limit(300);
  res.json({ success: true, count: slots.length, data: slots.map(toClient) });
});

// @route POST /api/slots/:id/book
// Atomic: only succeeds if nobody else has taken the session.
exports.bookSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findOneAndUpdate(
    { _id: req.params.id, patient: null, date: { $gte: isoDate(new Date()) } },
    { $set: { patient: req.user.id, bookedAt: new Date() } },
    { new: true }
  );
  if (!slot) throw new HttpError(409, 'Sorry, that session is no longer available.');
  res.status(201).json({ success: true, data: toClient(slot) });
});

// @route GET /api/slots/mine
exports.getMyAppointments = asyncHandler(async (req, res) => {
  const slots = await Slot.find({ patient: req.user.id }).sort({ date: 1, time: 1 });
  res.json({ success: true, data: slots.map(toClient) });
});

// @route DELETE /api/slots/:id/book
exports.cancelBooking = asyncHandler(async (req, res) => {
  const slot = await Slot.findOneAndUpdate(
    { _id: req.params.id, patient: req.user.id },
    { $set: { patient: null, bookedAt: null } },
    { new: true }
  );
  if (!slot) throw new HttpError(404, 'Appointment not found.');
  res.json({ success: true, message: 'Appointment cancelled.' });
});
