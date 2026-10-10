const mongoose = require('mongoose');

// Someone the patient trusts, who has agreed (or not yet) to be alerted by Nura Check-In.
const CareContactSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: [true, 'Contact name is required'], trim: true, maxlength: 60 },
  phone: { type: String, required: [true, 'Contact phone is required'], trim: true, maxlength: 30 },
  relationship: { type: String, trim: true, maxlength: 40, default: '' },
  // Contacts are only alerted after they agree (reply YES to the consent message)
  consent: { type: String, enum: ['pending', 'agreed', 'declined'], default: 'pending' },
  invitedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CareContact', CareContactSchema);
