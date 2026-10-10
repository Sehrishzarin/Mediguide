const JournalEntry = require('../models/JournalEntry');
const CarePlan = require('../models/CarePlan');
const User = require('../models/User');
const { asyncHandler, HttpError } = require('../middlewares/error');
const plansSvc = require('../services/plans');
const journal = require('../services/journal');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FLOWS = ['none', 'spotting', 'light', 'medium', 'heavy'];

const toClient = (e) => e && ({
  date: e.date, mood: e.mood, energy: e.energy, pain: e.pain, temperature: e.temperature,
  symptoms: e.symptoms || [], notes: e.notes || '', period: { flow: (e.period && e.period.flow) || 'none' },
  planFields: e.planFields || {}, updatedAt: e.updatedAt
});

const activePlans = (userId) => CarePlan.find({ user: userId, status: 'active' }).sort({ createdAt: 1 });

// Daily questions from the active plans for a given day
const planFieldGroups = (plans, date) => plans.map((p) => ({
  planId: String(p._id), planType: p.type, planTitle: plansSvc.PLANS[p.type].title, fields: plansSvc.fieldsFor(p, date)
})).filter((g) => g.fields.length);

const intOrNull = (v, min, max) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `Value must be between ${min} and ${max}.`);
  return Math.round(n);
};

// Keep only answers to fields that exist on the active plans, with sane types
const cleanPlanFields = (raw, plans, date) => {
  if (!raw || typeof raw !== 'object') return {};
  const allowed = {};
  planFieldGroups(plans, date).forEach((g) => g.fields.forEach((f) => { allowed[f.id] = f; }));
  const out = {};
  for (const [id, value] of Object.entries(raw)) {
    const f = allowed[id];
    if (!f || value === undefined || value === null || value === '') continue;
    if (f.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < f.min || n > f.max) throw new HttpError(400, `${f.label} must be between ${f.min} and ${f.max}${f.unit ? ` ${f.unit}` : ''}.`);
      out[id] = n;
    } else if (f.type === 'boolean') {
      out[id] = Boolean(value);
    } else if (f.type === 'choice') {
      const opt = f.options.find((o) => String(o.value) === String(value));
      if (opt) out[id] = opt.value;
    } else if (f.type === 'multi') {
      const vals = (Array.isArray(value) ? value : []).filter((v) => f.options.some((o) => o.value === v));
      out[id] = vals;
    }
  }
  return out;
};

// @route GET /api/journal?from=&to=
exports.list = asyncHandler(async (req, res) => {
  const today = journal.todayIso();
  const to = DATE_RE.test(req.query.to || '') ? req.query.to : today;
  const from = DATE_RE.test(req.query.from || '') ? req.query.from : plansSvc.addDays(to, -41);
  if (plansSvc.daysBetween(from, to) > 400) throw new HttpError(400, 'Please request at most about a year at a time.');
  const entries = await JournalEntry.find({ user: req.user.id, date: { $gte: from, $lte: to } }).sort({ date: 1 });
  res.json({ success: true, data: { from, to, today, entries: entries.map(toClient) } });
});

// @route GET /api/journal/today  -> today's entry, today's plan questions, trend alerts, cycle snapshot
exports.today = asyncHandler(async (req, res) => {
  const today = journal.todayIso();
  const [entry, plans, recent] = await Promise.all([
    JournalEntry.findOne({ user: req.user.id, date: today }),
    activePlans(req.user.id),
    JournalEntry.find({ user: req.user.id, date: { $gte: plansSvc.addDays(today, -200) } })
  ]);
  const cycleOn = journal.cycleEnabled(req.user) && !plans.some((p) => p.type === 'pregnancy');
  res.json({
    success: true,
    data: {
      date: today,
      entry: toClient(entry),
      planFields: planFieldGroups(plans, today),
      // Danger signs from today's saved entry stay visible all day, plus multi-day trends
      alerts: [...(entry ? plansSvc.checkEntry(entry, plans, today) : []), ...journal.trendAlerts(recent, today)],
      cycle: cycleOn ? journal.cycleSummary(recent, today) : null
    }
  });
});

// @route PUT /api/journal/:date
exports.save = asyncHandler(async (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) throw new HttpError(400, 'Date must be YYYY-MM-DD.');
  const today = journal.todayIso();
  if (date > today) throw new HttpError(400, "You can't log a day in the future.");
  if (plansSvc.daysBetween(date, today) > 365) throw new HttpError(400, 'You can only log days from the past year.');

  const b = req.body || {};
  const plans = await activePlans(req.user.id);
  const flow = b.period && FLOWS.includes(b.period.flow) ? b.period.flow : 'none';
  const temperature = b.temperature === null || b.temperature === undefined || b.temperature === '' ? null : Number(b.temperature);
  if (temperature !== null && (!Number.isFinite(temperature) || temperature < 34 || temperature > 43)) {
    throw new HttpError(400, 'Temperature must be between 34 and 43 °C.');
  }
  const update = {
    mood: intOrNull(b.mood, 1, 5),
    energy: intOrNull(b.energy, 1, 5),
    pain: intOrNull(b.pain, 0, 5),
    temperature: temperature === null ? null : Math.round(temperature * 10) / 10,
    symptoms: (Array.isArray(b.symptoms) ? b.symptoms : []).map((s) => String(s).trim().slice(0, 40)).filter(Boolean).slice(0, 20),
    notes: String(b.notes || '').slice(0, 1000),
    'period.flow': flow,
    planFields: cleanPlanFields(b.planFields, plans, date),
    updatedAt: new Date()
  };
  const entry = await JournalEntry.findOneAndUpdate(
    { user: req.user.id, date },
    { $set: update, $setOnInsert: { user: req.user.id, date, createdAt: new Date() } },
    { new: true, upsert: true, runValidators: true }
  );

  const recent = await JournalEntry.find({ user: req.user.id, date: { $gte: plansSvc.addDays(today, -10) } });
  const alerts = [...plansSvc.checkEntry(entry, plans, date), ...(date === today ? journal.trendAlerts(recent, today) : [])];
  res.json({ success: true, data: { entry: toClient(entry), alerts } });
});

// @route DELETE /api/journal/:date
exports.remove = asyncHandler(async (req, res) => {
  if (!DATE_RE.test(req.params.date)) throw new HttpError(400, 'Date must be YYYY-MM-DD.');
  await JournalEntry.deleteOne({ user: req.user.id, date: req.params.date });
  res.json({ success: true });
});

// @route GET /api/journal/report?days=14
exports.report = asyncHandler(async (req, res) => {
  const days = [7, 14, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 14;
  const today = journal.todayIso();
  const [entries, plans] = await Promise.all([
    JournalEntry.find({ user: req.user.id, date: { $gte: plansSvc.addDays(today, -(days - 1)) } }),
    CarePlan.find({ user: req.user.id, status: 'active' })
  ]);
  res.json({ success: true, data: journal.report(entries, plans, req.user, days, today) });
});

// ── Cycle ─────────────────────────────────────────────────────────────────
// @route GET /api/cycle
exports.cycle = asyncHandler(async (req, res) => {
  const today = journal.todayIso();
  const pregnancy = await CarePlan.exists({ user: req.user.id, type: 'pregnancy', status: 'active' });
  const enabled = journal.cycleEnabled(req.user);
  const choice = req.user.cycleTracking ? req.user.cycleTracking.enabled : null;
  const entries = enabled && !pregnancy
    ? await JournalEntry.find({ user: req.user.id, date: { $gte: plansSvc.addDays(today, -400) } })
    : [];
  res.json({
    success: true,
    data: {
      enabled,
      source: choice === true || choice === false ? 'choice' : 'default',
      shareWithNura: Boolean(req.user.cycleTracking && req.user.cycleTracking.shareWithNura),
      paused: Boolean(pregnancy),
      summary: enabled && !pregnancy ? journal.cycleSummary(entries, today) : null
    }
  });
});

// @route PUT /api/cycle/settings  { enabled: true|false|null, shareWithNura }
exports.cycleSettings = asyncHandler(async (req, res) => {
  const $set = {};
  if (req.body.enabled !== undefined) $set['cycleTracking.enabled'] = req.body.enabled === null ? null : Boolean(req.body.enabled);
  if (req.body.shareWithNura !== undefined) $set['cycleTracking.shareWithNura'] = Boolean(req.body.shareWithNura);
  const user = await User.findByIdAndUpdate(req.user.id, { $set }, { new: true });
  res.json({ success: true, data: { enabled: journal.cycleEnabled(user), shareWithNura: Boolean(user.cycleTracking && user.cycleTracking.shareWithNura) } });
});
