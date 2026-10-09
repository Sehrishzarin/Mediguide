// Time labels for the Nura chat.
import { useSyncExternalStore } from 'react';

// ── "Now" that ticks once a minute (read outside render to keep components pure) ──
let now = Date.now();
const nowListeners = new Set();
let nowTimer = null;
const subscribeNow = (l) => {
  nowListeners.add(l);
  if (!nowTimer) {
    now = Date.now();
    nowTimer = setInterval(() => { now = Date.now(); nowListeners.forEach((fn) => fn()); }, 60000);
  }
  return () => {
    nowListeners.delete(l);
    if (!nowListeners.size) { clearInterval(nowTimer); nowTimer = null; }
  };
};
export const useNow = () => useSyncExternalStore(subscribeNow, () => now);

const timeOf = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();

// "2:14 pm" today, "Yesterday", "12 Oct" (adds the year when it is not this year)
export function listTime(iso, nowMs) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date(nowMs);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (d.getTime() >= startOfToday) return timeOf(d);
  if (d.getTime() >= startOfToday - 86400000) return 'Yesterday';
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-GB', opts);
}

export const messageTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : timeOf(d);
};
