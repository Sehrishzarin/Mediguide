const mongoose = require('mongoose');

// A bookable doctor session. `patient` is null while available.
const SlotSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.ObjectId, ref: 'Organization', required: true, index: true },
  orgName: { type: String, required: true },
  doctor: { type: String, required: true, trim: true },
  specialty: { type: String, required: true, trim: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, required: true }, // HH:mm
  patient: { type: mongoose.Schema.ObjectId, ref: 'User', default: null, index: true },
  bookedAt: { type: Date, default: null }
});

SlotSchema.index({ organization: 1, doctor: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Slot', SlotSchema);
