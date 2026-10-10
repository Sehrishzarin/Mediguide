// Health journal helpers: today's date in the patient's timezone, cycle predictions
// from logged period days, multi-day trend checks and the doctor summary.
const { addDays, daysBetween, PLANS } = require('./plans');

const TZ = process.env.CLINIC_TIMEZONE || 'Asia/Karachi';
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// ── Cycle tracking ────────────────────────────────────────────────────────
// Visible by default for female profiles; anyone can turn it on or off.
const cycleEnabled = (user) => {
  const choice = user.cycleTracking && user.cycleTracking.enabled;
  if (choice === true || choice === false) return choice;
  return /^female$/i.test((user.medicalProfile && user.medicalProfile.gender) || '');
};

const BLEEDING = ['light', 'medium', 'heavy'];

// Group logged period days into periods (gaps of up to 2 days count as the same period)
const periodsFrom = (entries) => {
  const days = entries
    .filter((e) => e.period && BLEEDING.includes(e.period.flow))
    .map((e) => e.date)
    .sort();
  const periods = [];
  for (const d of days) {
    const last = periods[periods.length - 1];
    if (last && daysBetween(last.end, d) <= 2) last.end = d;
    else periods.push({ start: d, end: d });
  }
  return periods.map((p) => ({ ...p, length: daysBetween(p.start, p.end) + 1 }));
};

const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;

const cycleSummary = (entries, today = todayIso()) => {
  const periods = periodsFrom(entries);
  const lengths = [];
  for (let i = 1; i < periods.length; i++) {
    const len = daysBetween(periods[i - 1].start, periods[i].start);
    if (len >= 15 && len <= 60) lengths.push(len); // ignore gaps from missed logging
  }
  const recent = lengths.slice(-6);
  const avgCycle = recent.length ? Math.round(mean(recent)) : 28;
  const avgPeriod = periods.length ? Math.round(mean(periods.slice(-6).map((p) => p.length))) : 5;
  const variation = recent.length >= 3 ? Math.max(...recent) - Math.min(...recent) : 0;
  const last = periods[periods.length - 1] || null;

  if (!last) {
    return { hasData: false, avgCycle, avgPeriod, periods: [], predictions: null, phase: null, message: 'Log the days of your period to start seeing predictions.' };
  }

  const cycleDay = daysBetween(last.start, today) + 1;
  const nextStart = addDays(last.start, avgCycle);
  const ovulation = addDays(nextStart, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const inPeriod = today >= last.start && today <= last.end;
  let phase = 'luteal';
  if (inPeriod) phase = 'period';
  else if (today >= fertileStart && today <= fertileEnd) phase = 'fertile';
  else if (today < fertileStart) phase = 'follicular';
  const daysLate = daysBetween(nextStart, today);

  // Upcoming predicted periods for the calendar (next 3)
  const upcoming = [0, 1, 2].map((i) => {
    const start = addDays(nextStart, i * avgCycle);
    return { start, end: addDays(start, avgPeriod - 1) };
  });

  return {
    hasData: true,
    avgCycle,
    avgPeriod,
    cyclesLogged: lengths.length,
    irregular: variation > 7,
    lastPeriod: last,
    cycleDay,
    phase,
    predictions: {
      nextPeriodStart: nextStart,
      daysUntilNext: daysBetween(today, nextStart),
      ovulation,
      fertileWindow: { start: fertileStart, end: fertileEnd },
      upcoming
    },
    late: daysLate >= 5 ? { days: daysLate } : null,
    periods: periods.slice(-12).reverse(),
    accuracy: lengths.length >= 3 ? 'good' : lengths.length >= 1 ? 'learning' : 'estimate',
    message: lengths.length < 2
      ? 'Predictions get more accurate after you log 2 to 3 cycles.'
      : variation > 7 ? 'Your cycles vary by more than a week. Predictions are less certain; mention this to a doctor if it is new.' : ''
  };
};

// ── Trends across recent days ─────────────────────────────────────────────
const trendAlerts = (entries, today = todayIso()) => {
  const alerts = [];
  const byDate = Object.fromEntries(entries.map((e) => [e.date, e]));
  const last = (n) => Array.from({ length: n }, (_, i) => byDate[addDays(today, -i)]).filter(Boolean);

  const recent3 = last(3);
  if (recent3.length === 3 && recent3.every((e) => e.temperature >= 38)) {
    alerts.push({ level: 'urgent', title: 'Fever for 3 days', message: 'A fever lasting 3 days or more should be checked by a doctor.' });
  }
  const recent7 = last(7);
  const lowMood = recent7.filter((e) => e.mood && e.mood <= 2).length;
  if (lowMood >= 5) {
    alerts.push({ level: 'warning', title: 'Low mood most days this week', message: 'You have logged low mood on most days. Talking to someone you trust or a doctor can really help.' });
  }
  const tbMissed = recent7.filter((e) => e.planFields && e.planFields.medsTaken === false).length;
  if (tbMissed >= 2) {
    alerts.push({ level: 'warning', title: 'Missed medicines', message: 'You missed your medicine on more than one day this week. Missing doses can make treatment less effective. Talk to your clinic if it is hard to keep up.' });
  }
  return alerts;
};

// ── Doctor summary (structured; the client renders and prints it) ─────────
const report = (entries, plans, user, days, today = todayIso()) => {
  const from = addDays(today, -(days - 1));
  const inRange = entries.filter((e) => e.date >= from && e.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const avg = (key) => {
    const vals = inRange.map((e) => e[key]).filter((v) => typeof v === 'number');
    return vals.length ? Math.round(mean(vals) * 10) / 10 : null;
  };
  const symptomCounts = {};
  inRange.forEach((e) => (e.symptoms || []).forEach((s) => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));
  const temps = inRange.filter((e) => typeof e.temperature === 'number');
  const plan = (p) => {
    const field = (id) => inRange.map((e) => (e.planFields || {})[id]).filter((v) => v !== undefined && v !== null && v !== '');
    return { type: p.type, title: PLANS[p.type] ? PLANS[p.type].title : p.type, startDate: p.startDate, settings: p.settings, adherence: field('medsTaken').length ? Math.round((field('medsTaken').filter(Boolean).length / field('medsTaken').length) * 100) : null };
  };
  return {
    patient: {
      name: user.name,
      dateOfBirth: user.medicalProfile && user.medicalProfile.dateOfBirth,
      gender: user.medicalProfile && user.medicalProfile.gender,
      allergies: (user.medicalProfile && user.medicalProfile.allergies) || [],
      conditions: (user.medicalProfile && user.medicalProfile.preExistingConditions) || [],
      medications: ((user.medicalProfile && user.medicalProfile.currentMedications) || []).map((m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' '))
    },
    range: { from, to: today, days, daysLogged: inRange.length },
    averages: { mood: avg('mood'), energy: avg('energy'), pain: avg('pain') },
    temperature: temps.length ? { max: Math.max(...temps.map((e) => e.temperature)), daysWithFever: temps.filter((e) => e.temperature >= 38).length } : null,
    topSymptoms: Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
    plans: plans.filter((p) => p.status === 'active').map(plan),
    entries: inRange.map((e) => ({ date: e.date, mood: e.mood, energy: e.energy, pain: e.pain, temperature: e.temperature, symptoms: e.symptoms, notes: e.notes, planFields: e.planFields }))
  };
};

module.exports = { todayIso, cycleEnabled, cycleSummary, periodsFrom, trendAlerts, report };
