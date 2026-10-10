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
  // Checked first: "busy, less sleep, more work" is about workload, not sleep tips
  busy: ['busy', 'workload', 'deadline', 'deadlines', 'overtime', 'less sleep', 'more work', 'no time', 'working late', 'night shift', 'long hours', 'overworked', 'too much work', 'work more', 'no time to sleep'],
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
  mood: 'concerned',
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
  mood: 'happy',
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
  mood: 'happy',
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

// Wellness answers come in layers: a first answer, deeper follow-ups, then an open
// question. Nura never repeats a layer already used in the conversation.
const hasAsthma = (p) => (p.preExistingConditions || []).some((c) => /asthma/i.test(c));
const conditionText = (p) => (p.preExistingConditions || []).join(' ').toLowerCase();

const WELLNESS = {
  sleep: [
    (p) => `Good sleep makes a real difference to how you feel. A few things that help most people:\n\n• Aim for **7–9 hours**, going to bed and waking at the same times\n• Avoid caffeine after mid-afternoon and screens in the last hour\n• Keep the room dark, cool and quiet\n• If you can't sleep after 20 minutes, get up and do something calm\n\nIf poor sleep lasts more than **3 weeks**, or you snore loudly or wake up gasping, it's worth seeing a doctor.${hasAsthma(p) ? '\n\nSince you have asthma, night-time coughing or wheezing can disturb sleep too; mention it to your doctor if it happens often.' : ''}`,
    () => `Here are a few more things that often help when the basics aren't enough:\n\n• **Wind-down routine:** 30 minutes of the same calm steps each night (dim lights, wash up, read) tells your body it's time to sleep\n• **Morning light:** 10 minutes of daylight soon after waking sets your body clock\n• **Worry list:** jot down tomorrow's tasks before bed so your mind can let go\n• **Heavy meals:** finish them 2–3 hours before bed\n• **Naps:** keep them under 20 minutes and before 3 pm`,
    () => `We've covered the main sleep habits. To help further, **what's hardest for you right now?** Falling asleep, waking up during the night, waking too early, or simply not having enough time to sleep?`
  ],
  busy: [
    (p, user) => `That sounds like a lot to carry${firstName(user.name) ? `, ${firstName(user.name)}` : ''}. I understand wanting more hours in the day, but **cutting sleep usually backfires**: after a few short nights, focus, memory and mood drop, and mistakes go up, so you get less done, not more.\n\nWhat tends to work better when you're stretched:\n\n• **Protect a minimum of 6–7 hours**, even on busy days\n• **Power nap:** 10–20 minutes in the early afternoon restores alertness without grogginess\n• **Caffeine timing:** have it in the morning and before 2 pm, not late in the day\n• **Work in 50-minute focus blocks** with 5–10 minute breaks\n• Tackle your hardest task when you're most alert`,
    () => `A few more ideas to get through a demanding stretch without burning out:\n\n• **Plan tomorrow's top 3 tasks** before you finish today\n• **Say no or delegate** anything that isn't essential this week\n• **Eat regular meals**: skipping them causes energy crashes\n• **Move for 5 minutes** every couple of hours: a quick walk wakes your brain up\n• Keep **one evening a week** free to recover\n\nWatch for burnout signs: constant exhaustion, headaches, irritability or trouble sleeping even when you have time. If that's happening, it's worth talking to a doctor.`,
    () => `It sounds like this busy period is really weighing on you. **How long has it been like this, and how are you feeling day to day?** For example, tired but okay, or exhausted and stressed? I can suggest something more specific.`
  ],
  stress: [
    () => `I'm sorry things feel heavy right now. Some quick ways to take the edge off:\n\n• **Box breathing:** breathe in for 4, hold 4, out 4, hold 4. Repeat for 2 minutes\n• A short walk or light stretching\n• Talk to someone you trust\n• Limit caffeine and keep regular meals and sleep\n\nIf stress or low mood lasts more than two weeks or affects daily life, please talk to a doctor or mental health professional. It's a normal, sensible step.`,
    () => `A few more things that can help over time:\n\n• **Name it:** writing down what's worrying you makes it feel more manageable\n• **Small wins:** break big problems into one small next step\n• **5-4-3-2-1 grounding** when anxiety spikes: notice 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste\n• **Limit news and social media** if they make you feel worse\n• Regular movement, even 20 minutes a day, lowers stress hormones`,
    () => `Thank you for sharing this with me. **What's been weighing on you most?** Work, family, health, or something else? Talking it through can help me suggest something more useful.`
  ],
  nutrition: [
    (p) => {
      const c = conditionText(p);
      const extra = /diabet/.test(c) ? '\n\nWith diabetes, keep portions of rice, roti and sweets steady and pair carbs with protein or vegetables.'
        : /hypertension|blood pressure/.test(c) ? '\n\nWith high blood pressure, cutting back on salt, pickles and processed foods helps most.' : '';
      return `A simple way to eat well is the **plate method**:\n\n• **Half** the plate vegetables or salad\n• **A quarter** protein: daal, eggs, chicken, fish or beans\n• **A quarter** whole grains: brown rice, whole-wheat roti\n• Water instead of sugary drinks; fruit instead of sweets most days${extra}`;
    },
    () => `Some practical habits that make healthy eating easier:\n\n• **Don't skip breakfast:** eggs, yoghurt or oats keep you full longer\n• **Smart snacks:** fruit, nuts, chana or yoghurt instead of biscuits and chips\n• **Cook a little extra** so tomorrow's lunch is ready\n• **Go easy on fried food** like samosas and parathas: a treat, not a daily habit\n• **Eat slowly:** it takes about 20 minutes to feel full`,
    () => `**Is there a specific goal you have in mind?** For example more energy, losing weight, managing blood sugar, or eating well on a busy schedule? I can tailor suggestions.`
  ],
  hydration: [
    () => `Most adults need around **8 glasses (2 litres) of water a day**, and more in hot weather or when you're active.\n\nSigns you need more: dark yellow urine, headache, dizziness or a dry mouth. During fever, diarrhoea or vomiting, an **ORS** solution replaces lost salts better than plain water.\n\nSeek care if you can't keep fluids down or feel faint.`,
    () => `A few easy ways to drink more through the day:\n\n• Keep a **water bottle** on your desk and refill it twice\n• Have a glass with **every meal**\n• Add lemon, mint or cucumber if plain water feels boring\n• Fruits like watermelon and oranges count too\n• Tea and coffee count partly, but they shouldn't be your main source`,
    () => `**Is something making it hard to drink enough**, like forgetting, being busy, or not liking plain water? Or are you asking because of a symptom like headaches or dizziness?`
  ],
  exercise: [
    (p) => `The general target is **150 minutes of moderate activity a week** (like brisk walking, 30 minutes on 5 days) plus muscle-strengthening twice a week.\n\nStart small, warm up, and build up gradually.${hasAsthma(p) ? '\n\nWith asthma, keep your reliever inhaler with you and warm up slowly.' : ''}\n\nStop and seek care if you get chest pain, severe breathlessness or dizziness while exercising.`,
    () => `Ways to fit activity into a busy day:\n\n• **Walk** during phone calls or after meals\n• Take the **stairs** instead of the lift\n• **10-minute home workouts:** squats, push-ups against a wall, lunges, planks\n• Stretch for a few minutes every hour if you sit a lot\n• Find something you enjoy, like cricket, badminton or swimming, so it doesn't feel like a chore`,
    () => `**What would you like exercise to help with?** More energy, weight, strength, stress, or a specific health condition? I can suggest a simple starting plan.`
  ],
  weight: [
    (p) => {
      const bmi = bmiOf(p);
      return `${bmi ? `Based on your profile, your **BMI is ${bmi.value}**, which is ${bmi.band}.\n\n` : 'Add your height and weight to your profile and I can calculate your BMI.\n\n'}Sustainable change comes from small habits: regular meals, more vegetables and protein, fewer sugary drinks, and daily movement. Losing **0.5–1 kg a week** is a healthy pace.\n\nA doctor can check for causes like thyroid issues if your weight changes without explanation.`;
    },
    () => `A few habits that help most with weight:\n\n• **Sugary drinks** (soft drinks, juices, sweet chai) are the easiest calories to cut\n• **Protein at every meal** keeps you full for longer\n• **Sleep:** short sleep increases hunger hormones\n• **Track** what you eat for a week; it often reveals easy changes\n• Aim for **progress, not perfection**: a slip-up is just one meal`,
    () => `**What's your goal**: losing weight, gaining weight, or keeping it steady? And is anything making it harder, like a busy schedule or a health condition?`
  ]
};

// Which layer was the last Nura message (so "more tips" continues the same topic)?
const LAYER_KEYS = Object.fromEntries(Object.entries(WELLNESS).map(([topic, layers]) =>
  [topic, layers.map((fn) => fn({}, {}).slice(0, 60))]));

const lastTopicFrom = (history) => {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.sender !== 'ai') continue;
    for (const [topic, keys] of Object.entries(LAYER_KEYS)) {
      if (keys.some((k) => m.text.startsWith(k.slice(0, 24)))) return topic;
    }
    return null;
  }
  return null;
};

const wellnessReply = (topic, profile, user, history = [], wantsMore = false) => {
  const layers = WELLNESS[topic];
  const said = history.filter((m) => m.sender === 'ai').map((m) => m.text);
  const used = (i) => said.some((t) => t.startsWith(LAYER_KEYS[topic][i].slice(0, 24)));
  // An explicit "more" never goes back to the first answer, even if it has scrolled out of the history window
  const from = wantsMore ? 1 : 0;
  let index = layers.findIndex((_, i) => i >= from && !used(i));
  if (index === -1) {
    // Everything on this topic is covered: invite specifics instead of repeating ourselves
    return reply({
      category: `Wellness: ${topic}`,
      conversational_response: "I've shared my main tips on this for now. If you tell me a little more about your situation, like what you've already tried or what's getting in the way, I can be more specific. If it's affecting your health or daily life, a doctor can help too.",
      suggested_replies: ['Check a symptom', 'Book a doctor']
    });
  }
  const isLast = index === layers.length - 1;
  const replies = {
    sleep: ['More sleep tips', 'I wake up at night', 'I have no time to sleep'],
    busy: ['More tips', 'I feel exhausted', 'How do I avoid burnout?'],
    stress: ['More ways to cope', 'Work stress', 'Book a doctor'],
    nutrition: ['More tips', 'Eating on a busy schedule', 'Managing blood sugar'],
    hydration: ['More tips', 'I get headaches', 'Check a symptom'],
    exercise: ['More tips', 'A plan for beginners', 'Exercise for stress'],
    weight: ['More tips', 'I want to lose weight', 'Book a doctor']
  }[topic] || ['More tips', 'Check a symptom'];
  return reply({
    mood: ['stress', 'busy'].includes(topic) ? 'empathetic' : 'idle',
    category: `Wellness: ${topic}`,
    conversational_response: layers[index](profile, user || {}),
    suggested_replies: isLast ? ['Check a symptom', 'Book a doctor'] : replies
  });
};

const otherReply = () => reply({
  conversational_response: `I'm best with health topics: symptoms, medications, sleep, stress, nutrition, exercise or finding care. Could you tell me a bit more about what you'd like help with?`,
  suggested_replies: ['I have a symptom to check', 'Healthy eating tips', 'Book a doctor']
});

// Returns a reply for conversational intents, or null when the message should go to triage.
const MORE = /^(more|more tips|tell me more|anything else|what else|more \w+ tips|more ways to cope|go on|continue)\b/i;

const conversationalReply = (intent, text, user, history = []) => {
  const profile = (user && user.medicalProfile) || {};
  // "More tips" continues whichever wellness topic Nura was just talking about
  if (MORE.test((text || '').trim())) {
    const topic = lastTopicFrom(history);
    if (topic) return wellnessReply(topic, profile, user, history, true);
  }
  switch (intent.type) {
    case 'crisis': return crisisReply();
    case 'greeting': return greetingReply(user || {});
    case 'identity': return identityReply();
    case 'thanks': return thanksReply();
    case 'profile': return profileReply(text, profile, user || {});
    case 'appointment': return appointmentReply();
    case 'medication': return medicationReply(text, profile);
    case 'wellness': return wellnessReply(intent.topic, profile, user, history, MORE.test((text || '').trim()));
    default: return null;
  }
};

module.exports = { NAME, detectIntent, conversationalReply, otherReply, reply };
