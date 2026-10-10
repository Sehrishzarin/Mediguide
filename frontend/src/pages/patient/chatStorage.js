// Per-account Nura conversations kept in localStorage.
// PatientHome reads the same key (via loadSessions) to show recent conversations, so keep the shape stable:
//   [{ id, title, createdAt, updatedAt?, assessment?, messages: [{ id, sender: 'user'|'ai', text, result?, time }] }]
// Sessions are stored most recently updated first.

const LEGACY_KEY = 'mediguide_ai_chats';
export const MAX_SESSIONS = 30;
export const MAX_MESSAGES = 60;
const TITLE_MAX = 48;

export const chatKey = (userId) => `mediguide_ai_chats:${userId}`;

const isMessage = (m) => m && typeof m === 'object' && typeof m.text === 'string' && (m.sender === 'user' || m.sender === 'ai');

const clean = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.id === 'string' && Array.isArray(s.messages))
    .map((s) => {
      const createdAt = s.createdAt || new Date(0).toISOString();
      return {
        id: s.id,
        title: typeof s.title === 'string' && s.title ? s.title : 'Conversation',
        createdAt,
        updatedAt: s.updatedAt || createdAt,
        messages: s.messages.filter(isMessage).slice(-MAX_MESSAGES),
        // In-progress guided assessment state to send back with the next message
        assessment: s.assessment && typeof s.assessment === 'object' ? s.assessment : null
      };
    })
    .filter((s) => s.messages.length > 0)
    .slice(0, MAX_SESSIONS);
};

export function loadSessions(userId) {
  try {
    // The old un-namespaced key mixed accounts together: drop it after one read
    if (localStorage.getItem(LEGACY_KEY) !== null) localStorage.removeItem(LEGACY_KEY);
    return clean(JSON.parse(localStorage.getItem(chatKey(userId)) || '[]'));
  } catch {
    return [];
  }
}

export function saveSessions(userId, sessions) {
  try {
    localStorage.setItem(chatKey(userId), JSON.stringify(clean(sessions)));
  } catch { /* storage full or unavailable: chat still works in memory */ }
}

export const newId = () =>
  (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${performance.now().toString(36).replace('.', '')}`);

// Conversation title from the first user message
export const makeTitle = (text) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return 'Conversation';
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX - 1).trimEnd()}…` : t;
};

// The UI uses no emojis: drop any that arrive in Nura's replies
export const stripEmoji = (text) =>
  String(text || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/[ \t]+$/gm, '');

// Plain-text preview of a message (strips **bold** markers, bullets and emojis)
export const previewText = (text) =>
  stripEmoji(text).replace(/\*\*/g, '').replace(/^\s*[•*-]\s+/gm, '').replace(/\s+/g, ' ').trim();

// Only keep what the UI needs from a Nura reply
export const slimResult = (r = {}) => ({
  is_non_medical: Boolean(r.is_non_medical),
  mood: ['idle', 'happy', 'empathetic', 'concerned'].includes(r.mood) ? r.mood : '',
  category: r.category || '',
  specialty: r.specialty || '',
  urgency_level: r.urgency_level || 'none',
  hospital_recommendation: r.hospital_recommendation || '',
  show_map: Boolean(r.show_map),
  profile_impact_summary: r.profile_impact_summary || '',
  trigger_question: r.trigger_question || '',
  precautionary_advice: r.precautionary_advice || '',
  emergency_flag: Boolean(r.emergency_flag),
  suggested_replies: Array.isArray(r.suggested_replies)
    ? r.suggested_replies.filter((x) => typeof x === 'string' && x.trim()).slice(0, 4)
    : [],
  cta: r.cta && r.cta.type === 'book' ? { type: 'book', specialty: r.cta.specialty || '', slotId: r.cta.slotId || '' } : null,
  input: slimInput(r.input),
  summary: r.summary && typeof r.summary === 'object' ? slimSummary(r.summary) : null
});

const strings = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()) : []);

// A structured answer widget (scale | choice | multi) from a guided assessment
function slimInput(input) {
  if (!input || !['scale', 'choice', 'multi'].includes(input.type) || !Array.isArray(input.options)) return null;
  return {
    type: input.type,
    id: String(input.id || ''),
    question: input.question || '',
    options: input.options
      .filter((o) => o && (typeof o.value === 'string' || typeof o.value === 'number'))
      .map((o) => ({ value: o.value, label: String(o.label ?? o.value) })),
    noneLabel: input.noneLabel || ''
  };
}

const LEVELS = ['emergency', 'urgent', 'soon', 'home'];
function slimSummary(sm) {
  const n = sm.nearest;
  const slot = sm.nextSlot;
  return {
    level: LEVELS.includes(sm.level) ? sm.level : 'soon',
    title: sm.title || '',
    message: sm.message || '',
    reasons: strings(sm.reasons),
    advice: strings(sm.advice),
    warnings: strings(sm.warnings),
    medicineNotes: strings(sm.medicineNotes),
    specialty: sm.specialty || '',
    symptom: sm.symptom || '',
    nearest: n && n.name ? {
      id: n.id || '',
      name: n.name,
      type: n.type || '',
      phone: n.phone || '',
      address: n.address || '',
      isPartner: Boolean(n.isPartner),
      location: n.location && Array.isArray(n.location.coordinates) ? { coordinates: n.location.coordinates.slice(0, 2) } : null,
      distanceKm: typeof n.distanceKm === 'number' ? n.distanceKm : null
    } : null,
    nextSlot: slot && slot.id ? {
      id: slot.id,
      doctor: slot.doctor || '',
      specialty: slot.specialty || '',
      date: slot.date || '',
      time: slot.time || ''
    } : null
  };
}

// Specialty values that are not something you can book (e.g. "Self-Care Monitoring")
const NOT_BOOKABLE = /self[- ]?care|monitor|^none$|^n\/?a$|not applicable|emergency/i;
export const bookableSpecialty = (r) => {
  const raw = (r && (r.specialty || r.cta?.specialty)) || '';
  return NOT_BOOKABLE.test(raw) ? '' : raw;
};
