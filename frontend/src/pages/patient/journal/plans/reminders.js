// Native milestone reminders for active care plans: a local notification at 9:00 AM
// the day before each upcoming milestone (up to MAX). Ids 7000-7999 are reserved for
// care plans (Check-In uses 41001/41002). Rescheduled every time the plan list changes.
// Best effort only: every call is wrapped and nothing runs on the web.
import { Capacitor } from '@capacitor/core';
import { parseIso, formatDate } from './planFormat';

const ID_BASE = 7000;
const ID_MAX = 7999;
const MAX = 20;
const CHANNEL = 'care-plans';

const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

let pluginPromise = null;
const plugin = () => {
  if (!isNative()) return Promise.resolve(null);
  if (!pluginPromise) {
    pluginPromise = import('@capacitor/local-notifications')
      .then(async (m) => {
        const LN = m.LocalNotifications;
        try {
          await LN.createChannel({ id: CHANNEL, name: 'Care plan reminders', description: 'Check-ups and tests from your care plans', importance: 3 });
        } catch { /* channels are Android-only */ }
        return LN;
      })
      .catch(() => null);
  }
  return pluginPromise;
};

const reminderTime = (dueDate) => {
  const d = parseIso(dueDate);
  if (!d) return null;
  d.setDate(d.getDate() - 1);
  d.setHours(9, 0, 0, 0);
  return d;
};

// Upcoming, not-done milestones of active plans, soonest first
const upcoming = (plans) => {
  const now = Date.now();
  const out = [];
  plans.filter((p) => p.status === 'active').forEach((p) => {
    p.milestones.forEach((ms) => {
      if (ms.done) return;
      const at = reminderTime(ms.dueDate);
      if (at && at.getTime() > now + 60000) out.push({ plan: p, ms, at });
    });
  });
  return out.sort((a, b) => a.at - b.at).slice(0, MAX);
};

let lastKey = '';
let queue = Promise.resolve();

async function cancelOurs(LN) {
  try {
    const { notifications = [] } = await LN.getPending();
    const ours = notifications.filter((n) => n.id >= ID_BASE && n.id <= ID_MAX).map((n) => ({ id: n.id }));
    if (ours.length) await LN.cancel({ notifications: ours });
  } catch { /* ignore */ }
}

async function run(plans) {
  const LN = await plugin();
  if (!LN) return;
  const items = upcoming(plans);
  const key = items.map((x) => `${x.ms.id}@${x.ms.dueDate}`).join('|');
  if (key === lastKey) return;
  try {
    // Ask for permission once there is something to remind about
    let perm = await LN.checkPermissions();
    if (items.length && perm.display === 'prompt') perm = await LN.requestPermissions();
    await cancelOurs(LN);
    lastKey = key;
    if (!items.length || perm.display !== 'granted') return;
    await LN.schedule({
      notifications: items.map((x, i) => ({
        id: ID_BASE + i,
        title: `Tomorrow: ${x.ms.title}`,
        body: `${x.plan.title} plan · ${formatDate(x.ms.dueDate, { weekday: true })}`,
        schedule: { at: x.at, allowWhileIdle: true },
        channelId: CHANNEL,
        extra: { kind: 'plan-milestone', planId: x.plan.id }
      }))
    });
  } catch { /* reminders are best effort */ }
}

export function syncPlanReminders(plans) {
  if (!isNative()) return Promise.resolve();
  queue = queue.then(() => run(Array.isArray(plans) ? plans : [])).catch(() => {});
  return queue;
}
