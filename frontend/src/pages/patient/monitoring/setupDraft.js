// Setup choices kept for the session, so a trip to a contact's demo phone and back keeps them.
const KEY = 'mediguide_checkin_setup';

export function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function saveDraft(draft) {
  try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* storage unavailable */ }
}
export function clearDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
