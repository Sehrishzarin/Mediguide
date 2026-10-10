// Nura's conversational brain: Google Gemini with a strict response schema.
//
// Guardrails live outside the model (see ai.controller.js): crisis and red-flag
// symptoms are answered deterministically before Gemini is called, the server
// looks up real facilities and sessions, and the local engine is the fallback
// when Gemini is unavailable.
const { GoogleGenAI, Type } = require('@google/genai');

// Measured with Nura's real prompt: 3.5 Flash ~3.5s, 3.5 Flash-Lite ~3-4s, 3.8 Flash 8-13s.
// (gemini-2.5-* is not available to new API keys.) The fallback model is tried when the
// primary is busy or slow, so the chat rarely drops to the offline engine.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 9000;

let client = null;
const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
};

const isConfigured = () => Boolean(getClient());

// ── Output contract the model must follow ─────────────────────────────────
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: 'Your message to the patient (markdown: **bold**, "• " bullets). Warm, concise, no emojis.' },
    category: { type: Type.STRING, description: 'Short topic label, e.g. "Symptom check: fever" or "Wellness: sleep".' },
    is_non_medical: { type: Type.BOOLEAN },
    urgency_level: { type: Type.STRING, enum: ['high', 'medium', 'low', 'none'] },
    emergency_flag: { type: Type.BOOLEAN },
    specialty: { type: Type.STRING, description: 'Doctor specialty to see if a visit is needed, from the allowed list, or empty.' },
    question_type: { type: Type.STRING, enum: ['none', 'scale', 'choice', 'multi'], description: 'Structured answer control for the ONE question you are asking, or none.' },
    question_id: { type: Type.STRING, enum: ['none', 'severity', 'duration', 'associated', 'medicine', 'other'] },
    question_options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'scale: exactly 5 labels from mildest to worst. choice/multi: 2-8 short options.' },
    suggested_replies: { type: Type.ARRAY, items: { type: Type.STRING }, description: '0-3 short replies the patient might tap next (empty when asking a structured question).' },
    assessment_complete: { type: Type.BOOLEAN, description: 'true only when you are giving your final recommendation for a symptom.' },
    level: { type: Type.STRING, enum: ['none', 'emergency', 'urgent', 'soon', 'home'], description: 'Final recommendation level when assessment_complete is true.' },
    reasons: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Why you chose this level (short bullet phrases).' },
    advice: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Self-care steps when home care is appropriate.' },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Signs that mean they should seek care sooner.' },
    medicine_notes: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Medicine safety notes (allergies, interactions, conditions).' },
    profile_note: { type: Type.STRING, description: 'How the patient profile affected your advice, or empty.' },
    mood: { type: Type.STRING, enum: ['idle', 'happy', 'empathetic', 'concerned'], description: "Nura's facial expression for this reply." }
  },
  required: ['reply', 'category', 'is_non_medical', 'urgency_level', 'emergency_flag', 'specialty', 'question_type', 'question_id',
    'question_options', 'suggested_replies', 'assessment_complete', 'level', 'reasons', 'advice', 'warnings', 'medicine_notes', 'profile_note', 'mood'],
  propertyOrdering: ['reply', 'category', 'is_non_medical', 'urgency_level', 'emergency_flag', 'specialty', 'question_type', 'question_id',
    'question_options', 'suggested_replies', 'assessment_complete', 'level', 'reasons', 'advice', 'warnings', 'medicine_notes', 'profile_note', 'mood']
};

const SPECIALTIES = ['General Physician', 'Cardiologist', 'Pediatrician', 'Dermatologist', 'Gastroenterologist', 'Orthopedist', 'Emergency Department'];

const SYSTEM_INSTRUCTION = `
You are Nura, MediGuide's AI health assistant, chatting with a patient in Pakistan through a mobile app.

PERSONALITY
- Warm, calm and genuinely caring. Acknowledge feelings before giving information ("I'm sorry you're dealing with this").
- Conversational and natural: build on what was already said, never repeat an earlier answer, never paste generic lists twice.
- Concise: usually under 110 words. Use **bold** for key points and "• " bullets sparingly. No emojis.
- Use the patient's first name rarely: at most once every three messages (check the conversation so far).
- Vary how you open each message. Never start two messages the same way, and avoid stock openers like
  "Thank you for letting me know" or "I am sorry to hear". React to what they actually said
  (e.g. "Two days of that sounds draining." / "Good that there are no other symptoms.").

WHAT YOU HELP WITH
Symptoms and where to get care, general health questions, medicines (general information only), wellness
(sleep, stress, workload, nutrition, hydration, exercise, weight), understanding their own profile, and booking care.

SYMPTOM ASSESSMENT PROTOCOL (most important)
When the patient mentions a symptom or that something hurts, do NOT conclude straight away. Gather details like a good nurse,
asking exactly ONE question per message, each with a structured control:
  1. If you don't know WHAT or WHERE the problem is (e.g. "it hurts"), ask where/what first (question_type "choice", question_id "other", 4-8 likely options).
  2. Severity: question_type "scale", question_id "severity", question_options = 5 labels from mildest to worst
     (for pain: "Very mild","Mild","Moderate","Severe","Worst possible"; for feeling unwell: "Barely","A little","Quite unwell","Very unwell","Extremely unwell").
  3. Duration: question_type "choice", question_id "duration", options "Started today","1 to 2 days","3 to 7 days","More than a week".
  4. Other symptoms: question_type "multi", question_id "associated", 5-8 options relevant to THIS symptom, including the important danger signs for it.
  5. Medicine taken: question_type "choice", question_id "medicine", e.g. "No medicine yet","Paracetamol (Panadol)","Ibuprofen (Brufen)","Antibiotics","Something else".
  Skip any step the patient already answered. Answers may arrive as tapped labels like "Very unwell (4/5)" or as free text.
  Then give your recommendation: assessment_complete true, level one of:
    emergency = call 1122 / go to the emergency department now; urgent = see a doctor within 24 hours;
    soon = book a doctor in the next 2-3 days; home = home care is fine for now (with clear warning signs).
  Fill reasons (cite severity, duration, symptoms and profile factors), advice (for home), warnings, medicine_notes, specialty.
  If at ANY point a danger sign appears (e.g. stiff neck with fever, trouble breathing, chest pain, confusion, fainting, blood in vomit/stool,
  weakness on one side, severe pain in a pregnant patient), stop asking and conclude level "emergency" immediately.
  Be more cautious (raise one level) for: pregnancy, age under 5 or over 65, diabetes, heart or kidney disease, weakened immunity,
  asthma with breathing/cough/fever symptoms, or when medicine taken hasn't helped.

PERSONALISATION
- Use the patient profile (age, sex, pregnancy, conditions, allergies, medications). Warn clearly about allergy conflicts
  (e.g. penicillin allergy vs amoxicillin/Augmentin; NSAID allergy or asthma vs ibuprofen).
- When relevant, mention nearby care ONLY from the NEARBY CARE list provided (never invent facilities, doctors or times).
  The app will show the exact nearest facility and next open session on its own, so you don't need to list times.

NURA'S EXPRESSION (mood)
- happy: greetings, thanks, good news, improvement, reassuring home-care outcomes.
- empathetic: the patient describes pain, feeling unwell, stress, worry or a hard time; most symptom questions.
- concerned: anything urgent, worrying or an emergency.
- idle: neutral information or small talk.

SAFETY RULES
- Never state a diagnosis as fact; you may say what something "could be" and who should check it. Never prescribe or give doses
  beyond "follow the label or your doctor's advice".
- specialty must be one of: ${SPECIALTIES.join(', ')} (or empty).
- If the message is unrelated to health, set is_non_medical true and gently steer back.
- Outside an assessment question, question_type is "none" and question_id is "none"; offer 2-3 helpful suggested_replies instead.
- When asking a structured question, suggested_replies must be empty.
`;

// ── Prompt building ───────────────────────────────────────────────────────
const ageFrom = (dob) => {
  const d = dob ? new Date(dob) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age;
};

const buildPrompt = ({ text, history, user, nearby }) => {
  const p = user.medicalProfile || {};
  const meds = (p.currentMedications || []).map((m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' ')).filter(Boolean);
  const age = ageFrom(p.dateOfBirth);
  const ec = p.emergencyContact || {};
  const lines = [
    'PATIENT PROFILE',
    `- Name: ${user.name || 'not given'}`,
    `- Age: ${age ?? 'unknown'}${p.gender ? `, ${p.gender}` : ''}`,
    `- Pregnancy: ${p.pregnancyStatus || 'N/A'}`,
    `- Height/weight: ${p.height ? `${p.height} cm` : '?'} / ${p.weight ? `${p.weight} kg` : '?'}`,
    `- Blood group: ${p.bloodGroup || 'unknown'}`,
    `- Allergies: ${(p.allergies || []).join(', ') || 'none recorded'}`,
    `- Conditions: ${(p.preExistingConditions || []).join(', ') || 'none recorded'}`,
    `- Current medications: ${meds.join(', ') || 'none recorded'}`,
    `- Emergency contact: ${ec.name ? `${ec.name} (${ec.relationship || 'contact'})` : 'not set'}`,
    '',
    'NEARBY CARE (closest first; real data from MediGuide)',
    nearby.length
      ? nearby.map((f) => `- ${f.name} (${f.type}${f.isPartner ? ', MediGuide partner, bookable' : ', public facility'}) ~${f.distanceKm} km`).join('\n')
      : '- Location not shared',
    '',
    'CONVERSATION SO FAR',
    history.length ? history.map((m) => `${m.sender === 'user' ? 'Patient' : 'Nura'}: ${m.text}`).join('\n') : '(new conversation)',
    '',
    `PATIENT'S NEW MESSAGE: ${JSON.stringify(text)}`
  ];
  return lines.join('\n');
};

// ── Normalise the model output into the client contract ───────────────────
const clean = (arr, max = 8, len = 120) => (Array.isArray(arr) ? arr : [])
  .map((s) => String(s || '').replace(/\p{Extended_Pictographic}/gu, '').trim())
  .filter(Boolean)
  .slice(0, max)
  .map((s) => s.slice(0, len));

const LEVEL_TEXT = {
  emergency: { title: 'Get emergency care now', urgency: 'high', recommendation: 'HOSPITAL VISIT STRONGLY URGED (Emergency Care Required)' },
  urgent: { title: 'See a doctor within 24 hours', urgency: 'medium', recommendation: 'CLINIC VISIT RECOMMENDED' },
  soon: { title: 'Book a doctor in the next 2 to 3 days', urgency: 'low', recommendation: 'CLINIC VISIT RECOMMENDED' },
  home: { title: 'Home care should be enough for now', urgency: 'low', recommendation: 'HOME CARE FIRST (Clinic Visit Optional)' }
};

const toClient = (raw) => {
  const reply = String(raw.reply || '').replace(/\p{Extended_Pictographic}/gu, '').trim();
  const specialty = SPECIALTIES.includes(raw.specialty) ? raw.specialty : '';
  const options = clean(raw.question_options, 8, 60);

  let input = null;
  if (raw.question_type === 'scale' && options.length >= 5) {
    input = { type: 'scale', id: 'severity', question: '', options: options.slice(0, 5).map((label, i) => ({ value: i + 1, label })) };
  } else if ((raw.question_type === 'choice' || raw.question_type === 'multi') && options.length >= 2) {
    input = {
      type: raw.question_type,
      id: raw.question_id && raw.question_id !== 'none' ? raw.question_id : 'other',
      question: '',
      options: options.map((label) => ({ value: label, label })),
      ...(raw.question_type === 'multi' ? { noneLabel: 'None of these' } : {})
    };
  }

  const level = raw.assessment_complete && LEVEL_TEXT[raw.level] ? raw.level : null;
  const emergency = Boolean(raw.emergency_flag) || level === 'emergency';
  const summary = level ? {
    level: emergency ? 'emergency' : level,
    title: LEVEL_TEXT[emergency ? 'emergency' : level].title,
    message: '',
    reasons: clean(raw.reasons, 6),
    advice: clean(raw.advice, 6),
    warnings: clean(raw.warnings, 4),
    medicineNotes: clean(raw.medicine_notes, 3, 240),
    specialty: emergency ? 'Emergency Department' : (specialty || 'General Physician'),
    // e.g. "Symptom check: fever" -> "fever" (used to start Nura Check-In for this symptom)
    symptom: String(raw.category || '').replace(/^symptom check:\s*/i, '').trim().toLowerCase().slice(0, 40),
    nearest: null,
    nextSlot: null
  } : null;

  const mood = emergency || level === 'urgent' ? 'concerned' : (['idle', 'happy', 'empathetic', 'concerned'].includes(raw.mood) ? raw.mood : 'idle');
  return {
    mood,
    is_non_medical: Boolean(raw.is_non_medical),
    category: String(raw.category || 'Conversation').slice(0, 60),
    specialty: summary ? summary.specialty : specialty,
    urgency_level: summary ? LEVEL_TEXT[summary.level].urgency : (['high', 'medium', 'low', 'none'].includes(raw.urgency_level) ? raw.urgency_level : 'none'),
    hospital_recommendation: summary ? LEVEL_TEXT[summary.level].recommendation : '',
    show_map: emergency || level === 'urgent',
    profile_impact_summary: String(raw.profile_note || '').slice(0, 200),
    conversational_response: reply,
    trigger_question: '',
    precautionary_advice: '',
    emergency_flag: emergency,
    suggested_replies: input ? [] : clean(raw.suggested_replies, 3, 40),
    cta: summary && summary.level !== 'emergency' ? { type: 'book', specialty: summary.specialty, slotId: null } : null,
    input,
    summary,
    assessment: null
  };
};

// One model call with a timeout; throws on error, timeout or invalid output
const callModel = async (ai, model, prompt) => {
  const request = ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.6,
      // Low thinking keeps replies fast; higher levels can take close to a minute
      thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING || 'low' }
    }
  });
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${model} timed out`)), TIMEOUT_MS); });
  try {
    const response = await Promise.race([request, timeout]);
    const raw = JSON.parse(response.text);
    if (!raw || typeof raw.reply !== 'string' || !raw.reply.trim()) throw new Error(`${model} returned an empty reply`);
    return raw;
  } finally {
    clearTimeout(timer);
  }
};

// Ask Nura: primary model, then the fallback model; throws if both fail
const askNura = async ({ text, history, user, nearby }) => {
  const ai = getClient();
  if (!ai) throw new Error('Gemini is not configured');
  const prompt = buildPrompt({ text, history, user, nearby });
  const models = [...new Set([MODEL, FALLBACK_MODEL].filter(Boolean))];
  let lastError;
  for (const model of models) {
    try {
      const result = toClient(await callModel(ai, model, prompt));
      result.model = model;
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini (${model}) failed: ${String(err.message).slice(0, 120)}`);
    }
  }
  throw lastError;
};

module.exports = { askNura, isConfigured, MODEL, FALLBACK_MODEL };
