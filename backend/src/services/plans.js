// Care plan templates: timelines of check-ups/tests, daily journal questions and
// danger signs for long-term conditions.
//
// Content follows widely used general guidance (e.g. WHO antenatal care schedule,
// standard 6-month TB regimen, common chronic-disease follow-up intervals). It is a
// starting point: every plan tells patients to follow their own doctor's schedule,
// and every milestone date can be edited.

const DAY = 86400000;
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => iso(new Date(toDate(s).getTime() + n * DAY));
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);

// ── Daily question field types understood by the client ─────────────────
// choice: { options: [{value,label}] }, number: { unit, min, max, step }, boolean, multi: { options }
const PLANS = {
  pregnancy: {
    title: 'Pregnancy',
    summary: 'Week-by-week guide with antenatal visits, scans and tests.',
    startLabel: 'First day of your last period',
    altStart: { key: 'dueDate', label: 'Or your due date' },
    durationDays: 280,
    dailyFields: [
      { id: 'babyMovements', label: 'Baby movements today', type: 'choice', fromWeek: 24,
        options: [{ value: 'normal', label: 'Normal' }, { value: 'fewer', label: 'Fewer than usual' }, { value: 'none', label: 'None felt' }] },
      { id: 'swelling', label: 'Swelling of face, hands or feet', type: 'choice',
        options: [{ value: 'none', label: 'None' }, { value: 'mild', label: 'Mild (feet)' }, { value: 'severe', label: 'Face or hands' }] },
      { id: 'bpSystolic', label: 'Blood pressure (top number)', type: 'number', unit: 'mmHg', min: 60, max: 260, optional: true },
      { id: 'bpDiastolic', label: 'Blood pressure (bottom number)', type: 'number', unit: 'mmHg', min: 30, max: 160, optional: true },
      { id: 'ironTaken', label: 'Took iron and folic acid', type: 'boolean' }
    ],
    dangerSigns: [
      'Vaginal bleeding or leaking fluid',
      'Severe headache, blurred vision or fits',
      'Severe pain in the belly',
      'Fever, or swelling of the face and hands',
      'Baby moving less than usual (from about 28 weeks)'
    ],
    note: 'Follow the schedule your doctor or midwife gives you. Dates here are a general guide.'
  },
  tb: {
    title: 'TB treatment',
    summary: 'Six-month treatment with daily medicine tracking and sputum tests.',
    startLabel: 'Treatment start date',
    durationDays: 182,
    dailyFields: [
      { id: 'medsTaken', label: 'Took my TB medicines today', type: 'boolean' },
      { id: 'sideEffects', label: 'Side effects', type: 'multi',
        options: [
          { value: 'nausea', label: 'Nausea' },
          { value: 'yellow', label: 'Yellow eyes or skin' },
          { value: 'vision', label: 'Blurred vision or colour changes' },
          { value: 'tingling', label: 'Tingling in hands or feet' },
          { value: 'rash', label: 'Skin rash' },
          { value: 'joint', label: 'Joint pain' }
        ] }
    ],
    dangerSigns: [
      'Yellow eyes or skin, or dark urine with belly pain',
      'Changes in eyesight or colour vision',
      'Coughing up blood or trouble breathing',
      'Severe rash or vomiting that stops you taking medicine'
    ],
    note: 'Orange-red urine and tears are a normal effect of rifampicin. Never stop treatment early, even if you feel better.'
  },
  chemo: {
    title: 'Chemotherapy',
    summary: 'Cycle-by-cycle calendar with blood tests and fever watch.',
    startLabel: 'First day of cycle 1',
    settings: [
      { id: 'cycleDays', label: 'Days per cycle', type: 'choice', options: [{ value: 14, label: '14 days' }, { value: 21, label: '21 days' }, { value: 28, label: '28 days' }], default: 21 },
      { id: 'cycles', label: 'Number of cycles', type: 'number', min: 1, max: 12, default: 6 }
    ],
    dailyFields: [
      { id: 'nausea', label: 'Nausea', type: 'choice', options: [{ value: 0, label: 'None' }, { value: 1, label: 'Mild' }, { value: 2, label: 'Moderate' }, { value: 3, label: 'Severe' }] },
      { id: 'mouthSores', label: 'Mouth sores', type: 'boolean' },
      { id: 'appetite', label: 'Appetite', type: 'choice', options: [{ value: 'good', label: 'Good' }, { value: 'low', label: 'Low' }, { value: 'none', label: 'Not eating' }] }
    ],
    dangerSigns: [
      'Temperature of 38°C (100.4°F) or higher: call your cancer care team or go to the emergency department straight away',
      'Shivering or feeling suddenly very unwell',
      'Bleeding or unusual bruising',
      "Vomiting or diarrhoea that won't stop, or not able to drink"
    ],
    note: 'Your oncology team sets your exact schedule. Fever during chemotherapy can be serious: always act on it.'
  },
  diabetes: {
    title: 'Diabetes',
    summary: 'Blood sugar log with regular HbA1c, eye, foot and kidney checks.',
    startLabel: 'Plan start date',
    durationDays: 365,
    dailyFields: [
      { id: 'glucose', label: 'Blood sugar', type: 'number', unit: 'mg/dL', min: 20, max: 600, optional: true },
      { id: 'glucoseTiming', label: 'When was it measured?', type: 'choice', options: [{ value: 'fasting', label: 'Fasting' }, { value: 'before_meal', label: 'Before a meal' }, { value: 'after_meal', label: '2 hrs after a meal' }, { value: 'bedtime', label: 'Bedtime' }] },
      { id: 'medsTaken', label: 'Took my diabetes medicine', type: 'boolean' },
      { id: 'feetChecked', label: 'Checked my feet', type: 'boolean' }
    ],
    dangerSigns: [
      'Blood sugar below 70 mg/dL with shaking, sweating or confusion',
      'Blood sugar above 300 mg/dL, or very thirsty with vomiting',
      'A foot wound that is not healing or looks infected'
    ],
    note: 'Targets differ from person to person. Ask your doctor for yours.'
  },
  hypertension: {
    title: 'High blood pressure',
    summary: 'Blood pressure log with regular reviews and yearly tests.',
    startLabel: 'Plan start date',
    durationDays: 365,
    dailyFields: [
      { id: 'bpSystolic', label: 'Blood pressure (top number)', type: 'number', unit: 'mmHg', min: 60, max: 260 },
      { id: 'bpDiastolic', label: 'Blood pressure (bottom number)', type: 'number', unit: 'mmHg', min: 30, max: 160 },
      { id: 'medsTaken', label: 'Took my blood pressure medicine', type: 'boolean' }
    ],
    dangerSigns: [
      'Blood pressure 180/120 or higher with chest pain, breathlessness, severe headache, confusion or weakness: call 1122',
      'Blood pressure 180/120 or higher without symptoms: recheck after 5 minutes and contact your doctor today'
    ],
    note: 'Measure seated after 5 minutes of rest, arm at heart level.'
  },
  asthma: {
    title: 'Asthma',
    summary: 'Track reliever use and night symptoms, with regular reviews.',
    startLabel: 'Plan start date',
    durationDays: 365,
    dailyFields: [
      { id: 'relieverPuffs', label: 'Reliever inhaler puffs today', type: 'number', unit: 'puffs', min: 0, max: 60 },
      { id: 'nightSymptoms', label: 'Woke up with asthma symptoms', type: 'boolean' },
      { id: 'preventerTaken', label: 'Took my preventer inhaler', type: 'boolean' }
    ],
    dangerSigns: [
      "Too breathless to speak in full sentences, or the reliever isn't helping: call 1122",
      'Lips or fingertips turning blue',
      'Needing the reliever more than every 4 hours'
    ],
    note: 'Needing your reliever more than twice a week means your asthma may not be well controlled. Book a review.'
  }
};

// ── Milestone generation ──────────────────────────────────────────────────
const m = (key, title, dueDate, kind, description = '') => ({ key, title, description, dueDate, kind });

const buildMilestones = (type, startDate, settings, profile = {}) => {
  const out = [];
  if (type === 'pregnancy') {
    const lmp = startDate;
    const at = (weeks) => addDays(lmp, weeks * 7);
    out.push(m('anc1', 'First antenatal visit', at(10), 'visit', 'Booking visit: history, blood pressure, weight and first blood tests. Aim for before 12 weeks.'));
    out.push(m('bloods1', 'First blood and urine tests', at(10), 'test', 'Usually haemoglobin, blood group, blood sugar and screening for infections such as hepatitis B, HIV and syphilis.'));
    out.push(m('folic', 'Start iron and folic acid daily', at(4), 'medicine', 'Taken throughout pregnancy as advised by your doctor.'));
    out.push(m('scan1', 'Dating scan', at(12), 'test', 'Ultrasound usually done between 11 and 14 weeks to confirm dates.'));
    out.push(m('tt1', 'Tetanus vaccine, first dose', at(16), 'vaccine', 'Usually two doses about a month apart, as advised.'));
    out.push(m('tt2', 'Tetanus vaccine, second dose', at(20), 'vaccine'));
    out.push(m('anc2', 'Antenatal visit (20 weeks)', at(20), 'visit'));
    out.push(m('scan2', 'Anatomy scan', at(20), 'test', "Detailed ultrasound usually done between 18 and 22 weeks to check the baby's growth and organs."));
    out.push(m('anc3', 'Antenatal visit (26 weeks)', at(26), 'visit'));
    out.push(m('gtt', 'Glucose test for gestational diabetes', at(26), 'test', 'Usually between 24 and 28 weeks.'));
    if (/-$/.test(profile.bloodGroup || '')) {
      out.push(m('antid', 'Anti-D injection (Rh negative)', at(28), 'medicine', 'Your profile shows a Rh-negative blood group. Many doctors give anti-D around 28 weeks; ask yours.'));
    }
    out.push(m('kicks', 'Start noticing baby movements daily', at(28), 'milestone', 'Get to know your baby\'s usual pattern. Fewer movements than usual needs checking the same day.'));
    [30, 34, 36, 38, 40].forEach((w) => out.push(m(`anc_${w}`, `Antenatal visit (${w} weeks)`, at(w), 'visit')));
    out.push(m('bag', 'Pack your hospital bag and plan the birth', at(35), 'milestone'));
    out.push(m('due', 'Due date', settings.dueDate || at(40), 'milestone', 'Only a few babies arrive exactly on their due date.'));
  }
  if (type === 'tb') {
    for (let month = 1; month <= 6; month++) {
      out.push(m(`visit_${month}`, `Monthly follow-up (month ${month})`, addDays(startDate, month * 30), 'visit', 'Collect medicines, check weight and side effects.'));
    }
    out.push(m('sputum_2', 'Sputum test (end of month 2)', addDays(startDate, 56), 'test', 'Checks the treatment is working before the continuation phase.'));
    out.push(m('phase2', 'Continuation phase starts', addDays(startDate, 60), 'milestone', 'Usually fewer medicines for the remaining 4 months.'));
    out.push(m('sputum_5', 'Sputum test (month 5)', addDays(startDate, 150), 'test'));
    out.push(m('sputum_6', 'Sputum test (end of treatment)', addDays(startDate, 178), 'test'));
    out.push(m('finish', 'Treatment complete', addDays(startDate, 182), 'milestone'));
  }
  if (type === 'chemo') {
    const cycleDays = Number(settings.cycleDays) || 21;
    const cycles = Math.min(Math.max(Number(settings.cycles) || 6, 1), 12);
    for (let c = 1; c <= cycles; c++) {
      const day1 = addDays(startDate, (c - 1) * cycleDays);
      if (c > 1) out.push(m(`blood_${c}`, `Blood count before cycle ${c}`, addDays(day1, -1), 'test', 'Checks your blood is ready for the next cycle.'));
      out.push(m(`cycle_${c}`, `Cycle ${c}, day 1`, day1, 'medicine'));
      out.push(m(`nadir_${c}`, `Cycle ${c}: low-immunity days start`, addDays(day1, 7), 'milestone', 'Infection risk is usually highest about 7 to 14 days after treatment. Watch for fever.'));
    }
    out.push(m('review', 'End-of-treatment review', addDays(startDate, cycles * cycleDays + 14), 'review'));
  }
  if (type === 'diabetes') {
    [0, 90, 180, 270, 360].forEach((d, i) => out.push(m(`hba1c_${i}`, 'HbA1c blood test', addDays(startDate, d), 'test', 'Shows your average blood sugar over about 3 months.')));
    out.push(m('eyes', 'Eye check (retina)', addDays(startDate, 30), 'test', 'Yearly check for diabetes-related eye changes.'));
    out.push(m('feet', 'Foot examination', addDays(startDate, 30), 'visit', 'Yearly check of feeling and circulation; check your own feet daily.'));
    out.push(m('kidney', 'Kidney test (urine and blood)', addDays(startDate, 60), 'test'));
    out.push(m('flu', 'Flu vaccine', addDays(startDate, 45), 'vaccine'));
  }
  if (type === 'hypertension') {
    [30, 120, 210, 300].forEach((d, i) => out.push(m(`review_${i}`, 'Blood pressure review', addDays(startDate, d), 'review', 'Bring your blood pressure log.')));
    out.push(m('labs', 'Kidney and cholesterol tests', addDays(startDate, 30), 'test'));
  }
  if (type === 'asthma') {
    out.push(m('technique', 'Inhaler technique check', addDays(startDate, 14), 'review'));
    out.push(m('action', 'Written asthma action plan with your doctor', addDays(startDate, 14), 'visit'));
    out.push(m('review_6', 'Asthma review', addDays(startDate, 180), 'review'));
    out.push(m('review_12', 'Yearly asthma review', addDays(startDate, 360), 'review'));
    out.push(m('flu', 'Flu vaccine', addDays(startDate, 30), 'vaccine'));
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

// ── Progress (e.g. "Week 24 of 40") ───────────────────────────────────────
const progress = (plan, today) => {
  const day = daysBetween(plan.startDate, today);
  // Plan that starts in the future
  if (day < 0) return { label: `Starts ${plan.startDate}`, notStarted: true, startsInDays: -day, day, percent: 0, week: 0 };
  if (plan.type === 'pregnancy') {
    const week = Math.max(0, Math.floor(day / 7));
    const trimester = week < 14 ? 1 : week < 28 ? 2 : 3;
    const due = plan.settings.dueDate || addDays(plan.startDate, 280);
    return { label: `Week ${week}${week >= 0 ? `, day ${day % 7}` : ''}`, week, day, trimester, percent: Math.min(100, Math.round((day / 280) * 100)), dueDate: due, daysToGo: daysBetween(today, due) };
  }
  if (plan.type === 'tb') {
    const month = Math.min(6, Math.floor(day / 30) + 1);
    return { label: `Month ${month} of 6 (${day < 60 ? 'intensive' : 'continuation'} phase)`, month, day, percent: Math.min(100, Math.round((day / 182) * 100)) };
  }
  if (plan.type === 'chemo') {
    const cycleDays = Number(plan.settings.cycleDays) || 21;
    const cycles = Number(plan.settings.cycles) || 6;
    const total = cycleDays * cycles;
    if (day >= total) {
      // All cycles given: no more cycle days or low-immunity windows
      return { label: `All ${cycles} cycles complete`, finished: true, cycle: cycles, cycleDay: null, day, lowImmunity: false, percent: 100 };
    }
    const cycle = Math.floor(day / cycleDays) + 1;
    const cycleDay = (day % cycleDays) + 1;
    return { label: `Cycle ${cycle} of ${cycles}, day ${cycleDay}`, cycle, cycleDay, day, lowImmunity: cycleDay >= 7 && cycleDay <= 14, percent: Math.min(100, Math.round((day / total) * 100)) };
  }
  return { label: `Day ${day + 1}`, day, percent: Math.min(100, Math.round((day / 365) * 100)) };
};

// Daily questions that apply today (some pregnancy questions start at a given week)
const fieldsFor = (plan, today) => {
  const def = PLANS[plan.type];
  const p = progress(plan, today);
  return def.dailyFields.filter((f) => !f.fromWeek || (p.week ?? 0) >= f.fromWeek);
};

// ── Danger checks on a saved journal entry ────────────────────────────────
// Returns [{ level: 'emergency'|'urgent'|'warning', title, message, planType? }]
const checkEntry = (entry, plans, today) => {
  const alerts = [];
  const f = entry.planFields || {};
  const t = entry.temperature;
  const add = (level, title, message, planType) => alerts.push({ level, title, message, planType });
  const active = (type) => plans.find((p) => p.type === type && p.status === 'active');

  const chemo = active('chemo');
  if (chemo && t >= 38) add('emergency', 'Fever during chemotherapy', 'A temperature of 38°C or higher during chemotherapy needs urgent care. Call your cancer care team now or go to the emergency department.', 'chemo');

  const preg = active('pregnancy');
  if (preg) {
    const p = progress(preg, today);
    if (f.babyMovements === 'none' && p.week >= 24) add('emergency', 'No baby movements', 'Not feeling your baby move needs to be checked today. Contact your maternity unit or go to hospital now.', 'pregnancy');
    else if (f.babyMovements === 'fewer' && p.week >= 24) add('urgent', 'Fewer baby movements', 'Contact your doctor or maternity unit today. Don\'t wait until tomorrow.', 'pregnancy');
    if (f.swelling === 'severe') add('urgent', 'Swelling of face or hands', 'This can be a sign of high blood pressure in pregnancy (pre-eclampsia). Get your blood pressure checked today.', 'pregnancy');
    if (Number(f.bpSystolic) >= 160 || Number(f.bpDiastolic) >= 110) add('emergency', 'Very high blood pressure in pregnancy', 'Go to hospital now, especially with headache, blurred vision or belly pain.', 'pregnancy');
    else if (Number(f.bpSystolic) >= 140 || Number(f.bpDiastolic) >= 90) add('urgent', 'High blood pressure in pregnancy', 'Contact your doctor today to have it checked.', 'pregnancy');
  }

  const tb = active('tb');
  if (tb && Array.isArray(f.sideEffects)) {
    if (f.sideEffects.includes('yellow')) add('urgent', 'Yellow eyes or skin', 'This can be a liver reaction to TB medicines. Contact your TB clinic today before your next dose.', 'tb');
    if (f.sideEffects.includes('vision')) add('urgent', 'Vision changes', 'Changes in eyesight can be a side effect of TB medicine. Contact your TB clinic today.', 'tb');
  }

  const dm = active('diabetes');
  if (dm && f.glucose != null && f.glucose !== '') {
    const g = Number(f.glucose);
    if (g < 70) add('urgent', 'Low blood sugar', 'Take 15 g of fast sugar now (half a glass of juice or 3 teaspoons of sugar in water), recheck in 15 minutes. If confused or drowsy, get help immediately.', 'diabetes');
    else if (g > 300) add('urgent', 'Very high blood sugar', 'Drink water and recheck. Contact your doctor today, or get urgent care if you are vomiting, very drowsy or breathing fast.', 'diabetes');
  }

  const htn = active('hypertension');
  if (htn && (Number(f.bpSystolic) >= 180 || Number(f.bpDiastolic) >= 120)) {
    add('urgent', 'Very high blood pressure', 'Rest for 5 minutes and measure again. If it is still 180/120 or higher, contact your doctor today. With chest pain, breathlessness, severe headache, confusion or weakness, call 1122.', 'hypertension');
  }

  const asthma = active('asthma');
  if (asthma && Number(f.relieverPuffs) >= 12) add('urgent', 'Using your reliever a lot', 'Needing many puffs in a day means your asthma is not controlled. Contact your doctor today; if you are too breathless to speak, call 1122.', 'asthma');

  if (!chemo && t >= 39.4) add('warning', 'High temperature', 'A temperature this high is worth checking with Nura or a doctor, especially if it lasts more than a day.');
  return alerts;
};

const templateList = () => Object.entries(PLANS).map(([type, p]) => ({
  type, title: p.title, summary: p.summary, startLabel: p.startLabel, altStart: p.altStart || null,
  settings: p.settings || [], dailyFields: p.dailyFields, dangerSigns: p.dangerSigns, note: p.note
}));

module.exports = { PLANS, buildMilestones, progress, fieldsFor, checkEntry, templateList, addDays, daysBetween, iso };
