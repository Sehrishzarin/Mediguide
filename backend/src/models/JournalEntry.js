const mongoose = require('mongoose');

// One daily health log per patient per day (the calendar journal).
// Also carries period flow, which powers cycle predictions, and plan-specific
// fields (e.g. baby movements in pregnancy, glucose for diabetes).
const JournalEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'] },
  mood: { type: Number, min: 1, max: 5, default: null },     // 1 awful .. 5 great
  energy: { type: Number, min: 1, max: 5, default: null },   // 1 exhausted .. 5 energetic
  pain: { type: Number, min: 0, max: 5, default: null },     // 0 none .. 5 worst
  temperature: { type: Number, min: 34, max: 43, default: null }, // °C
  symptoms: [{ type: String, trim: true, maxlength: 40 }],
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  period: {
    flow: { type: String, enum: ['none', 'spotting', 'light', 'medium', 'heavy'], default: 'none' }
  },
  // Answers to the active care plans' daily questions, keyed by field id
  planFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { minimize: false });

JournalEntrySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
