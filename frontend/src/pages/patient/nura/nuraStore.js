// Nura conversation store: one per account, shared by the list and the chat view.
// Lives outside React so an in-flight reply still lands (and is saved) if the user
// switches screens or the route remounts while Nura is typing.
import { useSyncExternalStore } from 'react';
import { submitTriageSymptom } from '../../../services/api';
import { loadSessions, saveSessions, newId, slimResult, makeTitle, MAX_SESSIONS, MAX_MESSAGES } from '../chatStorage';

const HISTORY_TURNS = 8; // recent turns sent to the server
const SPEAKING_MS = 2400; // how long Nura "speaks" after a reply arrives

// userId -> { sessions, pending: { [sessionId]: true }, errors: { [sessionId]: {...} }, speaking: sessionId | null }
const stores = new Map();
const listeners = new Set();

const getState = (userId) => {
  let st = stores.get(userId);
  if (!st) {
    // Lazy, idempotent cache fill from localStorage
    st = { sessions: loadSessions(userId), pending: {}, errors: {}, speaking: null };
    stores.set(userId, st);
  }
  return st;
};

const setState = (userId, patch) => {
  const prev = getState(userId);
  const next = { ...prev, ...patch };
  stores.set(userId, next);
  if (patch.sessions) saveSessions(userId, next.sessions);
  listeners.forEach((l) => l());
};

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useNuraStore(userId) {
  return useSyncExternalStore(subscribe, () => getState(userId));
}

const omit = (obj, key) => {
  if (!(key in obj)) return obj;
  const copy = { ...obj };
  delete copy[key];
  return copy;
};

// Add a message to a session (creating it if needed) and move it to the top
const appendMessage = (userId, sessionId, message, title) => {
  const { sessions } = getState(userId);
  const existing = sessions.find((s) => s.id === sessionId);
  const session = existing
    ? { ...existing, updatedAt: message.time, messages: [...existing.messages, message].slice(-MAX_MESSAGES) }
    : { id: sessionId, title: title || 'Conversation', createdAt: message.time, updatedAt: message.time, messages: [message] };
  setState(userId, { sessions: [session, ...sessions.filter((s) => s.id !== sessionId)].slice(0, MAX_SESSIONS) });
};

const friendlyError = (err) => {
  if (err?.status === 429) return "You're sending messages quickly. Wait a moment, then try again.";
  if (err?.status === 0 || /network|failed to fetch/i.test(err?.message || '')) return 'Nura could not be reached. Check your connection and try again.';
  return err?.message || 'Something went wrong. Please try again.';
};

let speakingTimer = null;

async function request(userId, sessionId, text, history) {
  const st = getState(userId);
  setState(userId, { pending: { ...st.pending, [sessionId]: true }, errors: omit(st.errors, sessionId) });
  try {
    const result = await submitTriageSymptom(text, history);
    appendMessage(userId, sessionId, {
      id: newId(),
      sender: 'ai',
      text: result?.conversational_response || 'Sorry, I could not put together a reply. Could you say that another way?',
      result: slimResult(result),
      time: new Date().toISOString()
    });
    setState(userId, { pending: omit(getState(userId).pending, sessionId), speaking: sessionId });
    clearTimeout(speakingTimer);
    speakingTimer = setTimeout(() => {
      if (getState(userId).speaking === sessionId) setState(userId, { speaking: null });
    }, SPEAKING_MS);
  } catch (err) {
    const now = getState(userId);
    setState(userId, {
      pending: omit(now.pending, sessionId),
      errors: { ...now.errors, [sessionId]: { text, history, message: friendlyError(err) } }
    });
  }
}

// Send a user message. Returns false when the message is empty or a reply is pending.
export function sendMessage(userId, sessionId, raw) {
  const text = String(raw || '').trim();
  const st = getState(userId);
  if (!text || st.pending[sessionId]) return false;
  const existing = st.sessions.find((s) => s.id === sessionId);
  const history = (existing?.messages || []).slice(-HISTORY_TURNS).map((m) => ({ sender: m.sender, text: m.text }));
  appendMessage(userId, sessionId, { id: newId(), sender: 'user', text, time: new Date().toISOString() }, makeTitle(text));
  request(userId, sessionId, text, history);
  return true;
}

export function retryMessage(userId, sessionId) {
  const st = getState(userId);
  const err = st.errors[sessionId];
  if (err && !st.pending[sessionId]) request(userId, sessionId, err.text, err.history);
}

export function deleteSession(userId, sessionId) {
  const st = getState(userId);
  setState(userId, {
    sessions: st.sessions.filter((s) => s.id !== sessionId),
    errors: omit(st.errors, sessionId)
  });
}
