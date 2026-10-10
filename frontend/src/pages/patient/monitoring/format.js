// Labels and time helpers shared by the Nura Check-In screens, banner and Home card.

export const INTERVALS = [
  { value: 60, label: '1 hr' },
  { value: 120, label: '2 hrs' },
  { value: 240, label: '4 hrs' },
  { value: 360, label: '6 hrs' }
];
export const ALERT_AFTER = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hr' }
];
// Segmented needs string-safe values; "until" maps to durationMin: null
export const DURATIONS = [
  { value: '1440', label: '24 hrs' },
  { value: '4320', label: '3 days' },
  { value: 'until', label: 'Until I stop' }
];

export const REASONS = ['fever', 'headache', 'stomach', 'cough', 'general'];
const REASON_LABEL = { fever: 'fever', headache: 'headache', stomach: 'stomach', cough: 'cough', general: 'symptom' };
const REASON_WORSE = { fever: 'fever', headache: 'headache', stomach: 'stomach pain', cough: 'cough', general: 'condition' };

export const reasonLabel = (reason) => REASON_LABEL[reason] || REASON_LABEL.general;
export const normalizeReason = (raw) => (REASONS.includes(raw) ? raw : 'general');

// Maps a Nura assessment summary (symptom label / category) to a monitoring reason
export function reasonFromSummary(summary) {
  const text = `${summary?.symptom || ''} ${summary?.category || ''} ${summary?.title || ''}`.toLowerCase();
  if (/fever|temperature/.test(text)) return 'fever';
  if (/headache|migraine/.test(text)) return 'headache';
  if (/stomach|abdomen|abdominal|belly|diarr|vomit/.test(text)) return 'stomach';
  if (/cough/.test(text)) return 'cough';
  return 'general';
}

export const recheckUrl = (reason) =>
  `/patient/nura/new?q=${encodeURIComponent(`My ${REASON_WORSE[reason] || REASON_WORSE.general} is getting worse`)}`;

export const intervalLabel = (min) => {
  const hrs = min / 60;
  return hrs === 1 ? '1 hr' : `${hrs} hrs`;
};
export const alertAfterLabel = (min) => (min === 60 ? '1 hr' : `${min} min`);

export const ANSWER_LABEL = { better: 'Better', same: 'Same', worse: 'Worse', help: 'Need help', ok: "I'm OK" };

export const firstName = (name) => (name || '').trim().split(/\s+/)[0] || '';

// "Ammi", "Ammi and Abbu", "Ammi, Abbu and Sara"
export const joinNames = (names) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const toDate = (v) => (v instanceof Date ? v : new Date(v));
const valid = (d) => d instanceof Date && !Number.isNaN(d.getTime());

// Clock time in the user's locale. Demo speed runs in seconds, so show them.
export function clockTime(value, withSeconds = false) {
  const d = toDate(value);
  if (!valid(d)) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}) });
}

export function dayLabel(value, now = new Date()) {
  const d = toDate(value);
  if (!valid(d)) return '';
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function dateTime(value, now = new Date()) {
  const d = toDate(value);
  if (!valid(d)) return '';
  const day = dayLabel(d, now);
  return `${day === 'Today' ? 'today' : day === 'Yesterday' ? 'yesterday' : day} at ${clockTime(d)}`;
}

// Real-time countdown: "in 2 h 5 min", "in 45 s"; `precise` (demo speed) keeps the seconds
export function countdown(target, now, precise = false) {
  const ms = toDate(target).getTime() - now;
  if (!Number.isFinite(ms)) return '';
  if (ms <= 1000) return 'any moment now';
  const s = Math.round(ms / 1000);
  if (s < 60) return `in ${s} s`;
  if (precise && s < 3600) return `in ${Math.floor(s / 60)} min ${s % 60} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return `in ${h} h${rest ? ` ${rest} min` : ''}`;
}

export const sameDay = (a, b) => {
  const x = toDate(a);
  const y = toDate(b);
  return valid(x) && valid(y) && x.toDateString() === y.toDateString();
};

// "this morning" / "yesterday" / "earlier"
export function comparedTo(ref, now) {
  const d = toDate(ref);
  const n = toDate(now);
  if (!valid(d)) return 'earlier';
  if (!sameDay(d, n)) return 'yesterday';
  if (d.getHours() < 12 && n.getHours() >= 12) return 'this morning';
  return 'earlier';
}

// Which screen an active session needs
export function monitoringView(m) {
  const open = m?.openCheckIn;
  if (!open) return 'status';
  if (open.answered) return 'helpSent';
  const loud = open.steps.find((x) => x.key === 'loud');
  return loud && loud.status === 'done' ? 'escalation' : 'prompt';
}

// Contacts whose consent is "agreed", by first name
export const agreedNames = (m) => (m?.contacts || []).filter((c) => c.consent === 'agreed').map((c) => c.name);

export const isDemoStep = (key) => key === 'sms_contacts' || key === 'call_user' || key.startsWith('call_contact_');
