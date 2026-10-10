// Nura's guided symptom assessment.
//
// A short, empathetic conversation (severity -> duration -> other symptoms -> medicine)
// before Nura decides how urgent something is. The server is stateless: every reply
// carries an `assessment` state object that the client sends back with the next message.
//
// Reply extras understood by the client:
//   input:   { type: 'scale' | 'choice' | 'multi', id, question, options: [{ value, label, hint? }] }
//   summary: { level, title, message, reasons[], advice[], warnings[], specialty, nearest, nextSlot }
const Organization = require('../models/Organization');
const Slot = require('../models/Slot');
const { upcomingFilter } = require('../utils/slots');

// ── Symptom catalogue ─────────────────────────────────────────────────────
// associated[].flag: 'red' = emergency now, 'urgent' = see a doctor within 24 hours
const SYMPTOMS = {
  fever: {
    label: 'fever', specialty: 'General Physician', scale: 'unwell',
    match: /\b(fever|feverish|temperature|temp|chills|hot and cold)\b/,
    empathy: 'A fever can leave you feeling completely drained.',
    associated: [
      { value: 'chills', label: 'Chills or shivering' },
      { value: 'headache', label: 'Headache' },
      { value: 'cough', label: 'Cough' },
      { value: 'sore_throat', label: 'Sore throat' },
      { value: 'body_aches', label: 'Body aches' },
      { value: 'vomiting', label: 'Vomiting' },
      { value: 'rash', label: 'A new rash', flag: 'urgent' },
      { value: 'stiff_neck', label: 'Stiff neck', flag: 'red' },
      { value: 'breathing', label: 'Trouble breathing', flag: 'red' },
      { value: 'confusion', label: 'Confusion or extreme drowsiness', flag: 'red' }
    ],
    home: ['Rest and drink plenty of fluids (water, ORS, soups)', 'Paracetamol can ease fever and aches if it is safe for you', 'Wear light clothing and keep the room cool'],
    warnings: ['Fever above 103°F (39.4°C) or lasting more than 3 days', 'Stiff neck, rash that does not fade, confusion or trouble breathing']
  },
  headache: {
    label: 'headache', specialty: 'General Physician', scale: 'pain',
    match: /\b(headache|head ache|migraine|head hurts|head pain)\b/,
    empathy: 'Headaches can make it hard to focus on anything else.',
    associated: [
      { value: 'nausea', label: 'Nausea' },
      { value: 'light', label: 'Sensitivity to light or noise' },
      { value: 'fever', label: 'Fever', flag: 'urgent' },
      { value: 'stiff_neck', label: 'Stiff neck', flag: 'red' },
      { value: 'vision', label: 'Blurred or double vision', flag: 'red' },
      { value: 'weakness', label: 'Weakness or numbness', flag: 'red' },
      { value: 'sudden', label: 'Came on suddenly and severely', flag: 'red' },
      { value: 'injury', label: 'After a head injury', flag: 'urgent' }
    ],
    home: ['Rest in a quiet, dark room', 'Drink water: dehydration is a common trigger', 'Paracetamol may help if it is safe for you', 'Limit screens and caffeine for a while'],
    warnings: ['The worst headache of your life, or one that starts suddenly', 'Headache with fever and stiff neck, vision changes, weakness or confusion']
  },
  stomach: {
    label: 'stomach pain', specialty: 'Gastroenterologist', scale: 'pain',
    match: /\b(stomach|abdomen|abdominal|belly|tummy|vomit\w*|diarrh\w*|nausea|loose motion\w*|acidity|heartburn|cramps?)\b/,
    empathy: 'Stomach trouble can be really uncomfortable.',
    associated: [
      { value: 'nausea', label: 'Nausea' },
      { value: 'vomiting', label: 'Vomiting' },
      { value: 'diarrhoea', label: 'Diarrhoea' },
      { value: 'fever', label: 'Fever' },
      { value: 'bloating', label: 'Bloating or gas' },
      { value: 'no_fluids', label: "Can't keep fluids down", flag: 'urgent' },
      { value: 'right_lower', label: 'Pain in the lower right side', flag: 'urgent' },
      { value: 'blood', label: 'Blood in vomit or stool', flag: 'red' }
    ],
    home: ['Sip water or ORS often, in small amounts', 'Eat light, bland food (rice, bananas, toast) when you can', 'Avoid spicy, oily food, caffeine and alcohol for now'],
    warnings: ['Severe pain that keeps getting worse, especially low on the right side', 'Blood in vomit or stool, or signs of dehydration (very little urine, dizziness)']
  },
  cough: {
    label: 'cough', specialty: 'General Physician', scale: 'unwell',
    match: /\b(cough\w*|cold|flu|runny nose|congest\w*|sneez\w*|phlegm|mucus)\b/,
    empathy: 'A lingering cough can be exhausting.',
    associated: [
      { value: 'fever', label: 'Fever' },
      { value: 'sore_throat', label: 'Sore throat' },
      { value: 'runny_nose', label: 'Runny or blocked nose' },
      { value: 'wheezing', label: 'Wheezing', flag: 'urgent' },
      { value: 'shortness', label: 'Shortness of breath', flag: 'red' },
      { value: 'chest_pain', label: 'Chest pain', flag: 'red' },
      { value: 'blood', label: 'Coughing up blood', flag: 'red' }
    ],
    home: ['Warm drinks with honey and lemon can soothe a cough', 'Steam inhalation may ease congestion', 'Rest and stay hydrated'],
    warnings: ['Shortness of breath, chest pain or coughing up blood', 'A cough lasting more than 3 weeks']
  },
  throat: {
    label: 'sore throat', specialty: 'General Physician', scale: 'pain',
    match: /\b(sore throat|throat|tonsil\w*|swallow\w*)\b/,
    empathy: 'A sore throat can make even swallowing painful.',
    associated: [
      { value: 'fever', label: 'Fever' },
      { value: 'cough', label: 'Cough' },
      { value: 'glands', label: 'Swollen glands in the neck' },
      { value: 'white_patches', label: 'White patches on the tonsils', flag: 'urgent' },
      { value: 'drooling', label: "Can't swallow saliva", flag: 'red' },
      { value: 'breathing', label: 'Trouble breathing', flag: 'red' }
    ],
    home: ['Gargle with warm salt water a few times a day', 'Warm fluids and throat lozenges can help', 'Rest your voice'],
    warnings: ["Trouble breathing or you can't swallow your own saliva", 'High fever with white patches on the tonsils']
  },
  joint: {
    label: 'pain', specialty: 'Orthopedist', scale: 'pain',
    match: /\b(back ?pain|backache|joint|knee|shoulder|neck pain|stiff neck|neck|hip|ankle|wrist|sprain\w*|muscle\w*|fracture|bone)\b/,
    empathy: 'Pain like that can make everyday movement hard.',
    associated: [
      { value: 'swelling', label: 'Swelling' },
      { value: 'redness', label: 'Redness or warmth' },
      { value: 'injury', label: 'It started after an injury or fall', flag: 'urgent' },
      { value: 'numbness', label: 'Numbness or tingling' },
      { value: 'fever', label: 'Fever', flag: 'urgent' },
      { value: 'weight', label: "Can't put weight on it", flag: 'urgent' },
      { value: 'bladder', label: 'Loss of bladder or bowel control', flag: 'red' }
    ],
    home: ['Rest the area and avoid heavy lifting', 'A cold pack for 15 minutes (first 48 hours), then warmth', 'Gentle movement as pain allows'],
    warnings: ['Numbness in the legs or loss of bladder or bowel control', "You can't move or bear weight on it, or it looks deformed"]
  },
  skin: {
    label: 'skin problem', specialty: 'Dermatologist', scale: 'bother',
    match: /\b(rash|itch\w*|skin|hives|acne|eczema|blister\w*|spots?)\b/,
    empathy: 'Skin problems can be really irritating.',
    associated: [
      { value: 'itching', label: 'Itching' },
      { value: 'spreading', label: 'Spreading quickly', flag: 'urgent' },
      { value: 'fever', label: 'Fever', flag: 'urgent' },
      { value: 'blisters', label: 'Blisters or open sores' },
      { value: 'pain', label: 'Painful' },
      { value: 'swelling_face', label: 'Swelling of lips, face or tongue', flag: 'red' },
      { value: 'breathing', label: 'Trouble breathing', flag: 'red' }
    ],
    home: ['Keep the area clean and dry, and avoid scratching', 'Use a gentle, fragrance-free moisturiser', 'Think about anything new: soap, food, medicine or detergent'],
    warnings: ['Swelling of the face, lips or tongue, or trouble breathing', 'A rash with fever, or one that spreads fast or blisters']
  },
  dizzy: {
    label: 'dizziness', specialty: 'General Physician', scale: 'unwell',
    match: /\b(dizz\w*|lightheaded|light headed|vertigo|faint\w*|spinning)\b/,
    empathy: 'Feeling dizzy can be really unsettling.',
    associated: [
      { value: 'nausea', label: 'Nausea' },
      { value: 'headache', label: 'Headache' },
      { value: 'ringing', label: 'Ringing in the ears' },
      { value: 'not_eaten', label: "Haven't eaten or drunk much" },
      { value: 'fainted', label: 'Fainted or nearly fainted', flag: 'urgent' },
      { value: 'chest_pain', label: 'Chest pain or palpitations', flag: 'red' },
      { value: 'one_side', label: 'Weakness on one side or slurred speech', flag: 'red' }
    ],
    home: ['Sit or lie down until it passes, and stand up slowly', 'Drink water and have a light snack', 'Avoid driving until you feel steady'],
    warnings: ['Chest pain, fainting, slurred speech or weakness on one side', 'Dizziness that keeps coming back']
  },
  general: {
    label: 'symptoms', specialty: 'General Physician', scale: 'unwell',
    match: null,
    empathy: "I'm sorry you're not feeling well.",
    associated: [
      { value: 'fever', label: 'Fever' },
      { value: 'pain', label: 'Pain somewhere' },
      { value: 'tired', label: 'Unusual tiredness' },
      { value: 'nausea', label: 'Nausea' },
      { value: 'cough', label: 'Cough' },
      { value: 'breathing', label: 'Trouble breathing', flag: 'red' }
    ],
    home: ['Rest and stay well hydrated', 'Eat light, regular meals', 'Keep track of how you feel over the next day'],
    warnings: ['Trouble breathing, chest pain, confusion or fainting', 'Symptoms that get worse instead of better']
  }
};

const SYMPTOM_PICKER = [
  { value: 'fever', label: 'Fever' },
  { value: 'headache', label: 'Headache' },
  { value: 'stomach', label: 'Stomach or digestion' },
  { value: 'cough', label: 'Cough or cold' },
  { value: 'throat', label: 'Sore throat' },
  { value: 'joint', label: 'Back, joint or muscle pain' },
  { value: 'skin', label: 'Skin or rash' },
  { value: 'dizzy', label: 'Dizziness' },
  { value: 'general', label: 'Something else' }
];

const SCALES = {
  pain: { question: 'How bad is the pain right now?', labels: ['Very mild', 'Mild', 'Moderate', 'Severe', 'Worst possible'] },
  unwell: { question: 'How unwell do you feel right now?', labels: ['Barely', 'A little', 'Quite unwell', 'Very unwell', 'Extremely unwell'] },
  bother: { question: 'How much is it bothering you?', labels: ['Barely', 'A little', 'Quite a lot', 'A lot', 'Unbearable'] }
};

const DURATIONS = [
  { value: 'today', label: 'Started today' },
  { value: '1-2d', label: '1 to 2 days' },
  { value: '3-7d', label: '3 to 7 days' },
  { value: '>7d', label: 'More than a week' }
];
const DURATION_LABEL = { today: 'Started today', '1-2d': 'Going on for 1 to 2 days', '3-7d': 'Going on for 3 to 7 days', '>7d': 'Going on for more than a week' };

const MEDS = [
  { value: 'none', label: 'No medicine yet' },
  { value: 'paracetamol', label: 'Paracetamol (Panadol)' },
  { value: 'ibuprofen', label: 'Ibuprofen (Brufen)' },
  { value: 'antibiotic', label: 'Antibiotics' },
  { value: 'other', label: 'Something else' }
];

const LEVELS = ['home', 'soon', 'urgent', 'emergency'];
const bump = (level, by = 1) => LEVELS[Math.min(LEVELS.indexOf(level) + by, LEVELS.length - 2)]; // never auto-bump into emergency
const maxLevel = (a, b) => (LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b);

// ── Helpers ───────────────────────────────────────────────────────────────
const firstName = (name) => (name || '').trim().split(/\s+/)[0] || '';

const ageFrom = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
};

const detectSymptom = (text) => {
  const t = (text || '').toLowerCase();
  // Most specific first: a "stiff neck with fever" is a fever assessment
  for (const key of ['fever', 'headache', 'stomach', 'throat', 'cough', 'skin', 'dizzy', 'joint']) {
    if (SYMPTOMS[key].match.test(t)) return key;
  }
  return null;
};

const parseSeverity = (t) => {
  const n = t.match(/\b([1-5])\s*(\/\s*5|out of 5)?\b/);
  if (n) return Number(n[1]);
  const ten = t.match(/\b(10|[6-9])\s*(\/\s*10|out of 10)\b/);
  if (ten) return Math.max(1, Math.min(5, Math.round(Number(ten[1]) / 2)));
  if (/\b(worst|unbearable|excruciating|extreme\w*|can'?t bear)\b/.test(t)) return 5;
  if (/\b(severe|very bad|really bad|terrible|awful|very unwell|a lot)\b/.test(t)) return 4;
  if (/\b(moderate|quite|medium|bad|fairly)\b/.test(t)) return 3;
  if (/\b(mild|little|not too bad|manageable)\b/.test(t)) return 2;
  if (/\b(barely|slight|very mild|hardly)\b/.test(t)) return 1;
  return null;
};

const parseDuration = (t) => {
  if (/\b(more than a week|over a week|weeks|a month|months|2 weeks|two weeks)\b/.test(t)) return '>7d';
  if (/\b([3-7]|three|four|five|six|seven|few|several) days?\b|\ba week\b|\bweek\b/.test(t)) return '3-7d';
  if (/\b(yesterday|1 day|one day|2 days|two days|a day|a couple of days|1-2|since last night)\b/.test(t)) return '1-2d';
  if (/\b(today|this morning|few hours|hours?|just now|tonight|an hour)\b/.test(t)) return 'today';
  return null;
};

const parseOptions = (t, options) => {
  if (/^(no|none|nope|nothing|not really|no other symptoms?)\b/.test(t)) return [];
  const words = (s) => s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
  return options
    .filter((o) => t.includes(o.value.replace(/_/g, ' ')) || words(o.label).some((w) => t.includes(w)))
    .map((o) => o.value);
};

const parseMed = (t) => {
  if (/\b(no|none|nothing|not yet|haven'?t)\b/.test(t)) return 'none';
  if (/\b(paracetamol|panadol|calpol|tylenol|acetaminophen)\b/.test(t)) return 'paracetamol';
  if (/\b(ibuprofen|brufen|advil|nurofen|nsaid)\b/.test(t)) return 'ibuprofen';
  if (/\b(antibiotic\w*|amoxicillin|augmentin|azithromycin|cipro\w*)\b/.test(t)) return 'antibiotic';
  if (t.trim()) return 'other';
  return null;
};

// ── Questions ─────────────────────────────────────────────────────────────
const question = (state, text, input) => ({
  mood: 'empathetic',
  is_non_medical: false,
  category: 'Symptom check',
  specialty: '',
  urgency_level: 'none',
  hospital_recommendation: '',
  show_map: false,
  profile_impact_summary: '',
  conversational_response: text,
  trigger_question: '',
  precautionary_advice: '',
  emergency_flag: false,
  suggested_replies: [],
  cta: null,
  input,
  summary: null,
  assessment: state
});

const askSymptom = (state) => question(state,
  "I'm here to help. **What's bothering you the most?** Choose one, or describe it in your own words.",
  { type: 'choice', id: 'symptom', question: "What's bothering you?", options: SYMPTOM_PICKER });

const askSeverity = (state, user, opening) => {
  const s = SYMPTOMS[state.symptom];
  const scale = SCALES[s.scale];
  const name = firstName(user.name);
  const intro = opening
    ? `I'm sorry you're dealing with ${state.symptom === 'general' ? 'this' : `this ${s.label}`}${name ? `, ${name}` : ''}. ${s.empathy} I'll ask a few quick questions so I can guide you properly.\n\n`
    : '';
  return question(state, `${intro}**${scale.question}**`, {
    type: 'scale',
    id: 'severity',
    question: scale.question,
    options: scale.labels.map((label, i) => ({ value: i + 1, label }))
  });
};

const askDuration = (state) => question(state,
  `Thank you, that helps. **How long has this been going on?**`,
  { type: 'choice', id: 'duration', question: 'How long has it been going on?', options: DURATIONS });

const askAssociated = (state) => {
  const s = SYMPTOMS[state.symptom];
  return question(state,
    `Got it. **Are you noticing any of these as well?** Select all that apply, or choose "None of these".`,
    {
      type: 'multi',
      id: 'associated',
      question: 'Any other symptoms?',
      options: s.associated.map(({ value, label }) => ({ value, label })),
      noneLabel: 'None of these'
    });
};

const askMeds = (state) => question(state,
  `Almost done. **Have you taken any medicine for it so far?**`,
  { type: 'choice', id: 'meds', question: 'Any medicine taken?', options: MEDS });

// ── Nearest care, using the patient's location ────────────────────────────
const distanceKm = (a, b) => {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
};

const findCare = async (level, specialty, location) => {
  if (!location) return { nearest: null, nextSlot: null };
  const near = { $near: { $geometry: { type: 'Point', coordinates: [location.lng, location.lat] } } };
  const describe = (org) => org && {
    id: String(org._id),
    name: org.name,
    type: org.type,
    phone: org.phone,
    address: org.address,
    isPartner: org.isPartner,
    location: org.location,
    distanceKm: distanceKm(location, { lng: org.location.coordinates[0], lat: org.location.coordinates[1] })
  };

  if (level === 'emergency') {
    const hospital = await Organization.findOne({ status: 'approved', type: 'Hospital', location: near });
    return { nearest: describe(hospital), nextSlot: null };
  }

  // Closest partners, then the earliest open session with the right specialist among them
  const partners = await Organization.find({ status: 'approved', isPartner: true, location: near }).limit(8);
  if (!partners.length) return { nearest: null, nextSlot: null };
  const slot = await Slot.findOne({
    organization: { $in: partners.map((p) => p._id) },
    patient: null,
    specialty: { $regex: specialty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    ...upcomingFilter()
  }).sort({ date: 1, time: 1 });
  const org = slot ? partners.find((p) => String(p._id) === String(slot.organization)) : partners[0];
  return {
    nearest: describe(org),
    nextSlot: slot ? { id: String(slot._id), doctor: slot.doctor, specialty: slot.specialty, date: slot.date, time: slot.time } : null
  };
};

// ── Decision ──────────────────────────────────────────────────────────────
const LEVEL_TEXT = {
  emergency: {
    title: 'Get emergency care now',
    urgency: 'high',
    recommendation: 'HOSPITAL VISIT STRONGLY URGED (Emergency Care Required)',
    message: 'What you describe includes warning signs that need to be checked **right away**. Please call **1122** or go to the nearest emergency department now. Don\'t drive yourself if you feel unwell.'
  },
  urgent: {
    title: 'See a doctor within 24 hours',
    urgency: 'medium',
    recommendation: 'CLINIC VISIT RECOMMENDED',
    message: 'This isn\'t an emergency right now, but it should be checked by a doctor **within the next 24 hours**.'
  },
  soon: {
    title: 'Book a doctor in the next 2 to 3 days',
    urgency: 'low',
    recommendation: 'CLINIC VISIT RECOMMENDED',
    message: 'This doesn\'t sound urgent, but it\'s worth seeing a doctor **in the next couple of days** so it can be properly checked.'
  },
  home: {
    title: 'Home care should be enough for now',
    urgency: 'low',
    recommendation: 'HOME CARE FIRST (Clinic Visit Optional)',
    message: 'From what you\'ve told me, this sounds manageable **at home** for now. Keep an eye on how it changes.'
  }
};

const decide = (state, profile) => {
  const s = SYMPTOMS[state.symptom];
  const { severity = 2, duration = 'today', associated = [], meds = 'none' } = state.answers;
  const reasons = [];
  const notes = [];
  const picked = s.associated.filter((a) => associated.includes(a.value));
  const red = picked.filter((a) => a.flag === 'red');
  const urgentSigns = picked.filter((a) => a.flag === 'urgent');

  reasons.push(`${SCALES[s.scale].labels[severity - 1]} (${severity} out of 5)`);
  reasons.push(DURATION_LABEL[duration]);
  if (picked.length) reasons.push(`Also: ${picked.map((p) => p.label.toLowerCase()).join(', ')}`);

  let level = 'home';
  if (red.length) {
    level = 'emergency';
  } else {
    if (severity >= 5) level = state.symptom === 'stomach' || state.symptom === 'headache' ? 'emergency' : 'urgent';
    else if (severity === 4) level = 'soon';
    else if (severity === 3 && duration !== 'today') level = 'soon';

    if (urgentSigns.length) level = maxLevel(level, 'urgent');
    if (duration === '>7d') level = maxLevel(level, 'soon');
    if (duration === '3-7d') level = maxLevel(level, state.symptom === 'fever' ? 'urgent' : 'soon');
    if (severity === 4 && (state.symptom === 'fever' || duration !== 'today')) level = maxLevel(level, 'urgent');

    // Personal risk factors from the medical profile raise the level by one step
    const age = ageFrom(profile.dateOfBirth);
    const conditions = (profile.preExistingConditions || []).join(' ').toLowerCase();
    const pregnant = profile.pregnancyStatus && !/^(n\/a|not pregnant|)$/i.test(profile.pregnancyStatus.trim());
    const risks = [];
    if (age !== null && (age < 5 || age >= 65)) risks.push(`your age (${age})`);
    if (pregnant) risks.push(`your pregnancy (${profile.pregnancyStatus})`);
    if (/diabet/.test(conditions)) risks.push('diabetes');
    if (/(heart|cardiac)/.test(conditions)) risks.push('your heart condition');
    if (/(kidney|renal)/.test(conditions)) risks.push('your kidney condition');
    if (/(cancer|chemo|immun|hiv|transplant)/.test(conditions)) risks.push('a weakened immune system');
    if (/asthma|copd/.test(conditions) && ['cough', 'fever', 'throat'].includes(state.symptom)) risks.push('your asthma');
    if (risks.length && level !== 'emergency') {
      level = level === 'home' ? 'soon' : bump(level);
      reasons.push(`Because of ${risks.join(' and ')}, I'm being a little more cautious`);
    }
    if (meds !== 'none' && severity >= 3 && level === 'home') {
      level = 'soon';
      reasons.push("You've already taken medicine and still feel this way");
    }
  }

  // Medicine safety against allergies and conditions
  const allergies = (profile.allergies || []).join(' ').toLowerCase();
  const conditions = (profile.preExistingConditions || []).join(' ').toLowerCase();
  if (meds === 'ibuprofen') {
    if (/(ibuprofen|nsaid|aspirin|brufen)/.test(allergies)) notes.push('Your profile lists an allergy that may include **ibuprofen**. Please stop taking it and check with a doctor or pharmacist.');
    else if (/asthma/.test(conditions)) notes.push('Ibuprofen can make asthma worse for some people. Paracetamol is often a safer choice; check with a pharmacist.');
  }
  if (meds === 'antibiotic') {
    notes.push(/penicillin/.test(allergies)
      ? 'You\'re allergic to **penicillin**: make sure the antibiotic isn\'t penicillin-based (like amoxicillin or Augmentin), and only take antibiotics a doctor has prescribed.'
      : 'Only take antibiotics a doctor has prescribed, and finish the full course.');
  }
  if (meds === 'paracetamol' && /(paracetamol|acetaminophen|panadol)/.test(allergies)) {
    notes.push('Your profile lists an allergy to **paracetamol**. Please stop and speak to a doctor or pharmacist.');
  }

  return { level, reasons, notes, red };
};

const buildSummary = async (state, user, location) => {
  const profile = user.medicalProfile || {};
  const s = SYMPTOMS[state.symptom];
  const { level, reasons, notes, red } = decide(state, profile);
  const text = LEVEL_TEXT[level];
  const care = await findCare(level, s.specialty, location);
  const name = firstName(user.name);

  const lines = [];
  lines.push(`Thank you for answering${name ? `, ${name}` : ''}. ${text.message}`);
  if (red.length) lines.push(`I'm concerned about the **${red.map((r) => r.label.toLowerCase()).join(' and ')}** you mentioned.`);
  if (care.nearest) {
    lines.push(level === 'emergency'
      ? `The nearest hospital I know of is **${care.nearest.name}**, about ${care.nearest.distanceKm} km away.`
      : care.nextSlot
        ? `${level === 'home' ? "If you'd like a doctor to check it anyway, the" : 'The'} earliest open session with a **${s.specialty}** near you is at **${care.nearest.name}** (${care.nearest.distanceKm} km).`
        : `**${care.nearest.name}** is the closest MediGuide partner (${care.nearest.distanceKm} km).`);
  }
  if (level === 'home') lines.push(`Here's what usually helps:\n${s.home.map((h) => `• ${h}`).join('\n')}`);
  if (level !== 'emergency') lines.push(`**Get help sooner** if you notice:\n${s.warnings.map((w) => `• ${w}`).join('\n')}`);
  if (notes.length) lines.push(notes.join('\n\n'));
  if (level !== 'emergency') lines.push("I hope you feel better soon. I'm here if anything changes or you have more questions.");

  const summary = {
    level,
    title: text.title,
    message: text.message.replace(/\*\*/g, ''),
    reasons,
    advice: level === 'home' ? s.home : [],
    warnings: s.warnings,
    medicineNotes: notes.map((n) => n.replace(/\*\*/g, '')),
    specialty: level === 'emergency' ? 'Emergency Department' : s.specialty,
    nearest: care.nearest,
    nextSlot: care.nextSlot,
    symptom: s.label
  };

  return {
    mood: level === 'emergency' || level === 'urgent' ? 'concerned' : level === 'home' ? 'happy' : 'empathetic',
    is_non_medical: false,
    category: `Symptom check: ${s.label}`,
    specialty: summary.specialty,
    urgency_level: text.urgency,
    hospital_recommendation: text.recommendation,
    show_map: level === 'emergency' || level === 'urgent',
    profile_impact_summary: reasons.find((r) => r.startsWith('Because of')) || '',
    conversational_response: lines.join('\n\n'),
    trigger_question: '',
    precautionary_advice: '',
    emergency_flag: level === 'emergency',
    suggested_replies: level === 'emergency'
      ? ['Show me the nearest hospital', 'Call my emergency contact']
      : ['Book a doctor', 'What can I do at home?', 'I have another question'],
    cta: level === 'emergency' ? null : { type: 'book', specialty: s.specialty, slotId: care.nextSlot ? care.nextSlot.id : null },
    input: null,
    summary,
    assessment: null
  };
};

// ── Public API ────────────────────────────────────────────────────────────
const isStart = (text) => {
  const t = (text || '').toLowerCase();
  return /\b(i have a symptom|check a symptom|symptom check|not feeling well|feel(ing)? (sick|unwell|ill|bad)|i('| a)m sick|something is wrong|it hurts|hurts|in pain|feel pain)\b/.test(t) ||
    Boolean(detectSymptom(t));
};

// Start a new assessment from the patient's first message (or null if it isn't a symptom)
const start = (text, user) => {
  const t = (text || '').toLowerCase();
  const symptom = detectSymptom(t);
  if (!symptom && !isStart(t)) return null;
  const state = { v: 1, step: symptom ? 'severity' : 'symptom', symptom: symptom || null, answers: {}, retries: 0 };
  // Use anything already said ("high fever for two days, really bad")
  const sev = parseSeverity(t);
  const dur = parseDuration(t);
  if (dur) state.answers.duration = dur;
  if (symptom && sev && /\d\s*(\/|out of)|worst|severe|mild|moderate|unbearable/.test(t)) state.answers.severity = sev;
  if (!symptom) return askSymptom(state);
  return next(state, user, true);
};

// Move to the next unanswered question (or the summary)
const next = async (state, user, opening = false, location = null) => {
  const a = state.answers;
  if (!state.symptom) return askSymptom({ ...state, step: 'symptom' });
  if (a.severity == null) return askSeverity({ ...state, step: 'severity' }, user, opening);
  if (a.duration == null) return askDuration({ ...state, step: 'duration' });
  if (a.associated == null) return askAssociated({ ...state, step: 'associated' });
  if (a.meds == null) return askMeds({ ...state, step: 'meds' });
  return buildSummary({ ...state, step: 'done' }, user, location);
};

// Apply the patient's answer (tap or free text) to the current step
const answer = async (rawState, text, structured, user, location) => {
  const state = { ...rawState, answers: { ...(rawState.answers || {}) } };
  const t = (text || '').toLowerCase().trim();
  const value = structured && structured.id === state.step ? structured.value : undefined;

  if (/^(stop|cancel|never ?mind|skip this|start over)\b/.test(t)) {
    return { ...question(null, "No problem, I've stopped the symptom check. What would you like to talk about?", null), suggested_replies: ['Check a symptom', 'Book a doctor'] };
  }

  let parsed;
  switch (state.step) {
    case 'symptom':
      parsed = value || detectSymptom(t) || (t ? 'general' : null);
      if (parsed) state.symptom = SYMPTOMS[parsed] ? parsed : 'general';
      return next(state, user, Boolean(parsed), location);
    case 'severity':
      parsed = value != null ? Number(value) : parseSeverity(t);
      if (parsed >= 1 && parsed <= 5) state.answers.severity = parsed;
      break;
    case 'duration':
      parsed = value || parseDuration(t);
      if (parsed) state.answers.duration = parsed;
      break;
    case 'associated': {
      parsed = Array.isArray(value) ? value : parseOptions(t, SYMPTOMS[state.symptom].associated);
      state.answers.associated = parsed;
      // A danger sign means we stop asking questions and advise emergency care now
      const danger = SYMPTOMS[state.symptom].associated.some((o) => o.flag === 'red' && parsed.includes(o.value));
      if (danger) {
        state.answers.meds = state.answers.meds || 'none';
        return buildSummary({ ...state, step: 'done' }, user, location);
      }
      break;
    }
    case 'meds':
      parsed = value || parseMed(t);
      if (parsed) state.answers.meds = parsed;
      break;
    default:
      return null;
  }

  const stuck = state.step !== 'associated' && state.answers[state.step] == null;
  if (stuck) {
    // One gentle retry, then move on with a sensible default
    if ((state.retries || 0) < 1) {
      const re = await next({ ...state, retries: (state.retries || 0) + 1 }, user, false, location);
      re.conversational_response = `Sorry, I didn't quite catch that. ${re.conversational_response.replace(/^(Thank you, that helps\.|Got it\.|Almost done\.)\s*/, '')}`;
      return re;
    }
    const defaults = { severity: 3, duration: 'today', meds: 'none' };
    state.answers[state.step] = defaults[state.step];
  }
  state.retries = 0;
  return next(state, user, false, location);
};

// Closest approved facilities, for giving the AI real context about nearby care
const nearbyFacilities = async (location, limit = 3) => {
  if (!location) return [];
  const orgs = await Organization.find({
    status: 'approved',
    location: { $near: { $geometry: { type: 'Point', coordinates: [location.lng, location.lat] } } }
  }).limit(limit);
  return orgs.map((o) => ({
    name: o.name,
    type: o.type,
    isPartner: o.isPartner,
    distanceKm: distanceKm(location, { lng: o.location.coordinates[0], lat: o.location.coordinates[1] })
  }));
};

module.exports = { start, answer, isStart, detectSymptom, findCare, nearbyFacilities, SYMPTOMS };
