const { GoogleGenAI } = require('@google/genai');

// Non-medical / Off-topic keyword pattern checker
const isNonMedicalQuery = (text) => {
  const lower = (text || '').trim().toLowerCase();

  // Math expressions, equations, general non-medical trivia
  if (
    /^\d+\s*[\+\-\*\/\=]\s*\d+/.test(lower) ||
    lower.includes('what is 2') || lower.includes('two plus') || lower.includes('2+5') || lower.includes('2 + 5') ||
    lower.includes('who is the president') || lower.includes('capital of') ||
    lower.includes('write code') || lower.includes('solve for x')
  ) {
    return true;
  }

  // Common greeting/small talk without symptoms
  const medicalKeywords = [
    'pain', 'fever', 'headache', 'rash', 'cough', 'stomach', 'chest', 'breath',
    'bleed', 'sick', 'nausea', 'vomit', 'dizzy', 'hurt', 'swollen', 'throat',
    'cold', 'flu', 'cramps', 'itch', 'infection', 'allergy', 'medication', 'doctor',
    'hospital', 'symptom', 'pregnant', 'blood', 'tired', 'fatigue', 'sprain', 'injury'
  ];

  const hasMedicalTerm = medicalKeywords.some(k => lower.includes(k));
  if (!hasMedicalTerm && (lower.length < 15 || lower.startsWith('what is') || lower.startsWith('how to make') || lower.startsWith('tell me a joke'))) {
    return true;
  }

  return false;
};

// Expanded Deep Clinical Triage & Hospital Minimization Engine (Fallback when GEMINI_API_KEY is not set)
const evaluateLocalTriage = (symptomText, profile = {}, messages = []) => {
  const lower = (symptomText || '').toLowerCase();

  // Check Non-Medical
  if (isNonMedicalQuery(symptomText)) {
    return {
      is_non_medical: true,
      category: 'Non-Medical Inquiry',
      specialty: 'N/A',
      urgency_level: 'none',
      hospital_recommendation: 'NO MEDICAL EVALUATION NEEDED',
      show_map: false,
      profile_impact_summary: '',
      conversational_response: `I am your MediGuide AI Health Counselor. I am dedicated specifically to evaluating physical symptoms and medical concerns for busy individuals.\n\nPlease describe any symptoms, discomfort, or health questions you have so I can assist you with an accurate triage recommendation!`,
      trigger_question: '',
      precautionary_advice: '',
      emergency_flag: false
    };
  }

  const chronic = (profile.preExistingConditions || []).join(' ').toLowerCase();
  const meds = (profile.currentMedications || []).map(m => typeof m === 'string' ? m : m.name).join(' ').toLowerCase();
  const allergies = (profile.allergies || []).join(' ').toLowerCase();
  const isPregnant = profile.pregnancyStatus && profile.pregnancyStatus !== 'N/A' && profile.pregnancyStatus !== 'Not Pregnant';

  // 1. High Urgency Emergency (Chest pain, acute breathlessness, severe neurological signs, high fever in pregnancy)
  const isEmergency =
    lower.includes('chest pain') || lower.includes('shortness of breath') ||
    lower.includes('heart') || lower.includes('palpitation') ||
    (chronic.includes('hypertension') && lower.includes('chest')) ||
    lower.includes('stroke') || lower.includes('seizure') || lower.includes('unconscious') ||
    (isPregnant && (lower.includes('bleeding') || lower.includes('severe abdominal')));

  if (isEmergency) {
    return {
      is_non_medical: false,
      category: 'Acute Cardiovascular / Emergency Symptom Cluster',
      specialty: 'Emergency Department',
      urgency_level: 'high',
      hospital_recommendation: 'HOSPITAL VISIT STRONGLY URGED',
      show_map: true,
      profile_impact_summary: `Analyzed against your health profile: ${isPregnant ? `Pregnancy Status: ${profile.pregnancyStatus}. ` : ''}${chronic ? `Conditions: ${chronic}. ` : ''}${meds ? `Medications: ${meds}.` : ''}`,
      conversational_response: `🏥 **Clinical Decision: Emergency Hospital Evaluation Required**\n\nYour described cluster of symptoms ("${symptomText}")${isPregnant ? ` combined with your current pregnancy (${profile.pregnancyStatus})` : ''}${chronic ? ` and pre-existing ${chronic}` : ''} represents a high-priority medical situation.\n\n**Why a hospital visit is essential**: Chest tightness or severe breathlessness indicates potential acute cardiac or pulmonary strain. Delaying evaluation in these scenarios carries serious risks. We strongly recommend visiting the nearest Emergency Department immediately.\n\n*To save you time, verified nearby emergency facilities with direct call links are displayed on the map below.*`,
      trigger_question: 'Is the pain radiating to your arm, jaw, or back, or are you sweating profusely?',
      precautionary_advice: 'Sit comfortably. Do not engage in physical exertion or drive yourself.',
      emergency_flag: true
    };
  }

  // 2. Simple / Mild Symptoms (e.g. Simple Headache, Mild Fatigue, Slight Cough) — PRAGMATIC HOSPITAL MINIMIZATION
  if (
    (lower.includes('headache') && !lower.includes('severe') && !lower.includes('fever')) ||
    lower.includes('tired') || lower.includes('mild fatigue') || lower.includes('slight cough')
  ) {
    const canTakeParacetamol = !allergies.includes('paracetamol') && !allergies.includes('acetaminophen');
    return {
      is_non_medical: false,
      category: 'Mild Tension / Routine Symptom Cluster',
      specialty: 'Self-Care Monitoring',
      urgency_level: 'low',
      hospital_recommendation: 'NO HOSPITAL VISIT NEEDED (Safe for Home Care)',
      show_map: false,
      profile_impact_summary: `Profile check: ${allergies ? `Allergies noted: ${allergies}. ` : 'No conflicting drug allergies reported.'}`,
      conversational_response: `😊 **Clinical Decision: No Hospital or Clinic Visit Needed**\n\nWe know how valuable your time is. This symptom cluster appears to be a mild tension or routine stress reaction. You do **NOT** need to waste time or money visiting a clinic or hospital right now.\n\n**Recommended Home Self-Care**:\n- Rest in a quiet, hydrated environment.\n${canTakeParacetamol ? '- Over-the-counter pain relief (such as Acetaminophen / Paracetamol) may provide relief if needed and if you have no personal contraindications.' : ''}\n\n**Red Flag Warning**: You only need to consider a doctor if the headache suddenly becomes unmanageably severe (thunderclap) or is accompanied by high fever or neck stiffness.`,
      trigger_question: 'Has this headache been triggered by lack of sleep, screen eye-strain, or stress?',
      precautionary_advice: 'Drink 2 glasses of water and rest your eyes from screens for 30 minutes.',
      emergency_flag: false
    };
  }

  // 3. Skin / Rash Irritation Cluster
  if (
    lower.includes('skin') || lower.includes('rash') || lower.includes('itch') ||
    lower.includes('acne') || lower.includes('eczema')
  ) {
    return {
      is_non_medical: false,
      category: 'Dermatological Irritation / Allergic Cluster',
      specialty: 'Dermatologist',
      urgency_level: 'low',
      hospital_recommendation: 'HOME CARE RECOMMENDED (Clinic Optional)',
      show_map: lower.includes('hospital') || lower.includes('clinic') || lower.includes('doctor') || lower.includes('map'),
      profile_impact_summary: `Profile check: ${allergies ? `Recorded allergies: ${allergies}. ` : 'No drug allergies on file.'}`,
      conversational_response: `🩺 **Clinical Decision: Safe for Home Observation**\n\nAs a busy person, you do not need to rush to a hospital for localized skin irritation. This cluster of symptoms points toward a mild contact reaction or localized skin sensitivity.\n\n${allergies ? `Given your allergy history (${allergies}), check if you recently touched any new products.` : ''}\n\n**Home Care**: Keep the area clean and cool. If the rash spreads rapidly, swells, or develops open blisters, an outpatient dermatologist visit can be scheduled at your convenience.`,
      trigger_question: 'Did this rash appear after contact with new soaps, detergents, cosmetics, or plants?',
      precautionary_advice: 'Avoid scratching the area and refrain from applying harsh scented creams.',
      emergency_flag: false
    };
  }

  // 4. Stomach / Digestive Symptoms Cluster
  if (
    lower.includes('stomach') || lower.includes('nausea') || lower.includes('vomit') ||
    lower.includes('diarrhea') || lower.includes('abdominal')
  ) {
    return {
      is_non_medical: false,
      category: 'Gastrointestinal Irritation Cluster',
      specialty: 'Gastroenterologist',
      urgency_level: 'medium',
      hospital_recommendation: 'OUTPATIENT CLINIC CONSULTATION OPTIONAL',
      show_map: lower.includes('hospital') || lower.includes('clinic') || lower.includes('map'),
      profile_impact_summary: `Profile check: ${meds ? `Active medications (${meds}) checked.` : 'No digestive-irritating chronic meds noted.'}`,
      conversational_response: `🏥 **Clinical Decision: Home Care Reasonable (Clinic Visit Optional)**\n\nStomach discomfort is often caused by temporary dietary irritation or mild gastroenteritis. You do not need an immediate hospital trip unless severe signs appear.\n\n**Home Care**: Focus on small sips of electrolyte fluid and light foods (BRAT diet: bananas, rice, applesauce, toast).\n\n**Red Flags for Hospital Visit**: If you experience severe localized right-lower abdominal pain, high fever, or persistent vomiting for over 24 hours, seek clinical evaluation.`,
      trigger_question: 'Are you able to keep liquids down, and did this start after a specific meal?',
      precautionary_advice: 'Sip oral rehydration fluids slowly.',
      emergency_flag: false
    };
  }

  // 5. Default General Clinical Consultation
  return {
    is_non_medical: false,
    category: 'General Clinical Health Symptom Cluster',
    specialty: 'General Physician',
    urgency_level: 'medium',
    hospital_recommendation: 'OUTPATIENT CONSULTATION OPTIONAL',
    show_map: lower.includes('hospital') || lower.includes('clinic') || lower.includes('map'),
    profile_impact_summary: `Evaluated against health profile: ${profile.gender || 'Patient'}, ${profile.bloodGroup ? `Blood Group ${profile.bloodGroup}, ` : ''}${chronic ? `Conditions: ${chronic}` : 'No major chronic illnesses.'}`,
    conversational_response: `🩺 **Clinical Decision: Home Care First (Clinic Visit Optional)**\n\nOur goal is to save you time and prevent unnecessary hospital trips. This group of symptoms does not show immediate emergency signs.\n\nTry resting and monitoring your symptoms for 24-48 hours. If symptoms worsen or interfere with your daily routine, an outpatient visit with a General Physician can be scheduled without needing emergency care.`,
    trigger_question: 'How many days have you noticed this, and is it getting better or worse?',
    precautionary_advice: 'Rest well and stay hydrated.',
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

    // Step 1: Detect Non-Medical Query (e.g. "what is 2+5", trivia, coding, non-health questions)
    if (isNonMedicalQuery(symptomText)) {
      return res.status(200).json({
        success: true,
        source: 'non_medical_detector',
        data: {
          is_non_medical: true,
          category: 'Non-Medical Inquiry',
          specialty: 'N/A',
          urgency_level: 'none',
          hospital_recommendation: 'NO MEDICAL EVALUATION NEEDED',
          show_map: false,
          profile_impact_summary: '',
          conversational_response: `I am your MediGuide AI Health Counselor. I am dedicated specifically to evaluating physical symptoms and health concerns for busy individuals.\n\nPlease describe any symptoms, discomfort, or health questions you have so I can assist you with an accurate triage recommendation!`,
          trigger_question: '',
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
You are MediGuide's Lead Clinical Triage Evaluator.

YOUR CORE MISSION & USER PROFILE:
Our users are extremely busy working people (12-hour shift workers, 24/7 working parents, busy housewives). They do NOT have time to waste searching endless websites, asking around, or making unnecessary hospital visits.

CRITICAL INSTRUCTIONS:
1. NON-MEDICAL QUERY CHECK:
   If the user asks an off-topic/non-medical question (e.g. math questions like "what is 2+5", general trivia, non-health topics), set "is_non_medical": true and politely inform them that you are dedicated specifically to medical triage and symptom evaluation. DO NOT assign a doctor recommendation or medical urgency for non-medical questions!

2. SYMPTOM CLUSTER GROUPING & PHYSIOLOGICAL EXPLANATION:
   Group the patient's symptoms into a coherent medical symptom cluster (e.g., "Mild Tension Headache Cluster", "Acute Respiratory Congestion Cluster", "Gastrointestinal Irritation Cluster"). Explain what is likely happening in the body in plain, empathetic language.

3. PRAGMATIC HOSPITAL MINIMIZATION PHILOSOPHY:
   - FOR MILD / ROUTINE SYMPTOMS (e.g., simple headache, mild tiredness, slight cough, minor local itch):
     State clearly: "NO HOSPITAL / CLINIC VISIT NEEDED (Safe for Home Care)".
     Provide reassuring home self-care options (e.g. rest, hydration, OTC Paracetamol/Acetaminophen if not allergic).
   - FOR MODERATE SYMPTOMS: State "OUTPATIENT CLINIC VISIT OPTIONAL".
   - FOR EMERGENCY RED-FLAG SYMPTOMS (Chest pain, acute breathlessness, high fever in pregnancy, severe abdominal pain):
     State "HOSPITAL VISIT STRONGLY RECOMMENDED" and explain the exact medical risks of delaying care.

4. DEEP PATIENT PROFILE CROSS-REFERENCING:
   Explicitly cite and analyze the patient's medical profile data:
   - Pregnancy Status (e.g. 2nd Trimester)
   - Pre-existing Chronic Conditions (e.g. Asthma, Hypertension, Diabetes)
   - Active Medications (e.g. Lisinopril, Metformin, Albuterol)
   - Allergies (e.g. Penicillin)
   Explain how these background factors influence this specific symptom cluster.

Respond strictly in valid JSON matching this schema:
{
  "is_non_medical": false,
  "category": "Descriptive Symptom Cluster Grouping",
  "specialty": "Recommended Doctor Specialist or Self-Care Monitoring",
  "urgency_level": "high | medium | low | none",
  "hospital_recommendation": "HOSPITAL VISIT STRONGLY URGED | CLINIC VISIT OPTIONAL | NO HOSPITAL VISIT NEEDED (Safe for Home Care)",
  "show_map": true | false,
  "profile_impact_summary": "Explicit summary of how patient's pregnancy, medications, chronic conditions impact this evaluation",
  "conversational_response": "Pragmatic, compassionate clinical evaluation explaining symptom cluster, hospital decision, home self-care options, and risks",
  "trigger_question": "Targeted clinical follow-up question regarding onset, triggers, or severity",
  "precautionary_advice": "Safe home self-care advice or red flag warnings",
  "emergency_flag": true | false
}
`;

    const historyFormatted = (chatHistory || [])
      .map(m => `${m.sender === 'user' ? 'Patient' : 'Clinical AI Counselor'}: ${m.text}`)
      .join('\n');

    const promptText = `
PATIENT FULL MEDICAL PROFILE & CONTEXT:
- Gender: ${patientProfile?.gender || 'Not specified'}
- Date of Birth / Age: ${patientProfile?.dateOfBirth || 'Not specified'}
- Pregnancy Status: ${patientProfile?.pregnancyStatus || 'Not Pregnant / N/A'}
- Blood Group: ${patientProfile?.bloodGroup || 'Not specified'}
- Known Allergies: ${patientProfile?.allergies?.join(', ') || 'None reported'}
- Pre-existing Chronic Conditions: ${patientProfile?.preExistingConditions?.join(', ') || 'None reported'}
- Current Active Medications: ${patientProfile?.currentMedications?.map(m => `${typeof m === 'string' ? m : m.name}`).join(', ') || 'None reported'}

PREVIOUS CHAT CONVERSATION HISTORY:
${historyFormatted || 'Start of new clinical evaluation'}

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
