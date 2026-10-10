// Nura's facial expression for a reply.
// The server (Gemini or the local engine) sends `mood`; older stored replies fall back to
// what the reply contains.
export const REPLY_MOODS = ['idle', 'happy', 'empathetic', 'concerned'];

export function moodForResult(r) {
  if (!r) return 'idle';
  const level = r.summary?.level;
  // Urgent outcomes always look concerned, whatever the model said
  if (r.emergency_flag || level === 'emergency' || level === 'urgent') return 'concerned';
  if (REPLY_MOODS.includes(r.mood)) return r.mood;
  if (level === 'home') return 'happy';
  if (r.input) return 'empathetic'; // asking about a symptom
  return 'idle';
}
