const mongoose = require('mongoose');

// A Nura Check-In session: scheduled "how are you feeling?" prompts and, if the patient
// stops answering, a server-side escalation to their emergency contacts.
const CheckInSchema = new mongoose.Schema({
  sentAt: { type: Date, required: true },
  answeredAt: { type: Date, default: null },
  answer: { type: String, enum: [null, 'better', 'same', 'worse', 'help', 'ok'], default: null },
  // Escalation steps already carried out for this check-in (notify, loud, call_user, sms_contacts, call_contact_1, ...)
  stepsDone: [{ key: String, at: Date, _id: false }],
  alertSentAt: { type: Date, default: null },
  acknowledgedBy: { type: String, default: '' }, // contact name who replied OK
  acknowledgedAt: { type: Date, default: null }
}, { _id: true });

const EventSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  type: { type: String, required: true }, // started, checkin_sent, answered, loud_alert, call_user, sms_contact, call_contact, acknowledged, cancelled, stopped, completed, help
  text: { type: String, default: '' }
}, { _id: false });

const MonitoringSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, default: 'general', maxlength: 40 }, // e.g. fever (from a symptom check)
  intervalMin: { type: Number, required: true, min: 1, max: 24 * 60 },
  alertAfterMin: { type: Number, required: true, min: 1, max: 6 * 60 },
  durationMin: { type: Number, default: null }, // null = until stopped
  overnight: { type: Boolean, default: true },
  // Demo speed: every "minute" passes in one second so the whole flow can be shown live
  demoSpeed: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'stopped', 'completed'], default: 'active', index: true },
  startedAt: { type: Date, default: Date.now },
  endsAt: { type: Date, default: null },
  nextCheckInAt: { type: Date, required: true, index: true },
  checkIns: [CheckInSchema],
  events: [EventSchema],
  lastLocation: {
    lat: Number,
    lng: Number,
    at: Date
  },
  stoppedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Monitoring', MonitoringSchema);
