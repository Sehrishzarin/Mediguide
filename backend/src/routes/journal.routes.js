const express = require('express');
const journal = require('../controllers/journal.controller');
const plans = require('../controllers/plans.controller');
const { protect, authorize } = require('../middlewares/auth');

// Health journal (daily logs + calendar), cycle tracking and care plans
const journalRouter = express.Router();
journalRouter.use(protect, authorize('user'));
journalRouter.get('/', journal.list);
journalRouter.get('/today', journal.today);
journalRouter.get('/report', journal.report);
journalRouter.put('/:date', journal.save);
journalRouter.delete('/:date', journal.remove);

const cycleRouter = express.Router();
cycleRouter.use(protect, authorize('user'));
cycleRouter.get('/', journal.cycle);
cycleRouter.put('/settings', journal.cycleSettings);

const plansRouter = express.Router();
plansRouter.use(protect, authorize('user'));
plansRouter.get('/templates', plans.templates);
plansRouter.get('/', plans.list);
plansRouter.post('/', plans.create);
plansRouter.patch('/:id/milestones/:mid', plans.updateMilestone);
plansRouter.post('/:id/milestones', plans.addMilestone);
plansRouter.delete('/:id/milestones/:mid', plans.removeMilestone);
plansRouter.post('/:id/end', plans.end);

module.exports = { journalRouter, cycleRouter, plansRouter };
