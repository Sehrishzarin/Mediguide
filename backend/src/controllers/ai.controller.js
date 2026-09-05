const { GoogleGenAI } = require('@google/genai');

// Helper to identify greetings, follow-ups, and symptom inputs
const categorizeInput = (text, history = []) => {
  const lower = (text || '').trim().toLowerCase();

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

  // 4. Check for specific medical symptom keywords
  const medicalKeywords = [
    'pain', 'fever', 'headache', 'rash', 'cough', 'stomach', 'chest', 'breath',
    'bleed', 'sick', 'nausea', 'vomit', 'dizzy', 'hurt', 'swollen', 'throat',
    'cold', 'flu', 'cramps', 'itch', 'infection', 'allergy', 'medication', 'doctor',
    'hospital', 'symptom', 'pregnant', 'blood', 'tired', 'fatigue', 'sprain', 'injury'
  ];

  const hasMedicalTerm = medicalKeywords.some(k => lower.includes(k));

  if (!hasMedicalTerm) {
    if (history.length > 0) {
      // In an active conversation, user response is likely a follow-up answer (e.g. "2 days ago", "throbbing", "no")
      return 'followup_answer';
    } else {
      return 'off_topic';
    }
  }

  return 'symptom_eval';
};

// Fallback Local Engine with Proactive Clinical Inquirer Dialog Support
const evaluateLocalTriage = (symptomText, profile = {}, messages = []) => {
  const inputType = categorizeInput(symptomText, messages);
  const lower = (symptomText || '').toLowerCase();

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
      conversational_response: `Hello! I am your MediGuide AI Health Counselor. I am here to help understand how you're feeling and guide your health decisions.\n\nAre you experiencing any physical symptoms, pain, or health concerns today? Please tell me what's going on or where you feel unwell so I can assist you!`,
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
      conversational_response: `I am your MediGuide AI Health Counselor. To help you effectively, please describe any physical symptoms, pain, or medical concerns you have.\n\nHow are you feeling physically today?`,
      trigger_question: 'Are you experiencing any discomfort or symptoms right now?',
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
      conversational_response: `You are very welcome! Take good care of yourself. If your symptoms change or if you feel any new discomfort, feel free to update me anytime.`,
      trigger_question: '',
      precautionary_advice: '',
      emergency_flag: false
    };
  }

  // 4. Follow-up Answer Probing (User answering previous AI question)
  if (inputType === 'followup_answer') {
    return {
      is_non_medical: true,
      category: 'Clinical Follow-up Evaluation',
      specialty: '',
      urgency_level: 'none',
      hospital_recommendation: '',
      show_map: false,
      profile_impact_summary: '',
      conversational_response: `Thank you for sharing those additional details. That helps clarify what you're experiencing.\n\nBased on what you've described, if your symptoms remain mild, resting and staying hydrated at home is reasonable. If you develop high fever, severe unmanageable pain, or difficulty breathing, please seek medical evaluation.`,
      trigger_question: 'Is there any other detail about how you feel that I should know?',
      precautionary_advice: 'Rest well and monitor how your body feels.',
      emergency_flag: false
    };
  }

  // 5. Actual Physical Symptom Evaluation & Active Clinical Probing
  const chronic = (profile.preExistingConditions || []).join(' ').toLowerCase();
  const meds = (profile.currentMedications || []).map(m => typeof m === 'string' ? m : m.name).join(' ').toLowerCase();
  const allergies = (profile.allergies || []).join(' ').toLowerCase();
  const isPregnant = profile.pregnancyStatus && profile.pregnancyStatus !== 'N/A' && profile.pregnancyStatus !== 'Not Pregnant';

  // Emergency Symptoms Only (Chest pain, acute severe breathlessness, stroke signs)
  const isEmergency =
    lower.includes('chest pain') || lower.includes('shortness of breath') ||
    lower.includes('stroke') || lower.includes('seizure') || lower.includes('unconscious') ||
    (isPregnant && (lower.includes('bleeding') || lower.includes('severe abdominal')));

  if (isEmergency) {
    return {
      is_non_medical: false,
      category: 'Acute Emergency Symptom Cluster',
      specialty: 'Emergency Department',
      urgency_level: 'high',
      hospital_recommendation: 'HOSPITAL VISIT STRONGLY URGED',
      show_map: true,
      profile_impact_summary: `Profile context: ${isPregnant ? `Pregnancy (${profile.pregnancyStatus}). ` : ''}${chronic ? `Conditions: ${chronic}.` : ''}`,
      conversational_response: `🏥 **Clinical Decision: Emergency Hospital Evaluation Required**\n\nSymptoms such as chest tightness or acute severe breathlessness carry potential cardiac or respiratory risks. Please do not delay seeking medical evaluation at an Emergency Department.\n\nTo help emergency staff, could you tell me if the pain is spreading anywhere else?`,
      trigger_question: 'Is the pain radiating to your arm, neck, or jaw, or are you experiencing cold sweats?',
      precautionary_advice: 'Sit comfortably and avoid physical exertion.',
      emergency_flag: true
    };
  }

  // Routine / Mild Symptoms (Headache, Fatigue, Slight Cough, Minor Rash) — REASSURING + ACTIVE PROBING
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
      conversational_response: `😊 **No Hospital Visit Needed**\n\nI understand how uncomfortable this feels, but based on your description, this appears to be a routine symptom. You do **not** need to rush to a clinic or hospital right now.\n\nTo understand what is happening better: How long have you felt this way, and are you experiencing any fever or other symptoms along with it?`,
      trigger_question: 'When did this start, and would you describe it as mild, moderate, or severe?',
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
    conversational_response: `🩺 **Home Care First**\n\nThere is no immediate need for a hospital trip. To help me understand what's going on more clearly, could you tell me when this started and if anything makes it feel better or worse?`,
    trigger_question: 'How many days have you experienced this, and are there any other symptoms?',
    precautionary_advice: 'Rest adequately.',
    emergency_flag: false
  };
};

// @desc    Deep Clinical Triage & Hospital Minimization Engine with Gemini AI
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
          conversational_response: `Hello! I am your MediGuide AI Health Counselor. I am here to help understand how you're feeling and guide your health decisions.\n\nAre you experiencing any physical symptoms, pain, or health concerns today? Please describe what's going on or where you feel unwell so I can assist you!`,
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

YOUR CORE BEHAVIOR & INQUISITIVE CLINICAL PROBING RULES:
1. GREETINGS & INTROS:
   If the user greets you ("hi", "hello", "hey"), greet them warmly and proactively ask what symptoms or physical discomfort they are experiencing today so you can understand what is going on.

2. ACTIVE CLINICAL PROBING (KNOW WHAT IS GOING ON):
   - When the user describes symptoms (brief or detailed), DO NOT give generic canned responses!
   - Actively PROBE to understand the situation deeply: ask about onset, pain quality (throbbing, sharp, dull), severity (1-10), associated signs (fever, nausea, rash), and triggers.
   - For mild or routine symptoms, explicitly reassure the user that home care is completely safe and NO hospital trip is necessary.

3. OUT-OF-CONTEXT REMINDERS:
   If the user's message is off-topic (math, trivia, unrelated chatter), set "is_non_medical": true and gently remind them to stay focused on physical health symptoms.

4. CONTINUOUS MULTI-TURN DIALOG:
   Treat the conversation as a natural dialog with a caring health practitioner. Integrate prior chat history into your understanding.

Respond strictly in valid JSON matching this schema:
{
  "is_non_medical": true | false,
  "category": "Short description of symptom area or dialog state",
  "specialty": "Recommended Doctor Specialist or empty if N/A",
  "urgency_level": "high | medium | low | none",
  "hospital_recommendation": "HOSPITAL VISIT STRONGLY URGED | CLINIC VISIT OPTIONAL | NO HOSPITAL VISIT NEEDED (Safe for Home Care) | empty if N/A",
  "show_map": true | false,
  "profile_impact_summary": "Summary of patient health background impact or empty",
  "conversational_response": "Proactive, empathetic response asking clarifying clinical questions to understand what is going on",
  "trigger_question": "Targeted clinical follow-up question regarding symptoms, onset, or severity",
  "precautionary_advice": "Safe home self-care guidance or empty",
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
