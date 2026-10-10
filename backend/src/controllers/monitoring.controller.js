const Monitoring = require('../models/Monitoring');
const CareContact = require('../models/CareContact');
const OutboundMessage = require('../models/OutboundMessage');
const { asyncHandler, HttpError } = require('../middlewares/error');
const engine = require('../services/monitoring');

const MAX_CONTACTS = 3;
const INTERVALS = [60, 120, 240, 360];          // 1, 2, 4, 6 hours
const ALERT_AFTER = [15, 30, 60];               // minutes
const DURATIONS = [1440, 4320, null];           // 24 hrs, 3 days, until stopped
const ANSWERS = ['better', 'same', 'worse', 'help'];
const demoAllowed = () => process.env.ALLOW_DEMO_SPEED !== 'false';

const active = (userId) => Monitoring.findOne({ user: userId, status: 'active' });

// ── Contacts ──────────────────────────────────────────────────────────────
// @route GET /api/monitoring/contacts
exports.listContacts = asyncHandler(async (req, res) => {
  const contacts = await CareContact.find({ owner: req.user.id }).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, data: contacts.map(engine.contactToClient) });
});

// @route POST /api/monitoring/contacts  { name, phone, relationship }
// Sends the contact a consent message; they are only alerted after replying YES.
exports.addContact = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const relationship = String(req.body.relationship || '').trim();
  if (!name) throw new HttpError(400, "Please enter the contact's name.");
  if (!/^[+\d][\d\s()-]{6,19}$/.test(phone)) throw new HttpError(400, 'Please enter a valid phone number.');

  const count = await CareContact.countDocuments({ owner: req.user.id });
  if (count >= MAX_CONTACTS) throw new HttpError(400, `You can add up to ${MAX_CONTACTS} contacts.`);
  const digits = phone.replace(/\D/g, '');
  const existing = await CareContact.find({ owner: req.user.id });
  if (existing.some((c) => c.phone.replace(/\D/g, '') === digits)) throw new HttpError(409, 'That number is already one of your contacts.');

  const contact = await CareContact.create({ owner: req.user.id, name, phone, relationship, order: count });
  await engine.sendConsent(req.user, contact);
  res.status(201).json({ success: true, data: engine.contactToClient(contact) });
});

// @route POST /api/monitoring/contacts/:id/resend
exports.resendConsent = asyncHandler(async (req, res) => {
  const contact = await CareContact.findOne({ _id: req.params.id, owner: req.user.id });
  if (!contact) throw new HttpError(404, 'Contact not found.');
  if (contact.consent === 'agreed') throw new HttpError(400, 'This contact has already agreed.');
  contact.consent = 'pending';
  contact.invitedAt = new Date();
  await contact.save();
  await engine.sendConsent(req.user, contact);
  res.json({ success: true, data: engine.contactToClient(contact) });
});

// @route DELETE /api/monitoring/contacts/:id
exports.removeContact = asyncHandler(async (req, res) => {
  const contact = await CareContact.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!contact) throw new HttpError(404, 'Contact not found.');
  res.json({ success: true });
});

// ── Monitoring ────────────────────────────────────────────────────────────
// @route GET /api/monitoring/current
exports.getCurrent = asyncHandler(async (req, res) => {
  const m = await active(req.user.id);
  // Process right away so the screen is never behind the scheduler
  if (m && await engine.processOne(m)) await m.save();
  res.json({ success: true, data: await engine.serialize(m), demoSpeedAllowed: demoAllowed() });
});

// @route POST /api/monitoring  { reason, intervalMin, alertAfterMin, durationMin, overnight, demoSpeed, location }
exports.start = asyncHandler(async (req, res) => {
  const intervalMin = Number(req.body.intervalMin);
  const alertAfterMin = Number(req.body.alertAfterMin);
  const durationMin = req.body.durationMin === null || req.body.durationMin === undefined ? null : Number(req.body.durationMin);
  if (!INTERVALS.includes(intervalMin)) throw new HttpError(400, 'Please choose how often Nura checks in.');
  if (!ALERT_AFTER.includes(alertAfterMin)) throw new HttpError(400, 'Please choose when to alert your contact.');
  if (!DURATIONS.includes(durationMin)) throw new HttpError(400, 'Please choose how long to keep monitoring.');

  const agreed = await CareContact.countDocuments({ owner: req.user.id, consent: 'agreed' });
  if (!agreed) throw new HttpError(400, 'At least one contact needs to agree before monitoring can start.');

  // Only one active session at a time
  await Monitoring.updateMany({ user: req.user.id, status: 'active' }, { $set: { status: 'stopped', stoppedAt: new Date() } });

  const demoSpeed = Boolean(req.body.demoSpeed) && demoAllowed();
  const now = new Date();
  const m = new Monitoring({
    user: req.user.id,
    reason: String(req.body.reason || 'general').slice(0, 40),
    intervalMin,
    alertAfterMin,
    durationMin,
    overnight: req.body.overnight !== false,
    demoSpeed,
    startedAt: now,
    nextCheckInAt: now // placeholder, set below
  });
  m.endsAt = durationMin ? engine.after(m, durationMin, now) : null;
  // First check-in after one interval (demo: after 10 seconds so the flow can be shown)
  m.nextCheckInAt = demoSpeed ? new Date(now.getTime() + 10000) : engine.nextCheckIn(m, now);
  engine.setLocation(m, req.body.location);
  engine.log(m, 'started', 'Monitoring started');
  await m.save();
  res.status(201).json({ success: true, data: await engine.serialize(m) });
});

// @route POST /api/monitoring/checkins/:id/answer  { answer: better|same|worse|help, location }
exports.answerCheckIn = asyncHandler(async (req, res) => {
  const value = String(req.body.answer || '');
  if (!ANSWERS.includes(value)) throw new HttpError(400, 'Unknown answer.');
  const m = await active(req.user.id);
  if (!m) throw new HttpError(404, 'Monitoring is not active.');
  await engine.answer(m, req.params.id, value, req.user, req.body.location);
  await m.save();
  res.json({ success: true, data: await engine.serialize(m) });
});

// @route POST /api/monitoring/ok  { location }   "I'm OK, cancel the alert"
exports.imOk = asyncHandler(async (req, res) => {
  const m = await active(req.user.id);
  if (!m) throw new HttpError(404, 'Monitoring is not active.');
  engine.setLocation(m, req.body.location);
  const ci = engine.openCheckIn(m) || [...m.checkIns].reverse().find((x) => x.alertSentAt && !x.acknowledgedAt);
  if (ci) {
    if (!ci.answeredAt) { ci.answeredAt = new Date(); ci.answer = 'ok'; }
    ci.acknowledgedAt = ci.acknowledgedAt || new Date();
    ci.acknowledgedBy = ci.acknowledgedBy || 'you';
    await engine.sendAllClear(m, ci, req.user);
    engine.log(m, 'cancelled', "You said you're OK, alert cancelled");
  }
  await m.save();
  res.json({ success: true, data: await engine.serialize(m) });
});

// @route POST /api/monitoring/location  { lat, lng }
exports.updateLocation = asyncHandler(async (req, res) => {
  const m = await active(req.user.id);
  if (m) {
    engine.setLocation(m, req.body);
    await m.save();
  }
  res.json({ success: true });
});

// @route POST /api/monitoring/stop
exports.stop = asyncHandler(async (req, res) => {
  const m = await active(req.user.id);
  if (!m) throw new HttpError(404, 'Monitoring is not active.');
  const ci = engine.openCheckIn(m);
  if (ci && ci.alertSentAt) await engine.sendAllClear(m, ci, req.user);
  m.status = 'stopped';
  m.stoppedAt = new Date();
  engine.log(m, 'stopped', 'Monitoring stopped');
  await m.save();
  res.json({ success: true, data: null });
});

// ── Demo: the contact's phone ─────────────────────────────────────────────
// @route GET /api/monitoring/contacts/:id/messages
exports.contactMessages = asyncHandler(async (req, res) => {
  const contact = await CareContact.findOne({ _id: req.params.id, owner: req.user.id });
  if (!contact) throw new HttpError(404, 'Contact not found.');
  const messages = await OutboundMessage.find({ owner: req.user.id, contact: contact._id }).sort({ createdAt: 1 }).limit(200);
  res.json({
    success: true,
    data: {
      contact: engine.contactToClient(contact),
      demo: true,
      messages: messages.map((x) => ({
        id: String(x._id), direction: x.direction, channel: x.channel, kind: x.kind, body: x.body, bodyUrdu: x.bodyUrdu, link: x.link, createdAt: x.createdAt
      }))
    }
  });
});

// @route POST /api/monitoring/contacts/:id/reply  { text: YES | NO | OK }
// Demo stand-in for the contact replying by SMS (a provider webhook would call the same logic).
exports.contactReply = asyncHandler(async (req, res) => {
  const contact = await CareContact.findOne({ _id: req.params.id, owner: req.user.id });
  if (!contact) throw new HttpError(404, 'Contact not found.');
  const text = String(req.body.text || '').trim().toUpperCase();
  if (!['YES', 'NO', 'OK'].includes(text)) throw new HttpError(400, 'Reply with YES, NO or OK.');
  const result = await engine.contactReply(contact, text, req.user);
  res.json({ success: true, data: result });
});
