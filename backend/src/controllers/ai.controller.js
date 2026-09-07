const { GoogleGenAI } = require('@google/genai');

// Emergency keywords list (includes common misspellings, concatenated words, and severe triggers)
const EMERGENCY_KEYWORDS = [
  'heartattack', 'heart attack', 'cardiac', 'chest pain', 'chest tightness', 'chest pressure',
  'shortness of breath', 'breathless', 'gasping', 'choking', 'stroke', 'seizure', 'convulsion',
  'unconscious', 'fainted', 'passed out', 'collapsed', 'severe bleeding', 'hemorrhage',
  'paralyzed', 'numbness', 'vision loss', 'dying', 'die', 'poison', 'overdose', 'excruciating'
];

const MEDICAL_KEYWORDS = [
  'pain', 'fever', 'headache', 'rash', 'cough', 'stomach', 'chest', 'breath',
  'bleed', 'sick', 'nausea', 'vomit', 'dizzy', 'hurt', 'swollen', 'throat',
  'cold', 'flu', 'cramps', 'itch', 'infection', 'allergy', 'medication', 'doctor',
  'hospital', 'symptom', 'pregnant', 'blood', 'tired', 'fatigue', 'sprain', 'injury',
  'heart', 'attack', 'heartattack', 'stomachache', 'headache', 'backache', 'sore'
];

// Helper to identify greetings, follow-ups, and symptom inputs
const categorizeInput = (text, history = []) => {
  const lower = (text || '').trim().toLowerCase();

  // 0. Emergency keywords check ALWAYS takes highest precedence
  const hasEmergency = EMERGENCY_KEYWORDS.some(k => lower.includes(k));
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
  const isEmergency = EMERGENCY_KEYWORDS.some(k => lower.includes(k));

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
      conversational_response: `🚨 **EMERGENCY WARNING: Immediate Medical Care Required**\n\nBased on your description ("${symptomText}"), these symptoms carry severe cardiovascular or respiratory risks. Please do NOT wait or rest at home. Call emergency services (1122) or go to the nearest Emergency Department immediately.\n\nWhile help is on the way, sit upright, avoid physical exertion, and unbutton tight clothing.`,
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
      conversational_response: `Hello! I am your MediGuide AI Health Counselor. I am here to help evaluate your symptoms and guide your care choices.\n\nWhat physical symptoms or health concerns are you experiencing today? Please tell me what's going on so I can assist you!`,
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
      conversational_response: `I am your MediGuide AI Health Counselor. Please keep our conversation focused on your physical symptoms, health concerns, or medical profile.\n\nHow are you feeling physically right now?`,
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

  // 5. Routine / Mild Symptoms — REASSURING + WARNING INSTRUCTIONS
  const allergies = (profile.allergies || []).join(' ').toLowerCase();

  if (
    lower.includes('headache') || lower.includes('tired') || lower.includes('fatigue') ||
    lower.includes('cough') || lower.includes('rash') || lower.includes('itch') || lower.includes('stomach')
  ) {
    return {
      is_non_medical: false,
      category: 'Routine Symptom Cluster',
      specialty: 'Self-Care Monitoring',
      urgency_level: 'low',
      hospital_recommendation: 'NO HOSPITAL VISIT NEEDED (Safe for Home Care)',
      show_map: false,
      profile_impact_summary: `Profile check: ${allergies ? `Allergies: ${allergies}.` : 'No conflicting drug allergies reported.'}`,
      conversational_response: `😊 **No Hospital Visit Needed**\n\nBased on your description, this appears to be a routine symptom. You do **not** need to go to a clinic or hospital right now.\n\n**Home Instructions**: Rest well, stay hydrated, and monitor your symptoms.\n**When to Seek Care**: If you develop high fever, chest pain, difficulty breathing, or severe sudden pain, update me or seek medical evaluation immediately.`,
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
    profile_impact_summary: `Profile check: ${profile.gender || 'Patient'}, ${chronic ? `Conditions: ${chronic}` : 'No chronic illnesses.'}`,
    conversational_response: `🩺 **Home Care First**\n\nThere is no immediate need for a hospital trip. Resting at home is reasonable.\n\n**Warning**: If your condition worsens significantly or you experience breathing trouble or chest pain, please seek prompt medical care.`,
    trigger_question: 'How many days have you experienced this, and are there any other symptoms?',
    precautionary_advice: 'Rest adequately and drink plenty of fluids.',
    emergency_flag: false
  };
};

// @desc    Deep Clinical Triage & Dynamic Opinion Engine with Gemini AI
// @route   POST /api/ai/triage
// @access  Public / Private
exports.evaluateTriageWithAI = async (req, res) => {
  try {
    const { symptomText, patientProfile, chatHistory } = req.body;

    if (!symptomText || typeof symptomText !== 'string' || !symptomText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide symptom text to analyze.'
      });
    }

    const inputType = categorizeInput(symptomText, chatHistory || []);

    // 1. Warm Greeting Handling
    if (inputType === 'greeting') {
      return res.status(200).json({
        success: true,
        source: 'greeting_handler',
        data: {
          is_non_medical: true,
          category: 'Health Counseling',
          specialty: '',
          urgency_level: 'none',
          hospital_recommendation: '',
          show_map: false,
          profile_impact_summary: '',
          conversational_response: `Hello! I am your MediGuide AI Health Counselor. I am here to help evaluate your symptoms and guide your health decisions.\n\nAre you experiencing any physical symptoms, pain, or health concerns today? Please describe what's going on so I can assist you!`,
          trigger_question: 'What symptoms or health concerns are you experiencing right now?',
          precautionary_advice: '',
          emergency_flag: false
        }
      });
    }

    // 2. Off-Topic Out of Context Handling
    if (inputType === 'off_topic') {
      return res.status(200).json({
        success: true,
        source: 'context_filter',
        data: {
          is_non_medical: true,
          category: 'Out of Context',
          specialty: '',
          urgency_level: 'none',
          hospital_recommendation: '',
          show_map: false,
          profile_impact_summary: '',
          conversational_response: `I am your MediGuide AI Health Counselor. Please keep our conversation focused on your physical symptoms, health concerns, or medical profile so I can provide relevant guidance.\n\nWhat physical symptoms or health questions would you like to discuss today?`,
          trigger_question: 'Are you experiencing any physical discomfort or symptoms right now?',
          precautionary_advice: '',
          emergency_flag: false
        }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const localResult = evaluateLocalTriage(symptomText, patientProfile || {}, chatHistory || []);
      return res.status(200).json({
        success: true,
        source: 'local_ai_engine',
        data: localResult
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are MediGuide's Lead AI Health Counselor.

DYNAMIC OPINION SWITCHING & CLINICAL TRIAGE INSTRUCTIONS:
1. RE-EVALUATE URGENCY ON EVERY TURN:
   - You MUST dynamically re-assess the patient's condition on EVERY single message in the conversation.
   - You MUST HAVE THE ABILITY TO CHANGE YOUR OPINION IN THE SAME CHAT THREAD!
   - If a patient previously reported mild symptoms (e.g. routine headache, mild fatigue), but NOW reports a severe or emergency symptom (such as "I'm having a heart attack", "chest pain", "shortness of breath", "severe bleeding", "sudden paralysis", "fainting"), YOU MUST INSTANTLY CHANGE YOUR OPINION!
   - Instantly elevate "urgency_level" to "high", set "hospital_recommendation": "HOSPITAL VISIT STRONGLY URGED (Emergency Care Required)", set "show_map": true, set "emergency_flag": true, and warn the patient clearly that immediate emergency care is required.

2. CLEAR INSTRUCTIONS & WARNINGS:
   - Provide clear home care instructions and specify warning signs ONLY when home care is safe.
   - Warn and instruct a hospital/clinic visit ONLY if a visit is clinically needed based on risk.

3. OUT-OF-CONTEXT REMINDERS:
   If the user's message is off-topic (math, trivia, unrelated chatter), set "is_non_medical": true and gently remind them to stay focused on physical health symptoms.

Respond strictly in valid JSON matching this schema:
{
  "is_non_medical": true | false,
  "category": "Short description of symptom area or dialog state",
  "specialty": "Recommended Doctor Specialist or empty if N/A",
  "urgency_level": "high | medium | low | none",
  "hospital_recommendation": "HOSPITAL VISIT STRONGLY URGED (Emergency Care Required) | CLINIC VISIT RECOMMENDED | NO HOSPITAL VISIT NEEDED (Safe for Home Care) | empty if N/A",
  "show_map": true | false,
  "profile_impact_summary": "Summary of patient health background impact or empty",
  "conversational_response": "Proactive, empathetic response with clear clinical guidance and warnings",
  "trigger_question": "Targeted clinical follow-up question regarding symptoms, onset, or severity",
  "precautionary_advice": "Safe home self-care guidance or warning instructions",
  "emergency_flag": true | false
}
`;

    const historyFormatted = (chatHistory || [])
      .map(m => `${m.sender === 'user' ? 'Patient' : 'AI Counselor'}: ${m.text}`)
      .join('\n');

    const promptText = `
PATIENT MEDICAL PROFILE:
- Gender: ${patientProfile?.gender || 'Not specified'}
- Date of Birth / Age: ${patientProfile?.dateOfBirth || 'Not specified'}
- Pregnancy Status: ${patientProfile?.pregnancyStatus || 'N/A'}
- Allergies: ${patientProfile?.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${patientProfile?.preExistingConditions?.join(', ') || 'None'}
- Medications: ${patientProfile?.currentMedications?.map(m => `${typeof m === 'string' ? m : m.name}`).join(', ') || 'None'}

CONVERSATION HISTORY:
${historyFormatted || 'Start of new consultation'}

CURRENT PATIENT MESSAGE:
"${symptomText}"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      },
      contents: [promptText]
    });

    const resultJson = JSON.parse(response.text);

    return res.status(200).json({
      success: true,
      source: 'gemini_ai',
      data: resultJson
    });

  } catch (error) {
    console.error('Gemini AI Triage Error:', error);
    const fallbackResult = evaluateLocalTriage(req.body.symptomText, req.body.patientProfile || {}, req.body.chatHistory || []);
    return res.status(200).json({
      success: true,
      source: 'fallback_ai_engine',
      data: fallbackResult
    });
  }
};

