const { GoogleGenAI } = require('@google/genai');
const nura = require('../services/nura');

// Emergency keywords list (includes common misspellings, concatenated words, and severe triggers)
const EMERGENCY_KEYWORDS = [
  'heartattack', 'heart attack', 'cardiac', 'chest pain', 'chest tightness', 'chest pressure',
  'shortness of breath', 'breathless', 'gasping', 'choking', 'stroke', 'seizure', 'convulsion',
  'unconscious', 'fainted', 'passed out', 'collapsed', 'severe bleeding', 'hemorrhage',
  'paralyzed', 'numbness', 'vision loss', 'dying', 'die', 'poison', 'overdose', 'excruciating'
];

// Word-boundary match so e.g. "die" does not fire on "diet"
const EMERGENCY_REGEX = new RegExp(`\\b(${EMERGENCY_KEYWORDS.join('|')})\\b`, 'i');
// Temperature mentioned with "fever"/"temperature" (e.g. "fever of 102", "39.5 c temp"), else null
const feverValue = (t) => {
  if (!/\b(fever|temperature|temp)\b/.test(t)) return null;
  const m = t.match(/\b(1\d{2}(?:\.\d)?|[34]\d(?:\.\d)?)\s*(?:°|degrees?)?\s*[fc]?\b/);
  return m ? parseFloat(m[1]) : null;
};

// Red-flag combinations that single keywords miss
const RED_FLAG_COMBOS = [
  // Meningitis signs: stiff neck with fever, headache, rash or light sensitivity
  (t) => /\bstiff (neck|necked)\b|\bneck (is )?stiff\b/.test(t) && /\b(fever|temperature|headache|rash|light hurts|sensitive to light)\b/.test(t),
  // Thunderclap headache
  (t) => /\b(worst headache|sudden (severe|bad|intense) headache|thunderclap)\b/.test(t),
  // Very high fever (>= 104 F / 40 C)
  (t) => {
    const v = feverValue(t);
    return v !== null && (v >= 104 || (v >= 40 && v < 45));
  },
  (t) => /\b(can'?t|cannot|unable to) breathe\b|\blips (are |turning )?blue\b/.test(t),
  (t) => /\b(baby|infant|newborn)\b/.test(t) && /\b(fever|not feeding|floppy|limp)\b/.test(t)
];
const hasEmergencyKeyword = (text) => {
  const t = (text || '').toLowerCase();
  return EMERGENCY_REGEX.test(t) || RED_FLAG_COMBOS.some((test) => test(t));
};
// Fever of 102 F / 38.9 C or more, or lasting several days: see a doctor
const isSignificantFever = (t) => {
  const v = feverValue(t);
  const high = v !== null && (v >= 102 || (v >= 38.9 && v < 45));
  return high || /fever.*\b(3|three|4|four|5|five|several) days\b|\b(3|three|4|four|several) days?\b.*fever/.test(t);
};

const MEDICAL_KEYWORDS = [
  'pain', 'fever', 'headache', 'rash', 'cough', 'stomach', 'chest', 'breath',
  'bleed', 'sick', 'nausea', 'vomit', 'dizzy', 'hurt', 'swollen', 'throat',
  'cold', 'flu', 'cramps', 'itch', 'infection', 'allergy', 'medication', 'doctor',
  'hospital', 'symptom', 'pregnant', 'blood', 'tired', 'fatigue', 'sprain', 'injury',
  'heart', 'attack', 'heartattack', 'stomachache', 'headache', 'backache', 'sore',
  'temperature', 'temp', 'stiff', 'neck', 'ache', 'aching', 'swelling', 'burn', 'cut', 'wound'
];

// Helper to identify greetings, follow-ups, and symptom inputs
const categorizeInput = (text, history = []) => {
  const lower = (text || '').trim().toLowerCase();

  // 0. Emergency keywords check ALWAYS takes highest precedence
  const hasEmergency = hasEmergencyKeyword(lower);
  if (hasEmergency) {
    return 'symptom_eval';
  }

  // 1. Off-topic math / trivia / coding
  if (
    /^\d+\s*[\+\-\*\/\=]\s*\d+/.test(lower) ||
    lower.includes('what is 2') || lower.includes('two plus') || lower.includes('2+5') || lower.includes('2 + 5') ||
    lower.includes('who is the president') || lower.includes('capital of') ||
    lower.includes('write code') || lower.includes('solve for x') || lower.includes('tell me a joke')
  ) {
    return 'off_topic';
  }

  // 2. Direct Greetings
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hi there', 'hey there'];
  if (greetings.some(g => lower === g || lower === g + '.' || lower === g + '!')) {
    return 'greeting';
  }

  // 3. Simple Acknowledgments / Small Talk
  const acks = ['thanks', 'thank you', 'okay', 'ok', 'got it', 'understood', 'bye', 'goodnight'];
  if (acks.some(a => lower === a || lower === a + '.' || lower === a + '!')) {
    return 'acknowledgment';
  }

  // 4. Check for medical symptom keywords
  const hasMedicalTerm = MEDICAL_KEYWORDS.some(k => lower.includes(k));

  if (hasMedicalTerm) {
    return 'symptom_eval';
  }

  if (history.length > 0) {
    // In an active conversation, user response is a follow-up answer
    return 'followup_answer';
  }

  return 'off_topic';
};

// Fallback Local Engine with Dynamic Opinion Switching & Clinical Triage Support
const evaluateLocalTriage = (symptomText, profile = {}, messages = []) => {
  const inputType = categorizeInput(symptomText, messages);
  const lower = (symptomText || '').toLowerCase();

  // Check emergency keywords in input
  const isEmergency = hasEmergencyKeyword(lower);

  const chronic = (profile.preExistingConditions || []).join(' ').toLowerCase();
  const isPregnant = profile.pregnancyStatus && profile.pregnancyStatus !== 'N/A' && profile.pregnancyStatus !== 'Not Pregnant';

  // ALWAYS trigger emergency opinion change if emergency symptoms are reported (even in follow-up)
  if (isEmergency) {
    return {
      is_non_medical: false,
      category: 'Acute Emergency Medical Alert',
      specialty: 'Emergency Department',
      urgency_level: 'high',
      hospital_recommendation: 'HOSPITAL VISIT STRONGLY URGED (Emergency Care Required)',
      show_map: true,
      profile_impact_summary: `${isPregnant ? `Pregnancy (${profile.pregnancyStatus}). ` : ''}${chronic ? `Conditions: ${chronic}.` : 'Emergency evaluation needed.'}`,
      conversational_response: `**EMERGENCY WARNING: Immediate Medical Care Required**\n\nBased on your description ("${symptomText}"), these can be signs of a serious condition that needs urgent assessment. Please do **not** wait or rest at home. Call emergency services (**1122**) or go to the nearest Emergency Department now.\n\nWhile help is on the way, stay with someone, avoid eating or driving, and keep your phone close.`,
      trigger_question: 'Is someone with you right now, or do you need emergency dispatch immediately?',
      precautionary_advice: 'Call emergency services (1122) or head to the nearest Emergency Room without delay.',
      emergency_flag: true
    };
  }

  // 1. Warm Proactive Greeting
  if (inputType === 'greeting') {
    return {
      is_non_medical: true,
      category: 'Health Counseling',
      specialty: '',
      urgency_level: 'none',
      hospital_recommendation: '',
      show_map: false,
      profile_impact_summary: '',
      conversational_response: `Hi, I'm Nura, your MediGuide health assistant.\n\nWhat physical symptoms or health concerns are you experiencing today? Please tell me what's going on so I can assist you!`,
      trigger_question: 'What symptoms or health concerns are you experiencing right now?',
      precautionary_advice: '',
      emergency_flag: false
    };
  }

  // 2. Off-Topic Out-of-Context Messages
  if (inputType === 'off_topic') {
    return {
      is_non_medical: true,
      category: 'Out of Context',
      specialty: '',
      urgency_level: 'none',
      hospital_recommendation: '',
      show_map: false,
      profile_impact_summary: '',
      conversational_response: `I'm Nura, and I'm best with health topics.\n\nHow are you feeling physically right now?`,
      trigger_question: 'Are you experiencing any discomfort or physical symptoms right now?',
      precautionary_advice: '',
      emergency_flag: false
    };
  }

  // 3. Simple Acknowledgment
  if (inputType === 'acknowledgment') {
    return {
      is_non_medical: true,
      category: 'Consultation Chat',
      specialty: '',
      urgency_level: 'none',
      hospital_recommendation: '',
      show_map: false,
      profile_impact_summary: '',
      conversational_response: `You are very welcome! Take good care of yourself. If your symptoms change or if you experience any new discomfort, feel free to update me anytime.`,
      trigger_question: '',
      precautionary_advice: '',
      emergency_flag: false
    };
  }

  // 4. Follow-up Answer Probing (User answering previous AI question)
  if (inputType === 'followup_answer') {
    return {
      is_non_medical: false,
      category: 'Clinical Follow-up Evaluation',
      specialty: 'General Physician',
      urgency_level: 'low',
      hospital_recommendation: 'NO HOSPITAL VISIT NEEDED (Safe for Home Care)',
      show_map: false,
      profile_impact_summary: 'Symptom monitoring context.',
      conversational_response: `Thank you for providing that context. That helps clarify what you are experiencing.\n\nBased on your description, if your symptoms remain mild, resting and staying hydrated at home is safe. However, if you develop chest pain, severe breathlessness, high fever, or sudden weakness, seek immediate emergency medical care.`,
      trigger_question: 'Have your symptoms gotten better, stayed the same, or gotten worse?',
      precautionary_advice: 'Rest well, drink fluids, and monitor for warning signs.',
      emergency_flag: false
    };
  }

  // 5. Specialty routing, with severity escalating to a clinic visit
  const allergies = (profile.allergies || []).join(' ').toLowerCase();
  const isSevere = /\b(severe|severely|worst|unbearable|intense|persistent|won'?t stop|for (a )?week|blood|bloody|vomiting|high fever)\b/i.test(lower) || isSignificantFever(lower);
  const specialtyRoutes = [
    { test: /\b(rash|itch\w*|skin|acne|eczema|hives|mole)\b/, specialty: 'Dermatologist', category: 'Skin symptom' },
    { test: /\b(stomach\w*|abdomen|abdominal|vomit\w*|diarrh\w*|nausea|constipat\w*|acid|heartburn)\b/, specialty: 'Gastroenterologist', category: 'Digestive symptom' },
    { test: /\b(joint|knee|back ?pain|backache|sprain\w*|fracture|bone|shoulder|neck|stiff\w*|muscle\w*|ankle|wrist|hip)\b/, specialty: 'Orthopedist', category: 'Muscle / joint symptom' }
  ];
  const route = specialtyRoutes.find((r) => r.test.test(lower));

  if (route || isSevere) {
    const specialty = route ? route.specialty : 'General Physician';
    const profileNote = `${allergies ? `Allergies: ${allergies}.` : 'No drug allergies reported.'}${isPregnant ? ` Pregnancy (${profile.pregnancyStatus}).` : ''}`;
    if (isSevere || isPregnant) {
      return {
        is_non_medical: false,
        category: route ? route.category : 'Significant symptom',
        specialty,
        urgency_level: 'medium',
        hospital_recommendation: 'CLINIC VISIT RECOMMENDED',
        show_map: true,
        profile_impact_summary: profileNote,
        conversational_response: `**Clinic Visit Recommended**\n\nWhat you describe sounds more than mild, so please see a **${specialty}** within the next day rather than waiting it out at home.\n\n**Go to an emergency department now** if you notice vomiting blood, black stools, fainting, severe dehydration, or pain that becomes unbearable.`,
        trigger_question: 'On a scale of 1-10, how bad is it right now, and when did it start?',
        precautionary_advice: 'Stay hydrated, avoid self-medicating beyond basic pain relief, and arrange a doctor visit soon.',
        emergency_flag: false
      };
    }
    return {
      is_non_medical: false,
      category: route.category,
      specialty,
      urgency_level: 'low',
      hospital_recommendation: 'HOME CARE FIRST (Clinic Visit Optional)',
      show_map: false,
      profile_impact_summary: profileNote,
      conversational_response: `**Home Care First**\n\nThis sounds mild for now. Rest, stay hydrated and watch how it develops over the next day or two.\n\nIf it lasts more than a few days or gets worse, book a **${specialty}**. Seek urgent care for spreading swelling, high fever, or severe pain.`,
      trigger_question: 'How long have you had this, and is it getting better or worse?',
      precautionary_advice: 'Rest, stay hydrated and monitor your symptoms.',
      emergency_flag: false
    };
  }

  // 6. Routine / Mild Symptoms — REASSURING + WARNING INSTRUCTIONS
  if (
    lower.includes('headache') || lower.includes('tired') || lower.includes('fatigue') ||
    lower.includes('cough') || lower.includes('rash') || lower.includes('itch') || lower.includes('stomach')
  ) {
    return {
      is_non_medical: false,
      category: 'Routine Symptom Cluster',
      specialty: '',
      urgency_level: 'low',
      hospital_recommendation: 'NO HOSPITAL VISIT NEEDED (Safe for Home Care)',
      show_map: false,
      profile_impact_summary: `${allergies ? `Allergies: ${allergies}.` : 'No conflicting drug allergies reported.'}`,
      conversational_response: `**No Hospital Visit Needed**\n\nBased on your description, this appears to be a routine symptom. You do **not** need to go to a clinic or hospital right now.\n\n**Home Instructions**: Rest well, stay hydrated, and monitor your symptoms.\n**When to Seek Care**: If you develop high fever, chest pain, difficulty breathing, or severe sudden pain, update me or seek medical evaluation immediately.`,
      trigger_question: 'How long have you felt this way, and are you experiencing any fever or other symptoms?',
      precautionary_advice: 'Rest well and stay hydrated.',
      emergency_flag: false
    };
  }

  // General Mild Guidance + Active Probing
  return {
    is_non_medical: false,
    category: 'General Health Symptom',
    specialty: 'General Physician',
    urgency_level: 'low',
    hospital_recommendation: 'HOME CARE FIRST (Clinic Visit Optional)',
    show_map: false,
    profile_impact_summary: `${profile.gender || 'Patient'}, ${chronic ? `Conditions: ${chronic}` : 'No chronic illnesses.'}`,
    conversational_response: `**Home Care First**\n\nThere is no immediate need for a hospital trip. Resting at home is reasonable.\n\n**Warning**: If your condition worsens significantly or you experience breathing trouble or chest pain, please seek prompt medical care.`,
    trigger_question: 'How many days have you experienced this, and are there any other symptoms?',
    precautionary_advice: 'Rest adequately and drink plenty of fluids.',
    emergency_flag: false
  };
};

// @desc    Chat with Nura: conversational health assistant + clinical triage
// @route   POST /api/ai/triage
// @access  Private
exports.evaluateTriageWithAI = async (req, res) => {
  const symptomText = typeof req.body.symptomText === 'string' ? req.body.symptomText.trim().slice(0, 2000) : '';
  if (!symptomText) {
    return res.status(400).json({ success: false, message: 'Please type a message for Nura.' });
  }

  // Use the stored medical profile, never one supplied by the client; keep the last 12 turns only
  const patientProfile = req.user.medicalProfile ? req.user.medicalProfile.toObject() : {};
  const chatHistory = (Array.isArray(req.body.chatHistory) ? req.body.chatHistory : [])
    .slice(-12)
    .map((m) => ({ sender: m && m.sender === 'user' ? 'user' : 'ai', text: String((m && m.text) || '').slice(0, 1500) }));
  const user = { name: req.user.name, medicalProfile: patientProfile };

  const send = (source, data) => res.status(200).json({
    success: true,
    source,
    data: { suggested_replies: [], cta: null, ...data }
  });

  const intent = nura.detectIntent(symptomText);

  // Safety first: crisis and red-flag symptoms are always answered locally and immediately
  if (intent.type === 'crisis') return send('nura_safety', nura.conversationalReply(intent, symptomText, user));
  if (hasEmergencyKeyword(symptomText)) {
    return send('nura_safety', {
      ...evaluateLocalTriage(symptomText, patientProfile, chatHistory),
      suggested_replies: ['Show me the nearest hospital', 'Call my emergency contact']
    });
  }
  // Greetings never need the model
  if (intent.type === 'greeting' || intent.type === 'thanks') {
    return send('nura_local', nura.conversationalReply(intent, symptomText, user));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const localAnswer = () => {
    const conversational = nura.conversationalReply(intent, symptomText, user);
    if (conversational) return conversational;
    const inputType = categorizeInput(symptomText, chatHistory);
    if (inputType === 'off_topic') return nura.otherReply();
    return {
      ...evaluateLocalTriage(symptomText, patientProfile, chatHistory),
      suggested_replies: ['It started today', 'It has lasted a few days', 'It is getting worse']
    };
  };

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return send('nura_local', localAnswer());
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are Nura, MediGuide's warm, professional AI health assistant, chatting with a patient in Pakistan.

WHAT YOU DO
- Hold a natural health conversation: symptoms, general health questions, medications (general info only),
  wellness (sleep, stress, nutrition, hydration, exercise, weight), explaining medical terms, and helping the
  patient decide where to get care (home care, clinic, or emergency).
- Use the patient's medical profile (allergies, conditions, medications, pregnancy, age) to personalise advice,
  and point out conflicts (e.g. a medicine they are allergic to).
- Ask one focused follow-up question when you need more detail (onset, severity 1-10, duration, other symptoms).

SAFETY RULES
- Never give a diagnosis as fact, never prescribe or set doses. Recommend the right specialist instead.
- Re-assess urgency on EVERY message. If red-flag symptoms appear (chest pain, severe breathlessness, stroke
  signs, heavy bleeding, fainting, seizures, poisoning, suicidal thoughts), set urgency_level "high",
  emergency_flag true, show_map true, and tell them to call 1122 or go to the nearest emergency department.
- Keep replies concise (under ~150 words), friendly and clear. Use **bold** for key points and "• " bullets.
  No emojis.
- If the message is unrelated to health, set is_non_medical true and gently steer back to health topics.

Respond ONLY with valid JSON matching this schema:
{
  "is_non_medical": boolean,
  "category": "short topic label",
  "specialty": "recommended doctor specialty, or empty",
  "urgency_level": "high | medium | low | none",
  "hospital_recommendation": "HOSPITAL VISIT STRONGLY URGED (Emergency Care Required) | CLINIC VISIT RECOMMENDED | HOME CARE FIRST (Clinic Visit Optional) | NO HOSPITAL VISIT NEEDED (Safe for Home Care) | empty",
  "show_map": boolean,
  "profile_impact_summary": "how the patient's profile affects this advice, or empty",
  "conversational_response": "your reply to the patient",
  "trigger_question": "one follow-up question, or empty",
  "precautionary_advice": "short safety/self-care advice, or empty",
  "emergency_flag": boolean,
  "suggested_replies": ["2-3 short replies the patient might tap next"]
}
`;

    const historyFormatted = chatHistory
      .map((m) => `${m.sender === 'user' ? 'Patient' : 'Nura'}: ${m.text}`)
      .join('\n');

    const meds = (patientProfile.currentMedications || []).map((m) => (typeof m === 'string' ? m : m.name)).filter(Boolean);
    const promptText = `
PATIENT
- Name: ${req.user.name || 'Not specified'}
- Gender: ${patientProfile.gender || 'Not specified'}
- Date of birth: ${patientProfile.dateOfBirth || 'Not specified'}
- Height / weight: ${patientProfile.height ? `${patientProfile.height} cm` : '?'} / ${patientProfile.weight ? `${patientProfile.weight} kg` : '?'}
- Pregnancy status: ${patientProfile.pregnancyStatus || 'N/A'}
- Allergies: ${(patientProfile.allergies || []).join(', ') || 'None recorded'}
- Conditions: ${(patientProfile.preExistingConditions || []).join(', ') || 'None recorded'}
- Medications: ${meds.join(', ') || 'None recorded'}

CONVERSATION SO FAR
${historyFormatted || '(new conversation)'}

PATIENT'S NEW MESSAGE
"${symptomText}"
`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: { systemInstruction, responseMimeType: 'application/json' },
        contents: [promptText]
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini request timed out')), 12000))
    ]);

    const result = JSON.parse(response.text);
    if (!Array.isArray(result.suggested_replies)) result.suggested_replies = [];
    result.suggested_replies = result.suggested_replies.slice(0, 3).map(String);
    return send('gemini_ai', result);
  } catch (error) {
    console.error('Gemini error, using local engine:', error.message);
    return send('nura_local', localAnswer());
  }
};
