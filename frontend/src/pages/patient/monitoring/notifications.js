// Local notifications for Nura Check-In.
// Native (Capacitor): a scheduled notification for the next check-in with I'm OK / Worse /
// Need help buttons, and an immediate high-priority one once the loud step has run.
// Web: no scheduling (the in-app banner covers it); if the browser already allows
// notifications, the loud reminder is shown with the Notification API.
// Every native call is wrapped: notifications are a convenience, never a hard dependency.
import { Capacitor } from '@capacitor/core';
import { clockTime } from './format';

const ACTION_TYPE = 'NURA_CHECKIN';
const CHANNEL = 'nura-checkin';
const ALERT_CHANNEL = 'nura-alert';
const ID_NEXT = 41001;
const ID_LOUD = 41002;

const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

let pluginPromise = null;
const plugin = () => {
  if (!isNative()) return Promise.resolve(null);
  if (!pluginPromise) {
    pluginPromise = import('@capacitor/local-notifications')
      .then((m) => m.LocalNotifications)
      .catch(() => null);
  }
  return pluginPromise;
};

let setupDone = null;
let listenerHandle = null;
let actionHandler = null;

// One-time setup: channels, action buttons and the tap/action listener
function setup() {
  if (!setupDone) {
    setupDone = (async () => {
      const LN = await plugin();
      if (!LN) return null;
      try {
        await LN.createChannel({ id: CHANNEL, name: 'Nura check-ins', description: 'Scheduled check-ins from Nura', importance: 4, vibration: true });
        await LN.createChannel({ id: ALERT_CHANNEL, name: 'Nura alerts', description: "When Nura hasn't heard from you", importance: 5, vibration: true });
      } catch { /* channels are Android-only */ }
      try {
        await LN.registerActionTypes({
          types: [{
            id: ACTION_TYPE,
            actions: [
              { id: 'ok', title: "I'm OK" },
              { id: 'worse', title: 'Worse' },
              { id: 'help', title: 'Need help', destructive: true }
            ]
          }]
        });
      } catch { /* ignore */ }
      try {
        listenerHandle = await LN.addListener('localNotificationActionPerformed', (event) => {
          if (actionHandler) actionHandler(event?.actionId || 'tap');
        });
      } catch { /* ignore */ }
      return LN;
    })();
  }
  return setupDone;
}

// actionId: 'ok' | 'worse' | 'help' | 'tap'
export function onNotificationAction(handler) {
  actionHandler = handler;
  if (isNative()) setup();
  return () => { if (actionHandler === handler) actionHandler = null; };
}

const granted = async (LN) => {
  try { return (await LN.checkPermissions()).display === 'granted'; } catch { return false; }
};

// Ask for permission (called when the patient starts monitoring)
export async function requestNotificationPermission() {
  const LN = await setup();
  if (!LN) return false;
  try { return (await LN.requestPermissions()).display === 'granted'; } catch { return false; }
}

// ── Sync with the latest monitoring state ──────────────────────────────────
let scheduledKey = '';
let loudFor = '';
let webLoudFor = '';
let hadAny = false;

const loudDone = (open) => Boolean(open && !open.answered && open.steps.some((x) => x.key === 'loud' && x.status === 'done'));

export async function syncNotifications(m) {
  const open = m?.openCheckIn || null;

  // Web: show the loud reminder only if the browser already allows notifications
  if (!isNative()) {
    try {
      if (loudDone(open) && webLoudFor !== open.id && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        webLoudFor = open.id;
        new Notification("Nura hasn't heard from you", { body: 'Tap to answer your check-in.', tag: 'nura-loud' });
      }
    } catch { /* ignore */ }
    return;
  }

  const LN = await setup();
  if (!LN) return;

  try {
    if (!m) {
      if (hadAny) {
        hadAny = false;
        scheduledKey = '';
        loudFor = '';
        await LN.cancel({ notifications: [{ id: ID_NEXT }, { id: ID_LOUD }] });
      }
      return;
    }
    if (!(await granted(LN))) return;

    // Next scheduled check-in
    const key = `${m.id}:${m.nextCheckInAt}`;
    if (key !== scheduledKey) {
      scheduledKey = key;
      await LN.cancel({ notifications: [{ id: ID_NEXT }] }).catch(() => {});
      const at = new Date(m.nextCheckInAt);
      if (at.getTime() > Date.now() + 1000) {
        hadAny = true;
        await LN.schedule({
          notifications: [{
            id: ID_NEXT,
            title: 'Nura: How are you feeling?',
            body: `Your ${clockTime(at)} check-in. Tap to answer.`,
            schedule: { at, allowWhileIdle: true },
            actionTypeId: ACTION_TYPE,
            channelId: CHANNEL,
            extra: { kind: 'checkin' }
          }]
        });
      }
    }

    // Loud step: fire once per check-in, right away
    if (loudDone(open) && loudFor !== open.id) {
      loudFor = open.id;
      hadAny = true;
      await LN.schedule({
        notifications: [{
          id: ID_LOUD,
          title: "Nura hasn't heard from you",
          body: "Tap to answer, or press I'm OK to cancel the alert.",
          actionTypeId: ACTION_TYPE,
          channelId: ALERT_CHANNEL,
          extra: { kind: 'loud' }
        }]
      });
    }
    // Answered or cancelled: clear the loud reminder from the tray
    if (!loudDone(open) && loudFor) {
      loudFor = '';
      await LN.cancel({ notifications: [{ id: ID_LOUD }] }).catch(() => {});
      await LN.removeDeliveredNotificationsById?.({ ids: [ID_LOUD] }).catch(() => {});
    }
  } catch { /* notifications are best effort */ }
}

export async function cancelAllNotifications() {
  scheduledKey = '';
  loudFor = '';
  hadAny = false;
  const LN = await plugin();
  if (!LN) return;
  try { await LN.cancel({ notifications: [{ id: ID_NEXT }, { id: ID_LOUD }] }); } catch { /* ignore */ }
}

export function disposeNotificationListener() {
  if (listenerHandle) {
    try { listenerHandle.remove(); } catch { /* ignore */ }
    listenerHandle = null;
    setupDone = null;
  }
}
