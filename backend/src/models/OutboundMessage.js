const mongoose = require('mongoose');

// Every SMS / call MediGuide sends (or receives) for Nura Check-In.
// In demo mode these are not sent through a carrier; they are shown on the in-app
// "contact's phone" screen. With a provider configured they are delivered for real.
const OutboundMessageSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true }, // the patient
  contact: { type: mongoose.Schema.ObjectId, ref: 'CareContact', default: null, index: true },
  monitoring: { type: mongoose.Schema.ObjectId, ref: 'Monitoring', default: null },
  direction: { type: String, enum: ['out', 'in'], default: 'out' }, // in = the contact's reply
  channel: { type: String, enum: ['sms', 'call'], default: 'sms' },
  kind: { type: String, default: '' }, // consent, consent_reply, alert, help, all_clear, call, ack_reply
  to: { type: String, default: '' },
  body: { type: String, required: true },
  bodyUrdu: { type: String, default: '' },
  link: { type: String, default: '' },
  delivery: { type: String, enum: ['demo', 'sent', 'failed'], default: 'demo' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OutboundMessage', OutboundMessageSchema);
