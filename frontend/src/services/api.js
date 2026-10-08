// ============================================================
// MediGuide API client — one place for every network call.
// No mock data and no silent fallbacks: failures surface to the UI.
// ============================================================

const TOKEN_KEY = 'token';

// VITE_API_BASE_URL may be given with or without the trailing /api
const normalizeBase = (url) => {
  const trimmed = url.replace(/\/+$/, '');
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const getApiBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (fromEnv) return normalizeBase(fromEnv);
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

export const API_BASE_URL = getApiBaseUrl();

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
};

// Free hosting tiers sleep when idle, so the first request can take a while
const REQUEST_TIMEOUT_MS = 45000;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, form, auth = true, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal
    });
  } catch (err) {
    throw new ApiError(
      err.name === 'AbortError'
        ? 'The server is taking too long to respond. Please try again.'
        : 'Cannot reach the server. Check your internet connection and try again.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (raw && response.ok) return response;

  let data = null;
  try { data = await response.json(); } catch { /* non-JSON body */ }

  if (!response.ok || (data && data.success === false)) {
    if (response.status === 401 && auth && token) {
      // Token expired or account removed: let the app sign the user out
      window.dispatchEvent(new Event('mediguide:unauthorized'));
    }
    throw new ApiError((data && data.message) || `Request failed (${response.status}).`, response.status);
  }
  return data;
}

// ---------- Health (used to wake a sleeping server early) ----------
export const warmUpServer = () => request('/health', { auth: false }).catch(() => null);

// ---------- Auth & account ----------
export const loginUser = (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
export const registerUser = (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false });
export const getCurrentUser = () => request('/auth/me');
export const updateUserProfile = (payload) => request('/auth/profile', { method: 'PUT', body: payload });
export const changePassword = (currentPassword, newPassword) =>
  request('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } });
export const deleteAccount = (password) => request('/auth/me', { method: 'DELETE', body: { password } });

// ---------- Facilities ----------
export const fetchNearbyOrganizations = (lat, lng, limit = 20) =>
  request(`/organizations/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&limit=${limit}`, { auth: false });
export const addOrganizationReview = (orgId, rating, comment) =>
  request(`/organizations/${orgId}/reviews`, { method: 'POST', body: { rating, comment } });

// ---------- Organisation owners ----------
export const getMyOrganizations = () => request('/organizations/mine');
export const createOrganization = (payload) => request('/organizations', { method: 'POST', body: payload });
export const addStaffMember = (orgId, payload) => request(`/organizations/${orgId}/staff`, { method: 'POST', body: payload });
export const removeStaffMember = (orgId, staffId) => request(`/organizations/${orgId}/staff/${staffId}`, { method: 'DELETE' });

// ---------- Admin ----------
export const getPendingOrganizations = () => request('/organizations/admin/pending');
export const reviewOrganization = (orgId, status) => request(`/organizations/${orgId}/status`, { method: 'PUT', body: { status } });

// ---------- Doctor sessions & appointments ----------
export const getAvailableSlots = ({ specialty = '', search = '' } = {}) => {
  const params = new URLSearchParams();
  if (specialty) params.set('specialty', specialty);
  if (search) params.set('search', search);
  return request(`/slots?${params.toString()}`);
};
export const bookSlot = (slotId) => request(`/slots/${slotId}/book`, { method: 'POST' });
export const getMyAppointments = () => request('/slots/mine');
export const cancelAppointment = (slotId) => request(`/slots/${slotId}/book`, { method: 'DELETE' });

// ---------- Files (test reports, organisation documents) ----------
export const listFiles = (kind = 'report') => request(`/files?kind=${kind}`);
export const uploadFile = (file, { kind = 'report', organizationId } = {}) => {
  const form = new FormData();
  form.append('kind', kind);
  if (organizationId) form.append('organizationId', organizationId);
  form.append('file', file);
  return request('/files', { method: 'POST', form });
};
export const deleteFile = (id) => request(`/files/${id}`, { method: 'DELETE' });
// Opens a stored file in a new tab (auth header means we cannot link to it directly)
export const openFile = async (id) => {
  const response = await request(`/files/${id}/download`, { raw: true });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ---------- AI triage ----------
export const submitTriageSymptom = async (symptomText, chatHistory = []) => {
  const res = await request('/ai/triage', { method: 'POST', body: { symptomText, chatHistory } });
  return res.data;
};
