// Shared journal state: the cycle settings/summary (GET /cycle) and today's snapshot
// (GET /journal/today). Every screen that shows them reads the same cache, so turning
// cycle tracking on in Profile or saving a day updates the hub, Home and the editor.
// Each mount revalidates in the background (care plans can pause cycle tracking).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getCycle, getJournalToday, saveJournalEntry, deleteJournalEntry, updateCycleSettings } from '../../../services/api';
import friendlyError from '../../../utils/friendlyError';

function createResource(fetcher, fallbackError) {
  let state = { key: null, status: 'idle', data: null, error: '' };
  let inflight = null;
  let generation = 0;
  const listeners = new Set();
  const emit = () => listeners.forEach((l) => l());
  const set = (patch) => { state = { ...state, ...patch }; emit(); };

  const load = (key) => {
    if (inflight && inflight.key === key) return inflight.promise;
    const gen = ++generation;
    if (state.key !== key) set({ key, status: 'loading', data: null, error: '' });
    else if (state.status === 'error') set({ status: 'loading', error: '' });
    const promise = fetcher()
      .then((res) => {
        if (gen === generation) set({ key, status: 'ready', data: res.data, error: '' });
        return res.data;
      })
      .catch((err) => {
        // Keep showing cached data if a background refresh fails
        if (gen === generation && state.status !== 'ready') set({ status: 'error', error: friendlyError(err, fallbackError) });
        return null;
      })
      .finally(() => { if (inflight && inflight.promise === promise) inflight = null; });
    inflight = { key, promise };
    return promise;
  };

  const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
  const getSnapshot = () => state;

  function useResource(key) {
    const snap = useSyncExternalStore(subscribe, getSnapshot);
    useEffect(() => { if (key) load(key); }, [key]);
    const retry = useCallback(() => { if (key) load(key); }, [key]);
    const own = snap.key === key;
    return {
      status: own ? (snap.status === 'idle' ? 'loading' : snap.status) : 'loading',
      data: own ? snap.data : null,
      error: own ? snap.error : '',
      retry
    };
  }

  return {
    use: useResource,
    refresh: () => (state.key ? load(state.key) : Promise.resolve(null)),
    patch: (fn) => { if (state.data) set({ data: fn(state.data) }); },
    reset: () => { generation += 1; inflight = null; state = { key: null, status: 'idle', data: null, error: '' }; emit(); }
  };
}

export const cycleResource = createResource(getCycle, "We couldn't load your cycle.");
export const todayResource = createResource(getJournalToday, "We couldn't load today's journal.");

// Cycle defaults depend on gender, so a gender change refetches
const cycleKey = (user) => (user?.id ? `${user.id}:${user.medicalProfile?.gender || ''}` : null);

export const useCycle = (user) => cycleResource.use(cycleKey(user));
export const useJournalToday = (user) => todayResource.use(user?.id || null);

// Cycle UI is shown only when tracking is enabled; paused = active pregnancy plan
export function cycleFlags(cycle) {
  const d = cycle.data;
  return {
    known: cycle.status === 'ready' && Boolean(d),
    enabled: Boolean(d?.enabled),
    paused: Boolean(d?.paused),
    active: Boolean(d?.enabled && !d?.paused)
  };
}

// ── Writes (keep the caches fresh) ─────────────────────────────────────────
export async function saveEntry(date, body) {
  const res = await saveJournalEntry(date, body);
  todayResource.refresh();
  cycleResource.refresh();
  return res.data;
}

// After several raw saves (e.g. marking a whole period), refresh the shared caches once
export const refreshJournal = () => Promise.all([todayResource.refresh(), cycleResource.refresh()]);

export async function removeEntry(date) {
  await deleteJournalEntry(date);
  todayResource.refresh();
  cycleResource.refresh();
}

export async function setCycleSettings(payload) {
  const res = await updateCycleSettings(payload);
  await Promise.all([cycleResource.refresh(), todayResource.refresh()]);
  return res.data;
}

// ── One-off loads with loading / error / retry, keyed so a key change shows loading ──
export function useLoad(key, loader, fallbackError = 'Something went wrong. Please try again.') {
  const [res, setRes] = useState({ key: null, data: null, error: '' });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });
  const fullKey = key ? `${key}#${nonce}` : null;

  useEffect(() => {
    if (!fullKey) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => { if (!cancelled) setRes({ key: fullKey, data, error: '' }); })
      .catch((err) => { if (!cancelled) setRes({ key: fullKey, data: null, error: friendlyError(err, fallbackError) }); });
    return () => { cancelled = true; };
  }, [fullKey, fallbackError]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  let status = 'loading';
  if (res.key === fullKey) status = res.error ? 'error' : 'ready';
  return { status, data: res.key === fullKey ? res.data : null, error: res.key === fullKey ? res.error : '', retry };
}
