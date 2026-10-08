// Per-account chat history kept in localStorage.
// PatientHome reads the same key to show recent consultations — keep the shape stable:
//   [{ id, title, createdAt, messages: [{ id, sender, text, result?, time }] }]

const LEGACY_KEY = 'mediguide_ai_chats';
export const MAX_SESSIONS = 30;
export const MAX_MESSAGES = 60;

export const chatKey = (userId) => `mediguide_ai_chats:${userId}`;

const isMessage = (m) => m && typeof m === 'object' && typeof m.text === 'string' && (m.sender === 'user' || m.sender === 'ai');

const clean = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.id === 'string' && Array.isArray(s.messages))
    .map((s) => ({
      id: s.id,
      title: typeof s.title === 'string' && s.title ? s.title : 'Consultation',
      createdAt: s.createdAt || new Date(0).toISOString(),
      messages: s.messages.filter(isMessage).slice(-MAX_MESSAGES)
    }))
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

// Only keep what the UI needs from a triage result
export const slimResult = (r) => ({
  is_non_medical: Boolean(r.is_non_medical),
  category: r.category || '',
  specialty: r.specialty || '',
  urgency_level: r.urgency_level || 'none',
  hospital_recommendation: r.hospital_recommendation || '',
  show_map: Boolean(r.show_map),
  profile_impact_summary: r.profile_impact_summary || '',
  trigger_question: r.trigger_question || '',
  precautionary_advice: r.precautionary_advice || '',
  emergency_flag: Boolean(r.emergency_flag)
});
