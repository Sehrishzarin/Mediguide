const CarePlan = require('../models/CarePlan');
const User = require('../models/User');
const { asyncHandler, HttpError } = require('../middlewares/error');
const plansSvc = require('../services/plans');
const { todayIso, cycleEnabled } = require('../services/journal');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ['visit', 'test', 'vaccine', 'medicine', 'milestone', 'review'];

const toClient = (p, today = todayIso()) => {
  const def = plansSvc.PLANS[p.type];
  const milestones = [...p.milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((x) => ({
    id: String(x._id), key: x.key, title: x.title, description: x.description, dueDate: x.dueDate, kind: x.kind,
    done: Boolean(x.doneAt), doneAt: x.doneAt, custom: x.custom, rescheduled: Boolean(x.rescheduled),
    // Informational events (kind "milestone") pass; only things to do can be overdue
    overdue: !x.doneAt && x.dueDate < today && x.kind !== 'milestone',
    passed: !x.doneAt && x.dueDate < today && x.kind === 'milestone',
    daysAway: plansSvc.daysBetween(today, x.dueDate)
  }));
  return {
    id: String(p._id),
    type: p.type,
    title: def.title,
    status: p.status,
    startDate: p.startDate,
    settings: p.settings || {},
    createdAt: p.createdAt,
    endedAt: p.endedAt,
    progress: plansSvc.progress(p, today),
    milestones,
    nextMilestone: milestones.find((x) => !x.done && x.dueDate >= today) || null,
    overdueCount: milestones.filter((x) => x.overdue).length,
    dailyFields: p.status === 'active' ? plansSvc.fieldsFor(p, today) : [],
    dangerSigns: def.dangerSigns,
    note: def.note
  };
};

const trimester = (week) => (week < 14 ? '1st' : week < 28 ? '2nd' : '3rd');

// Keep the profile's pregnancy status in step with an active pregnancy plan (Nura and triage use it)
const syncPregnancyStatus = async (userId, plan) => {
  const status = plan && plan.status === 'active'
    ? `Pregnant (${trimester(plansSvc.progress(plan, todayIso()).week)} trimester)`
    : 'N/A';
  await User.updateOne({ _id: userId }, { $set: { 'medicalProfile.pregnancyStatus': status } });
};

// @route GET /api/plans/templates
exports.templates = asyncHandler(async (req, res) => {
  res.json({ success: true, data: plansSvc.templateList() });
});

// @route GET /api/plans
exports.list = asyncHandler(async (req, res) => {
  const plans = await CarePlan.find({ user: req.user.id }).sort({ status: 1, createdAt: -1 });
  const today = todayIso();
  // Refresh trimester as the weeks pass
  const preg = plans.find((p) => p.type === 'pregnancy' && p.status === 'active');
  if (preg) await syncPregnancyStatus(req.user.id, preg);
  res.json({ success: true, data: plans.map((p) => toClient(p, today)) });
});

// @route POST /api/plans  { type, startDate, dueDate?, settings? }
exports.create = asyncHandler(async (req, res) => {
  const { type } = req.body;
  if (!plansSvc.PLANS[type]) throw new HttpError(400, 'Unknown plan type.');
  const today = todayIso();
  let startDate = req.body.startDate;
  const settings = {};

  if (type === 'pregnancy') {
    // Same rule as cycle tracking: female profiles by default, anyone who has opted in
    if (!cycleEnabled(req.user)) {
      throw new HttpError(400, 'Pregnancy plans are available when cycle tracking is on. You can turn it on in Profile, Journal settings.');
    }
    if (DATE_RE.test(req.body.dueDate || '') && !DATE_RE.test(startDate || '')) {
      startDate = plansSvc.addDays(req.body.dueDate, -280); // LMP = due date - 280 days
    }
    if (!DATE_RE.test(startDate || '')) throw new HttpError(400, 'Please enter the first day of your last period or your due date.');
    const weeks = plansSvc.daysBetween(startDate, today) / 7;
    if (weeks < 0) throw new HttpError(400, 'That date is in the future. Check the date of your last period.');
    if (weeks > 43) throw new HttpError(400, 'That date is more than 43 weeks ago. Please check it.');
    settings.dueDate = DATE_RE.test(req.body.dueDate || '') ? req.body.dueDate : plansSvc.addDays(startDate, 280);
  } else {
    if (!DATE_RE.test(startDate || '')) throw new HttpError(400, 'Please choose a start date.');
    if (plansSvc.daysBetween(today, startDate) > 90) throw new HttpError(400, 'The start date can be at most 3 months ahead.');
    if (plansSvc.daysBetween(startDate, today) > 3 * 365) throw new HttpError(400, 'That start date is more than 3 years ago.');
  }
  if (type === 'chemo') {
    const cycleDays = Number((req.body.settings || {}).cycleDays);
    const cycles = Number((req.body.settings || {}).cycles);
    settings.cycleDays = [14, 21, 28].includes(cycleDays) ? cycleDays : 21;
    settings.cycles = Number.isInteger(cycles) && cycles >= 1 && cycles <= 12 ? cycles : 6;
  }

  if (await CarePlan.exists({ user: req.user.id, type, status: 'active' })) {
    throw new HttpError(409, `You already have an active ${plansSvc.PLANS[type].title.toLowerCase()} plan.`);
  }

  const plan = await CarePlan.create({
    user: req.user.id,
    type,
    startDate,
    settings,
    milestones: plansSvc.buildMilestones(type, startDate, settings, req.user.medicalProfile || {})
  });
  if (type === 'pregnancy') await syncPregnancyStatus(req.user.id, plan);
  res.status(201).json({ success: true, data: toClient(plan, today) });
});

const ownPlan = async (req) => {
  const plan = await CarePlan.findOne({ _id: req.params.id, user: req.user.id });
  if (!plan) throw new HttpError(404, 'Plan not found.');
  return plan;
};

// @route PATCH /api/plans/:id/milestones/:mid  { done?, dueDate? }
exports.updateMilestone = asyncHandler(async (req, res) => {
  const plan = await ownPlan(req);
  const ms = plan.milestones.id(req.params.mid);
  if (!ms) throw new HttpError(404, 'Milestone not found.');
  if (req.body.done !== undefined) ms.doneAt = req.body.done ? (ms.doneAt || new Date()) : null;
  if (req.body.dueDate !== undefined) {
    if (!DATE_RE.test(req.body.dueDate)) throw new HttpError(400, 'Date must be YYYY-MM-DD.');
    ms.dueDate = req.body.dueDate;
    if (!ms.custom) ms.rescheduled = true;
  }
  await plan.save();
  res.json({ success: true, data: toClient(plan) });
});

// @route POST /api/plans/:id/milestones  { title, dueDate, kind? }  (e.g. an appointment the doctor booked)
exports.addMilestone = asyncHandler(async (req, res) => {
  const plan = await ownPlan(req);
  const title = String(req.body.title || '').trim().slice(0, 120);
  if (!title) throw new HttpError(400, 'Please add a title.');
  if (!DATE_RE.test(req.body.dueDate || '')) throw new HttpError(400, 'Please choose a date.');
  plan.milestones.push({
    key: `custom_${Date.now()}`, title, description: String(req.body.description || '').slice(0, 400),
    dueDate: req.body.dueDate, kind: KINDS.includes(req.body.kind) ? req.body.kind : 'visit', custom: true
  });
  await plan.save();
  res.status(201).json({ success: true, data: toClient(plan) });
});

// @route DELETE /api/plans/:id/milestones/:mid  (custom milestones only)
exports.removeMilestone = asyncHandler(async (req, res) => {
  const plan = await ownPlan(req);
  const ms = plan.milestones.id(req.params.mid);
  if (!ms) throw new HttpError(404, 'Milestone not found.');
  if (!ms.custom) throw new HttpError(400, 'Only milestones you added can be removed. You can change the date instead.');
  ms.deleteOne();
  await plan.save();
  res.json({ success: true, data: toClient(plan) });
});

// @route POST /api/plans/:id/end  { status: 'completed' | 'stopped' }
exports.end = asyncHandler(async (req, res) => {
  const plan = await ownPlan(req);
  plan.status = req.body.status === 'completed' ? 'completed' : 'stopped';
  plan.endedAt = new Date();
  await plan.save();
  if (plan.type === 'pregnancy') await syncPregnancyStatus(req.user.id, null);
  res.json({ success: true, data: toClient(plan) });
});
