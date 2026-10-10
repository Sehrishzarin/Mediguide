// Daily journal reminder (native app only): one repeating local notification at the
// chosen time. Settings are a per-device convenience, stored in localStorage per user.
// Uses its own notification id (42001), separate from Nura Check-In (41001-41002).
import { Capacitor } from '@capacitor/core';
import { notificationPlugin } from '../monitoring/notifications';

const ID = 42001;
const CHANNEL = 'journal-reminder';
const DEFAULT = { enabled: false, time: '20:00' };
const key = (userId) => `mediguide_journal_reminder_${userId}`;

export const reminderSupported = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export function loadReminder(userId) {
  if (!userId) return { ...DEFAULT };
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) || 'null');
    if (raw && typeof raw === 'object') {
      return { enabled: Boolean(raw.enabled), time: /^\d{2}:\d{2}$/.test(raw.time || '') ? raw.time : DEFAULT.time };
    }
  } catch { /* storage unavailable */ }
  return { ...DEFAULT };
}

const store = (userId, settings) => {
  try { localStorage.setItem(key(userId), JSON.stringify(settings)); } catch { /* ignore */ }
};

async function cancel(LN) {
  try { await LN.cancel({ notifications: [{ id: ID }] }); } catch { /* ignore */ }
}

async function schedule(LN, time) {
  const [hour, minute] = time.split(':').map(Number);
  try {
    await LN.createChannel({ id: CHANNEL, name: 'Journal reminder', description: 'A daily reminder to log your day', importance: 3 });
  } catch { /* channels are Android-only */ }
  await cancel(LN);
  await LN.schedule({
    notifications: [{
      id: ID,
      title: 'Health journal',
      body: 'How was your day? Log it in your journal',
      schedule: { on: { hour, minute }, allowWhileIdle: true },
      channelId: CHANNEL,
      extra: { kind: 'journal' }
    }]
  });
}

// Saves the settings and (re)schedules. Returns { ok, message }.
export async function saveReminder(userId, settings) {
  const LN = await notificationPlugin();
  if (!LN) return { ok: false, message: 'Reminders work in the MediGuide app.' };
  try {
    if (settings.enabled) {
      const perm = await LN.requestPermissions();
      if (perm.display !== 'granted') {
        return { ok: false, message: 'Allow notifications for MediGuide in your phone settings to get reminders.' };
      }
      await schedule(LN, settings.time);
    } else {
      await cancel(LN);
    }
    store(userId, settings);
    return { ok: true };
  } catch {
    return { ok: false, message: "We couldn't set the reminder. Please try again." };
  }
}

// Called when a patient signs in on this device: applies their saved settings
// (another account's reminder is cleared).
export async function syncJournalReminder(userId) {
  if (!reminderSupported()) return;
  const LN = await notificationPlugin();
  if (!LN) return;
  const settings = loadReminder(userId);
  try {
    if (settings.enabled && (await LN.checkPermissions()).display === 'granted') await schedule(LN, settings.time);
    else await cancel(LN);
  } catch { /* best effort */ }
}

export async function cancelJournalReminder() {
  const LN = await notificationPlugin();
  if (LN) await cancel(LN);
}
