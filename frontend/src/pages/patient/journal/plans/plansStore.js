// Care plans store: one module-level cache of GET /api/plans (and the templates),
// shared by the Plans tab, the Home card and the plan screens so they don't double-fetch.
// Mutations update the cache from the server's reply, then milestone reminders are resynced.
import { useEffect, useSyncExternalStore } from 'react';
import {
  getPlans, getPlanTemplates, createPlan as apiCreate, updatePlanMilestone, addPlanMilestone,
  deletePlanMilestone, endPlan as apiEnd
} from '../../../../services/api';
import friendlyError from '../../../../utils/friendlyError';
import { syncPlanReminders } from './reminders';

const STALE_MS = 60000;

const EMPTY = Object.freeze({ userId: null, status: 'idle', plans: [], error: '', loadedAt: 0 });
let state = EMPTY;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const set = (patch) => { state = { ...state, ...patch }; emit(); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;

let inflight = null;
let generation = 0;

const sortPlans = (plans) => {
  const rank = { active: 0, completed: 1, stopped: 1 };
  return [...plans].sort((a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2) || String(b.createdAt).localeCompare(String(a.createdAt)));
};

const applyPlans = (plans) => {
  set({ status: 'ready', plans: sortPlans(plans), error: '', loadedAt: Date.now() });
  syncPlanReminders(state.plans);
};

const resetFor = (userId) => {
  if (state.userId === userId) return;
  generation += 1;
  inflight = null;
  state = { ...EMPTY, userId };
  emit();
};

export function loadPlans(userId, { force = false } = {}) {
  if (!userId) return Promise.resolve([]);
  resetFor(userId);
  if (inflight) return inflight;
  if (!force && state.status === 'ready' && Date.now() - state.loadedAt < STALE_MS) return Promise.resolve(state.plans);
  const gen = generation;
  if (state.status !== 'ready') set({ status: 'loading', error: '' });
  inflight = getPlans()
    .then((res) => {
      if (gen !== generation) return [];
      applyPlans(Array.isArray(res.data) ? res.data : []);
      return state.plans;
    })
    .catch((err) => {
      if (gen !== generation) return [];
      // Keep the last good list if there is one
      set({ status: state.loadedAt ? 'ready' : 'error', error: friendlyError(err, "We couldn't load your care plans. Please try again.") });
      return state.plans;
    })
    .finally(() => { if (gen === generation) inflight = null; });
  return inflight;
}

// Subscribe to the plans of a signed-in user; fetches once on mount (cached for a minute).
export function usePlans(userId, { force = false } = {}) {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    if (userId) loadPlans(userId, { force });
  }, [userId, force]);
  return snap.userId === userId ? snap : EMPTY;
}

// ── Templates (static content; fetched once per session) ───────────────────
let templatesState = { status: 'idle', data: [], error: '' };
const tplListeners = new Set();
const tplSubscribe = (l) => { tplListeners.add(l); return () => tplListeners.delete(l); };
const tplSnapshot = () => templatesState;
let tplInflight = null;

export function loadTemplates() {
  if (templatesState.status === 'ready') return Promise.resolve(templatesState.data);
  if (tplInflight) return tplInflight;
  templatesState = { ...templatesState, status: 'loading', error: '' };
  tplListeners.forEach((l) => l());
  tplInflight = getPlanTemplates()
    .then((res) => {
      templatesState = { status: 'ready', data: Array.isArray(res.data) ? res.data : [], error: '' };
      return templatesState.data;
    })
    .catch((err) => {
      templatesState = { status: 'error', data: [], error: friendlyError(err, "We couldn't load the plan types. Please try again.") };
      return [];
    })
    .finally(() => { tplInflight = null; tplListeners.forEach((l) => l()); });
  return tplInflight;
}

export function useTemplates() {
  const snap = useSyncExternalStore(tplSubscribe, tplSnapshot);
  useEffect(() => { loadTemplates(); }, []);
  return snap;
}

// ── Mutations (each returns the saved plan) ────────────────────────────────
const upsert = (plan) => {
  if (!plan) return plan;
  const others = state.plans.filter((p) => p.id !== plan.id);
  applyPlans([plan, ...others]);
  return plan;
};

export const createPlan = async (payload) => upsert((await apiCreate(payload)).data);
export const setMilestone = async (planId, milestoneId, patch) => upsert((await updatePlanMilestone(planId, milestoneId, patch)).data);
export const addMilestone = async (planId, payload) => upsert((await addPlanMilestone(planId, payload)).data);
export const removeMilestone = async (planId, milestoneId) => upsert((await deletePlanMilestone(planId, milestoneId)).data);
export const finishPlan = async (planId, status) => upsert((await apiEnd(planId, status)).data);
