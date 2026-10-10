// Shared helpers for care plans: icons, local dates and relative labels.
import {
  Baby, Pill, Activity, Droplet, HeartPulse, Wind, ClipboardList,
  Stethoscope, FlaskConical, Syringe, Flag, ClipboardCheck
} from 'lucide-react';

export const PLAN_ICONS = {
  pregnancy: Baby,
  tb: Pill,
  chemo: Activity,
  diabetes: Droplet,
  hypertension: HeartPulse,
  asthma: Wind
};
export const planIcon = (type) => PLAN_ICONS[type] || ClipboardList;

export const KINDS = [
  { value: 'visit', label: 'Visit', icon: Stethoscope },
  { value: 'test', label: 'Test', icon: FlaskConical },
  { value: 'vaccine', label: 'Vaccine', icon: Syringe },
  { value: 'medicine', label: 'Medicine', icon: Pill },
  { value: 'milestone', label: 'Milestone', icon: Flag },
  { value: 'review', label: 'Review', icon: ClipboardCheck }
];
export const kindIcon = (kind) => (KINDS.find((k) => k.value === kind) || KINDS[0]).icon;
export const kindLabel = (kind) => (KINDS.find((k) => k.value === kind) || KINDS[0]).label;

// ── Dates (always local calendar days, never UTC-shifted) ──────────────────
const pad = (n) => String(n).padStart(2, '0');
export const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => toIso(new Date());
export const parseIso = (s) => {
  const [y, m, d] = String(s || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
export const addDaysIso = (s, n) => {
  const d = parseIso(s);
  if (!d) return '';
  d.setDate(d.getDate() + n);
  return toIso(d);
};
export const daysBetween = (a, b) => {
  const da = parseIso(a);
  const db = parseIso(b);
  if (!da || !db) return 0;
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000);
};

export function formatDate(s, { year = 'auto', weekday = false } = {}) {
  const d = parseIso(s);
  if (!d) return '';
  const showYear = year === true || (year === 'auto' && d.getFullYear() !== new Date().getFullYear());
  return d.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', ...(showYear ? { year: 'numeric' } : {}), ...(weekday ? { weekday: 'short' } : {})
  });
}

// "today", "tomorrow", "in 5 days", "3 days ago"
export function relativeDays(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 1) return `in ${days} days`;
  return `${-days} days ago`;
}

export const ordinal = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd' }[n] || `${n}th`);

// Short progress line for cards ("Week 26 · 2nd trimester", "Cycle 1, day 10")
export function shortProgress(plan) {
  const p = plan.progress || {};
  if (plan.status === 'active' && typeof p.day === 'number' && p.day < 0) {
    return `Starts ${formatDate(plan.startDate)}`;
  }
  if (plan.type === 'pregnancy' && typeof p.week === 'number') return `Week ${p.week} · ${ordinal(p.trimester)} trimester`;
  if (plan.type === 'chemo' && typeof p.cycle === 'number') return `Cycle ${p.cycle}, day ${p.cycleDay}`;
  return p.label || '';
}

export const notStarted = (plan) => plan.status === 'active' && typeof plan.progress?.day === 'number' && plan.progress.day < 0;
export const lowImmunity = (plan) => plan.status === 'active' && plan.type === 'chemo' && Boolean(plan.progress?.lowImmunity) && !notStarted(plan);

// A past "milestone" (e.g. "Low-immunity days start") is an event, not a task: it passes
// rather than becoming overdue. Visits, tests, vaccines and medicines can be overdue.
export const passed = (ms) => !ms.done && ms.overdue && ms.kind === 'milestone';
export const isOverdue = (ms) => ms.overdue && !passed(ms);
export const overdueCount = (plan) => (plan.milestones || []).filter(isOverdue).length;

// Badge tone + text for a milestone's timing
export function milestoneTiming(ms) {
  if (ms.done) return { tone: 'success', text: 'Done' };
  if (passed(ms)) return { tone: 'neutral', text: 'Passed' };
  if (ms.overdue) return { tone: 'warning', text: 'Overdue' };
  if (ms.daysAway === 0) return { tone: 'brand', text: 'Today' };
  return { tone: 'neutral', text: relativeDays(ms.daysAway) };
}
