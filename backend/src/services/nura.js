// Nura — MediGuide's health assistant: conversational intents that are not
// symptom triage (greetings, wellness questions, profile questions, crisis support).
// Used directly when no Gemini key is configured, and as a safety net otherwise.

const NAME = 'Nura';

// Every reply has the same shape as a triage result so the client renders one format.
const reply = (fields) => ({
  is_non_medical: true,
  category: 'Conversation',
  specialty: '',
  urgency_level: 'none',
  hospital_recommendation: '',
  show_map: false,
  profile_impact_summary: '',
  conversational_response: '',
  trigger_question: '',
  precautionary_advice: '',
  emergency_flag: false,
  suggested_replies: [],
  cta: null,
  ...fields
});

const has = (text, words) => words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(text));

// ── Intent detection ──────────────────────────────────────────────────────
const CRISIS = /\b(suicid\w*|kill (myself|me)|end (my|it all)|want to die|self[- ]?harm|hurt myself|cutting myself|no reason to live)\b/i;

const WELLNESS_TOPICS = {
  sleep: ['sleep', 'insomnia', 'sleeping', 'tired all the time', 'can\'t sleep', 'nap'],
  stress: ['stress', 'stressed', 'anxiety', 'anxious', 'panic', 'worried', 'overwhelmed', 'burnout', 'depressed', 'sad', 'low mood'],
  nutrition: ['diet', 'nutrition', 'eat', 'eating', 'food', 'healthy meal', 'sugar', 'protein', 'vitamin', 'vitamins'],
  hydration: ['water', 'hydration', 'hydrated', 'dehydrated', 'dehydration', 'drink enough'],
  exercise: ['exercise', 'workout', 'fitness', 'walk', 'walking', 'gym', 'run', 'running', 'active'],
  weight: ['weight', 'bmi', 'overweight', 'lose weight', 'obese', 'underweight']
};

const SYMPTOM_HINT = /\b(pain\w*|ache\w*|aching|hurts?|stiff\w*|sore|swollen|swelling|fever|temperature|rash|itch\w*|cough\w*|vomit\w*|nausea|dizz\w*|bleed\w*|numb\w*|cramp\w*|injur\w*|sprain\w*)\b/;

const detectIntent = (text) => {
  const t = (text || '').trim().toLowerCase();
  if (!t) return { type: 'empty' };
  if (CRISIS.test(t)) return { type: 'crisis' };
  if (/^(hi|hello|hey|salam|assalam[ou] ?alaikum|good (morning|afternoon|evening)|hi there|hey there)[\s!.,]*(nura)?[\s!.]*$/i.test(t)) return { type: 'greeting' };
  if (/^(thanks|thank you|thx|ok|okay|got it|great|perfect|bye|goodbye|good night)[\s!.]*(nura)?[\s!.]*$/i.test(t)) return { type: 'thanks' };
  if (/(who are you|what are you|your name|what can you do|how can you help|what do you do)/i.test(t)) return { type: 'identity' };
  if (/\bmy (allerg\w*|medication\w*|medicine\w*|meds|blood (group|type)|conditions?|profile|emergency contact|bmi|height|weight)\b/i.test(t) ||
      /what (am i|i'?m) allergic/i.test(t)) return { type: 'profile' };
  if (/(book|appointment|see a doctor|visit a doctor|consult a doctor|find a doctor|doctor session)/i.test(t)) return { type: 'appointment' };
  if (/(medicine|medication|tablet|pill|dose|dosage|side effect|antibiotic|painkiller|paracetamol|ibuprofen|panadol|amoxicillin|penicillin)/i.test(t)) return { type: 'medication' };
  // A physical symptom ("my neck is stiff from sleeping") is triage, not a wellness tip
  if (SYMPTOM_HINT.test(t)) return { type: 'other' };
  for (const [topic, words] of Object.entries(WELLNESS_TOPICS)) {
    if (has(t, words)) return { type: 'wellness', topic };
  }
  return { type: 'other' };
};

// ── Helpers using the stored medical profile ──────────────────────────────
const list = (arr) => (arr && arr.length ? arr.join(', ') : '');
const medsOf = (p) => (p.currentMedications || []).map((m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' ')).filter(Boolean);

const bmiOf = (p) => {
  if (!p.height || !p.weight) return null;
  const bmi = Math.round((p.weight / ((p.height / 100) ** 2)) * 10) / 10;
  const band = bmi === 25 ? 'right at the top of the healthy range (borderline)' : bmi < 18.5 ? 'below the healthy range' : bmi < 25 ? 'in the healthy range' : bmi < 30 ? 'above the healthy range (overweight)' : 'in the obese range';
  return { value: bmi.toFixed(1), band };
};

const firstName = (name) => (name || '').trim().split(/\s+/)[0] || '';

// ── Replies ───────────────────────────────────────────────────────────────
const crisisReply = () => reply({
  is_non_medical: false,
  category: 'Emotional crisis support',
  urgency_level: 'high',
  emergency_flag: true,
  conversational_response:
    `I'm really sorry you're feeling this way, and I'm glad you told me. You deserve support right now.\n\n` +
    `**If you might act on these thoughts, call 1122 or go to the nearest emergency department now.**\n\n` +
    `You can also talk to someone you trust and stay with them. A doctor or mental health professional can help, and these feelings can get better.`,
  precautionary_advice: 'Please do not stay alone. Call 1122 or reach someone you trust right now.',
  suggested_replies: ['Show me the nearest hospital', 'I want to talk to someone']
});

const greetingReply = (user) => reply({
  conversational_response:
    `Hi${firstName(user.name) ? ` ${firstName(user.name)}` : ''}, I'm ${NAME}, your MediGuide health assistant.\n\n` +
    `I can help you make sense of symptoms, answer general health questions, explain your medications and help you find the right doctor. What's on your mind today?`,
  suggested_replies: ['I have a symptom to check', 'Tips for better sleep', 'What are my allergies?']
});

const identityReply = () => reply({
  conversational_response:
    `I'm ${NAME}, MediGuide's health assistant. I can:\n\n` +
    `• **Check symptoms** and tell you how urgent they seem and which specialist fits\n` +
    `• **Answer health questions** about sleep, stress, nutrition, exercise and more\n` +
    `• **Use your medical profile** (allergies, conditions, medications) to tailor advice\n` +
    `• **Point you to care**: nearby facilities, doctor sessions and emergency help\n\n` +
    `I give guidance, not a diagnosis, and I never replace a doctor.`,
  suggested_replies: ['Check a symptom', 'Book a doctor', 'Healthy eating tips']
});

const thanksReply = () => reply({
  conversational_response: `You're welcome! Take care of yourself. I'm here whenever you need me, and if anything changes or gets worse, just tell me.`,
  suggested_replies: ['I have another question', 'Book a doctor']
});

const profileReply = (text, profile, user) => {
  const t = text.toLowerCase();
  const lines = [];
  const want = (re) => re.test(t);
  const all = want(/profile/);
  if (all || want(/allerg/)) lines.push(`**Allergies:** ${list(profile.allergies) || 'none recorded'}`);
  if (all || want(/medic|meds|medicine/)) lines.push(`**Medications:** ${list(medsOf(profile)) || 'none recorded'}`);
  if (all || want(/condition/)) lines.push(`**Conditions:** ${list(profile.preExistingConditions) || 'none recorded'}`);
  if (all || want(/blood/)) lines.push(`**Blood group:** ${profile.bloodGroup || 'not recorded'}`);
  if (all || want(/emergency contact/)) {
    const ec = profile.emergencyContact || {};
    lines.push(`**Emergency contact:** ${ec.name ? `${ec.name}${ec.relationship ? ` (${ec.relationship})` : ''}, ${ec.phone || 'no phone'}` : 'not set'}`);
  }
  if (all || want(/bmi|height|weight/)) {
    const bmi = bmiOf(profile);
    lines.push(bmi
      ? `**BMI:** ${bmi.value}, which is ${bmi.band} (from ${profile.height} cm and ${profile.weight} kg)`
      : '**BMI:** add your height and weight in your profile and I can work it out');
  }
  if (!lines.length) lines.push(`**Allergies:** ${list(profile.allergies) || 'none recorded'}`, `**Conditions:** ${list(profile.preExistingConditions) || 'none recorded'}`);
  return reply({
    category: 'Your health profile',
    conversational_response: `Here's what's in your MediGuide profile${firstName(user.name) ? `, ${firstName(user.name)}` : ''}:\n\n${lines.join('\n')}\n\nYou can update this anytime in **Profile**, and I'll use it to tailor my advice.`,
    suggested_replies: ['How does this affect my advice?', 'Check a symptom']
  });
};

const appointmentReply = () => reply({
  category: 'Appointments',
  specialty: 'General Physician',
  cta: { type: 'book', specialty: '' },
  conversational_response:
    `I can help with that. MediGuide partner hospitals and clinics publish open sessions you can book in a few taps.\n\n` +
    `If you tell me what's bothering you, I can suggest which **specialist** fits best. Or browse all open sessions now.`,
  suggested_replies: ['Which specialist do I need?', 'Show open sessions']
});

const medicationReply = (text, profile) => {
  const allergies = profile.allergies || [];
  const t = text.toLowerCase();
  const penicillinFamily = /(amoxicillin|ampicillin|augmentin|penicillin)/i.test(t);
  const hit = allergies.find((a) => t.includes(a.toLowerCase()) || (penicillinFamily && /penicillin/i.test(a)));
  const meds = medsOf(profile);
  const warning = hit
    ? `**Important:** your profile lists an allergy to **${hit}**. Do not take this medicine without speaking to a doctor or pharmacist first.\n\n`
    : '';
  return reply({
    is_non_medical: false,
    category: 'Medication question',
    urgency_level: hit ? 'medium' : 'none',
    profile_impact_summary: hit ? `Allergy match: ${hit}` : (meds.length ? `Current medications: ${list(meds)}` : ''),
    conversational_response:
      `${warning}I can share general information, but I can't prescribe, recommend doses or change your medication. A pharmacist or your doctor can confirm what's safe for you.\n\n` +
      `• Always follow the dose on the label or your prescription\n` +
      `• Tell your doctor about everything you take, including supplements\n` +
      `• Stop and seek care if you get a rash, swelling, or difficulty breathing after a medicine` +
      (meds.length ? `\n\nFor reference, your profile lists: ${list(meds)}.` : ''),
    suggested_replies: ['Book a doctor', 'Check a symptom']
  });
};

const WELLNESS = {
  sleep: (p) => `Good sleep makes a real difference to how you feel. A few things that help most people:\n\n• Aim for **7–9 hours**, going to bed and waking at the same times\n• Avoid caffeine after mid-afternoon and screens in the last hour\n• Keep the room dark, cool and quiet\n• If you can't sleep after 20 minutes, get up and do something calm\n\nIf poor sleep lasts more than **3 weeks**, or you snore loudly or wake up gasping, it's worth seeing a doctor.${(p.preExistingConditions || []).some((c) => /asthma/i.test(c)) ? '\n\nSince you have asthma, night-time coughing or wheezing can disturb sleep too; mention it to your doctor if it happens often.' : ''}`,
  stress: () => `I'm sorry things feel heavy. Some quick ways to take the edge off:\n\n• **Box breathing:** breathe in for 4, hold 4, out 4, hold 4. Repeat for 2 minutes\n• A short walk or light stretching\n• Talk to someone you trust\n• Limit caffeine and keep regular meals and sleep\n\nIf stress or low mood lasts more than two weeks or affects daily life, please talk to a doctor or mental health professional. It's a normal, sensible step.`,
  nutrition: (p) => {
    const c = (p.preExistingConditions || []).join(' ').toLowerCase();
    const extra = /diabet/.test(c) ? '\n\nWith diabetes, keep portions of rice, roti and sweets steady and pair carbs with protein or vegetables.'
      : /hypertension|blood pressure/.test(c) ? '\n\nWith high blood pressure, cutting back on salt, pickles and processed foods helps most.' : '';
    return `A simple way to eat well is the **plate method**:\n\n• **Half** the plate vegetables or salad\n• **A quarter** protein: daal, eggs, chicken, fish or beans\n• **A quarter** whole grains: brown rice, whole-wheat roti\n• Water instead of sugary drinks; fruit instead of sweets most days${extra}`;
  },
  hydration: () => `Most adults need around **8 glasses (2 litres) of water a day**, and more in hot weather or when you're active.\n\nSigns you need more: dark yellow urine, headache, dizziness or a dry mouth. During fever, diarrhoea or vomiting, an **ORS** solution replaces lost salts better than plain water.\n\nSeek care if you can't keep fluids down or feel faint.`,
  exercise: (p) => `The general target is **150 minutes of moderate activity a week** (like brisk walking, 30 minutes on 5 days) plus muscle-strengthening twice a week.\n\nStart small, warm up, and build up gradually.${(p.preExistingConditions || []).some((c) => /asthma/i.test(c)) ? '\n\nWith asthma, keep your reliever inhaler with you and warm up slowly.' : ''}\n\nStop and seek care if you get chest pain, severe breathlessness or dizziness while exercising.`,
  weight: (p) => {
    const bmi = bmiOf(p);
    return `${bmi ? `Based on your profile, your **BMI is ${bmi.value}**, which is ${bmi.band}.\n\n` : 'Add your height and weight to your profile and I can calculate your BMI.\n\n'}Sustainable change comes from small habits: regular meals, more vegetables and protein, fewer sugary drinks, and daily movement. Losing **0.5–1 kg a week** is a healthy pace.\n\nA doctor can check for causes like thyroid issues if your weight changes without explanation.`;
  }
};

const wellnessReply = (topic, profile) => reply({
  category: `Wellness: ${topic}`,
  conversational_response: WELLNESS[topic](profile),
  suggested_replies: topic === 'stress' ? ['Try a breathing exercise', 'Book a doctor'] : ['More tips', 'Check a symptom']
});

const otherReply = () => reply({
  conversational_response: `I'm best with health topics: symptoms, medications, sleep, stress, nutrition, exercise or finding care. Could you tell me a bit more about what you'd like help with?`,
  suggested_replies: ['I have a symptom to check', 'Healthy eating tips', 'Book a doctor']
});

// Returns a reply for conversational intents, or null when the message should go to triage.
const conversationalReply = (intent, text, user) => {
  const profile = (user && user.medicalProfile) || {};
  switch (intent.type) {
    case 'crisis': return crisisReply();
    case 'greeting': return greetingReply(user || {});
    case 'identity': return identityReply();
    case 'thanks': return thanksReply();
    case 'profile': return profileReply(text, profile, user || {});
    case 'appointment': return appointmentReply();
    case 'medication': return medicationReply(text, profile);
    case 'wellness': return wellnessReply(intent.topic, profile);
    default: return null;
  }
};

module.exports = { NAME, detectIntent, conversationalReply, otherReply, reply };
