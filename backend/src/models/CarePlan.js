const mongoose = require('mongoose');

// A long-term care plan built from a template (pregnancy, TB treatment, chemotherapy,
// diabetes, hypertension, asthma): a timeline of check-ups/tests plus daily questions.
const MilestoneSchema = new mongoose.Schema({
  key: { type: String, required: true },
  title: { type: String, required: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 400 },
  dueDate: { type: String, required: true }, // YYYY-MM-DD
  kind: { type: String, enum: ['visit', 'test', 'vaccine', 'medicine', 'milestone', 'review'], default: 'visit' },
  doneAt: { type: Date, default: null },
  custom: { type: Boolean, default: false },      // added by the patient
  rescheduled: { type: Boolean, default: false }  // template milestone whose date the patient changed
}, { _id: true });

const CarePlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['pregnancy', 'tb', 'chemo', 'diabetes', 'hypertension', 'asthma'], required: true },
  status: { type: String, enum: ['active', 'completed', 'stopped'], default: 'active', index: true },
  startDate: { type: String, required: true }, // pregnancy: last menstrual period; others: treatment start / diagnosis
  settings: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g. { dueDate } or { cycleDays, cycles }
  milestones: [MilestoneSchema],
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null }
}, { minimize: false });

module.exports = mongoose.model('CarePlan', CarePlanSchema);
