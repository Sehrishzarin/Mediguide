// Local calendar dates as 'YYYY-MM-DD' strings. Arithmetic runs on UTC midnights of the
// string's own Y/M/D, so no timezone (Pakistan is UTC+5) or DST shift can move a day.
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Local date of a Date object (never toISOString, which is UTC)
export const localIso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toUtc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (t) => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const isValidIso = (iso) => DATE_RE.test(iso || '') && fromUtc(toUtc(iso)) === iso;
export const addDays = (iso, n) => fromUtc(toUtc(iso) + n * DAY);
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / DAY);

// A Date at local noon for formatting with toLocaleDateString (noon avoids edge shifts)
export const isoToDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const monthKey = (iso) => iso.slice(0, 7); // 'YYYY-MM'
export const addMonths = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
// Day of week with Monday = 0
export const weekdayMon0 = (iso) => (new Date(toUtc(iso)).getUTCDay() + 6) % 7;

// The 6x7 (or 5x7) grid of dates covering a month, Monday first
export function monthGrid(key) {
  const first = `${key}-01`;
  const start = addDays(first, -weekdayMon0(first));
  const nextFirst = `${addMonths(key, 1)}-01`;
  const lastDay = addDays(nextFirst, -1);
  const end = addDays(lastDay, 6 - weekdayMon0(lastDay));
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return { start, end, days };
}

export const formatMonth = (key) =>
  isoToDate(`${key}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const formatShort = (iso, opts = {}) =>
  isoToDate(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', ...opts });

export const formatDay = (iso) => isoToDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// "Today" / "Yesterday" / "Sat 4 Oct"
export function relativeDay(iso, today) {
  if (today && iso === today) return 'Today';
  if (today && iso === addDays(today, -1)) return 'Yesterday';
  const sameYear = today && iso.slice(0, 4) === today.slice(0, 4);
  return formatShort(iso, sameYear ? {} : { year: 'numeric' });
}

export const formatRange = (a, b) => (a === b ? formatDay(a) : `${formatDay(a)} – ${formatDay(b)}`);

export function ageFrom(dob, today) {
  if (!dob) return null;
  const birth = String(dob).slice(0, 10);
  if (!DATE_RE.test(birth) || !today) return null;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
