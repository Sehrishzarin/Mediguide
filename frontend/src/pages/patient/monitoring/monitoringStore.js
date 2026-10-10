// Nura Check-In store: the one place that polls GET /monitoring/current.
// PatientLayout starts polling while a patient is signed in; the banner, Home card and
// monitoring screens all read the same snapshot. Screens that show monitoring can ask
// for faster polling. Patient actions (answer, I'm OK, start, stop) update the snapshot
// from the server's reply, then notifications and location are kept in sync.
import { useEffect, useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  getCurrentMonitoring, answerCheckIn, cancelCheckInAlert, startMonitoring, stopMonitoring, updateMonitoringLocation
} from '../../../services/api';
import { getPosition } from '../../../components/geo';
import friendlyError from '../../../utils/friendlyError';
import { syncNotifications, cancelAllNotifications, onNotificationAction } from './notifications';
import { monitoringView, recheckUrl } from './format';

const POLL_DEMO_MS = 3000;
const POLL_REAL_MS = 60000;
const POLL_FAST_DEMO_MS = 2000;
const POLL_FAST_REAL_MS = 15000;
const LOCATION_EVERY_MS = 5 * 60000;

const EMPTY = Object.freeze({ userId: null, status: 'idle', data: null, demoSpeedAllowed: false, error: '', recent: null });

let state = EMPTY;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const set = (patch) => { state = { ...state, ...patch }; emit(); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

// ── Location (never blocks an action for long) ─────────────────────────────
const LOCATION_WAIT_MS = 2500;
let lastLocation = null;
let lastLocationAt = 0;
let lastLocationSent = 0;
const readLocation = () => getPosition()
  .then((p) => (p && !p.isDefault && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : null))
  .catch(() => null)
  .then((loc) => { if (loc) { lastLocation = loc; lastLocationAt = Date.now(); } return loc; });

export async function currentLocation() {
  if (lastLocation && Date.now() - lastLocationAt < 60000) return lastLocation;
  const timeout = new Promise((resolve) => { setTimeout(() => resolve(lastLocation), LOCATION_WAIT_MS); });
  return Promise.race([readLocation(), timeout]);
}

const maybeSendLocation = async () => {
  if (!state.data || Date.now() - lastLocationSent < LOCATION_EVERY_MS) return;
  lastLocationSent = Date.now();
  const loc = await readLocation();
  if (loc && state.data) updateMonitoringLocation(loc).catch(() => {});
};

// ── Polling ────────────────────────────────────────────────────────────────
let consumers = 0;
let fastConsumers = 0;
let timer = null;
let inflight = null;
let generation = 0; // bumps on sign-out so late replies are dropped

const pollDelay = () => {
  const demo = Boolean(state.data?.demoSpeed);
  if (fastConsumers > 0) return demo ? POLL_FAST_DEMO_MS : POLL_FAST_REAL_MS;
  return demo ? POLL_DEMO_MS : POLL_REAL_MS;
};

const schedule = () => {
  clearTimeout(timer);
  timer = null;
  if (consumers > 0) timer = setTimeout(() => { refreshMonitoring(); }, pollDelay());
};

const applyData = (data, demoSpeedAllowed) => {
  const prev = state.data;
  const patch = { status: 'ready', data, error: '' };
  if (demoSpeedAllowed !== undefined) patch.demoSpeedAllowed = demoSpeedAllowed;
  // A new check-in replaces the "what happens next" panel from the previous answer
  if (data?.openCheckIn && state.recent && data.openCheckIn.id !== state.recent.checkInId) patch.recent = null;
  if (!data) patch.recent = null;
  set(patch);
  syncNotifications(data);
  if (!prev && data) lastLocationSent = 0;
  maybeSendLocation();
};

export function refreshMonitoring() {
  if (!state.userId) return Promise.resolve(null);
  if (inflight) return inflight;
  const gen = generation;
  if (state.status === 'idle' || state.status === 'error') set({ status: state.data ? 'ready' : 'loading' });
  inflight = getCurrentMonitoring()
    .then((res) => {
      if (gen !== generation) return null;
      applyData(res.data || null, Boolean(res.demoSpeedAllowed));
      return res.data || null;
    })
    .catch((err) => {
      if (gen !== generation) return null;
      // Keep showing the last good snapshot; only surface the error if there is none
      set({ status: state.data ? 'ready' : 'error', error: friendlyError(err, "We couldn't load Nura Check-In. Please try again.") });
      return state.data;
    })
    .finally(() => {
      if (gen === generation) { inflight = null; schedule(); }
    });
  return inflight;
}

// ── Notification actions (I'm OK / Worse / Need help / tap) ────────────────
let navigateFn = null;
export function setMonitoringNavigator(fn) {
  navigateFn = fn;
  return () => { if (navigateFn === fn) navigateFn = null; };
}
const go = (to) => { if (navigateFn) navigateFn(to); };

async function handleNotificationAction(actionId) {
  const m = await refreshMonitoring();
  const open = m?.openCheckIn;
  try {
    if (actionId === 'ok' && open && !open.answered) {
      if (monitoringView(m) === 'escalation') await imOk();
      else await answer('same');
      go('/patient/monitoring');
    } else if (actionId === 'worse' && open && !open.answered) {
      await answer('worse');
      go(recheckUrl(m.reason));
    } else if (actionId === 'help' && open && !open.answered) {
      await answer('help');
      go('/patient/monitoring');
    } else {
      go('/patient/monitoring');
    }
  } catch {
    go('/patient/monitoring');
  }
}

// Starts polling for a signed-in patient; returns a stop function. Used once by PatientLayout.
export function startMonitoringPolling(userId) {
  if (state.userId !== userId) {
    generation += 1;
    inflight = null;
    state = { ...EMPTY, userId };
    emit();
  }
  consumers += 1;
  const onVisible = () => { if (document.visibilityState === 'visible') refreshMonitoring(); };
  document.addEventListener('visibilitychange', onVisible);
  let resumeHandle = null;
  let removed = false;
  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('resume', () => refreshMonitoring())
      .then((h) => { if (removed) h.remove(); else resumeHandle = h; })
      .catch(() => {});
  }
  const offAction = onNotificationAction(handleNotificationAction);
  refreshMonitoring();
  return () => {
    removed = true;
    consumers -= 1;
    document.removeEventListener('visibilitychange', onVisible);
    if (resumeHandle) resumeHandle.remove();
    offAction();
    if (consumers <= 0) { clearTimeout(timer); timer = null; }
  };
}

export function useMonitoring(userId) {
  const snap = useSyncExternalStore(subscribe, () => state);
  return snap.userId === userId ? snap : EMPTY;
}

// Faster polling while a monitoring screen is open
export function useFastMonitoringPoll(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    fastConsumers += 1;
    refreshMonitoring();
    return () => { fastConsumers -= 1; schedule(); };
  }, [enabled]);
}

// ── Patient actions ────────────────────────────────────────────────────────
export async function answer(value) {
  const open = state.data?.openCheckIn;
  if (!open) throw new Error('There is no check-in to answer right now.');
  const location = await currentLocation();
  const res = await answerCheckIn(open.id, value, location || undefined);
  set({ recent: { answer: value, checkInId: open.id, at: new Date().toISOString(), alertedNames: (state.data.contacts || []).filter((c) => c.consent === 'agreed').map((c) => c.name) } });
  applyData(res.data || null);
  return res.data;
}

export async function imOk() {
  const open = state.data?.openCheckIn;
  const names = (state.data?.contacts || []).filter((c) => c.consent === 'agreed').map((c) => c.name);
  const location = await currentLocation();
  const res = await cancelCheckInAlert(location || undefined);
  set({ recent: { answer: 'ok', checkInId: open?.id || '', at: new Date().toISOString(), alertWasSent: Boolean(open?.alertSent), alertedNames: names } });
  applyData(res.data || null);
  return res.data;
}

export async function start(payload) {
  const location = await currentLocation();
  const res = await startMonitoring(location ? { ...payload, location } : payload);
  lastLocationSent = Date.now();
  set({ recent: null });
  applyData(res.data || null);
  return res.data;
}

export async function stop() {
  await stopMonitoring();
  applyData(null);
  cancelAllNotifications();
}

export const dismissRecent = () => set({ recent: null });
