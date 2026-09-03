// ============================================================
// API Base URL — reads from env or falls back to localhost
// ============================================================

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();

// ============================================================
// Health Check
// ============================================================

export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('Error reaching backend server:', error);
    throw error;
  }
};

// ============================================================
// Auth API Calls (real backend)
// ============================================================

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await response.json();
};

export const registerUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return await response.json();
};

export const getCurrentUserProfile = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

export const updateUserProfile = async (token, profileData) => {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
  return await response.json();
};

// ============================================================
// Organization & Map API Calls (real backend)
// ============================================================

export const fetchOrganizations = async (type = '', search = '') => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE_URL}/organizations?${params.toString()}`);
  return await response.json();
};

export const fetchNearbyOrganizations = async (lat, lng, distance = 10) => {
  const response = await fetch(`${API_BASE_URL}/organizations/nearby?lat=${lat}&lng=${lng}&distance=${distance}`);
  return await response.json();
};

// ============================================================
// Mock Data — used by patient pages (frontend-only)
// ============================================================

let mockUsers = [
  { id: 'u1', email: 'patient@example.com', password: 'pass123', role: 'patient', name: 'Jane Patient' },
  { id: 'u2', email: 'admin@example.com', password: 'admin123', role: 'admin', name: 'Admin User' },
  { id: 'u3', email: 'doctor@example.com', password: 'doc123', role: 'doctor', name: 'Dr. Smith' },
];

let mockOrganizations = [
  {
    id: 'org1',
    name: 'City General Hospital',
    address: '123 Main St, Springfield',
    type: 'hospital',
    status: 'pending',
    submittedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'org2',
    name: 'Sunrise Clinic',
    address: '456 Oak Ave, Shelbyville',
    type: 'clinic',
    status: 'pending',
    submittedAt: '2026-08-25T14:30:00Z',
  },
];

let mockDocuments = [
  { id: 'doc1', orgId: 'org1', filename: 'license.pdf', uploadedAt: '2026-08-20T10:05:00Z' },
];

let mockStaff = [
  { id: 's1', orgId: 'org1', name: 'Nurse Joy', role: 'nurse', email: 'joy@citygeneral.com' },
];

let mockSlots = [
  { id: 'slot1', specialty: 'cardiology', doctor: 'Dr. Heart', org: 'City General Hospital', date: '2026-09-05', time: '09:00', available: true },
  { id: 'slot2', specialty: 'dermatology', doctor: 'Dr. Skin', org: 'Sunrise Clinic', date: '2026-09-05', time: '10:30', available: true },
  { id: 'slot3', specialty: 'cardiology', doctor: 'Dr. Heart', org: 'City General Hospital', date: '2026-09-06', time: '14:00', available: true },
  { id: 'slot4', specialty: 'orthopedics', doctor: 'Dr. Bones', org: 'City General Hospital', date: '2026-09-07', time: '11:00', available: false },
  { id: 'slot5', specialty: 'general', doctor: 'Dr. Patel', org: 'MediCare Family Clinic', date: '2026-09-03', time: '08:30', available: true },
  { id: 'slot6', specialty: 'general', doctor: 'Dr. Lee', org: 'Sunrise Clinic', date: '2026-09-04', time: '15:00', available: true },
  { id: 'slot7', specialty: 'gastroenterology', doctor: 'Dr. Rivera', org: 'City General Hospital', date: '2026-09-05', time: '13:00', available: true },
  { id: 'slot8', specialty: 'dermatology', doctor: 'Dr. Kim', org: 'MediCare Family Clinic', date: '2026-09-06', time: '09:30', available: true },
];

let mockBookings = [];

let mockProfile = {
  id: 'u1',
  name: 'Jane Patient',
  email: 'patient@example.com',
  phone: '+1-555-0100',
  dob: '1990-04-15',
  bloodType: 'O+',
  address: '789 Elm St, Capital City',
  ongoingMedications: ['Metformin 500mg', 'Vitamin D3'],
  pastConditions: ['Appendicitis (2019)', 'Chickenpox (childhood)'],
  overallNotes: 'Mild lactose intolerance. Prefers morning appointments.',
};

let mockReports = [
  { id: 'r1', filename: 'blood_test_jan.pdf', uploadedAt: '2026-01-10T09:00:00Z', summary: 'Normal CBC results' },
];

// ============================================================
// Mock Helpers
// ============================================================

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

let nextId = 100;
const genId = (prefix = 'id') => `${prefix}${nextId++}`;

// ============================================================
// Mock API Functions (used by patient pages)
// ============================================================

export const signup = async (email, password, role = 'user', name = '') => {
  try {
    const res = await registerUser({ name: name || email.split('@')[0], email, password, role });
    if (res.success && res.token) {
      localStorage.setItem('token', res.token);
      return { user: res.user, token: res.token };
    }
    if (res.message) throw new Error(res.message);
  } catch (err) {
    if (err.message && err.message !== 'Failed to fetch') throw err;
    console.warn('Backend server unreachable, using fallback signup', err);
  }

  await delay();
  const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) throw new Error('Email already registered');
  const user = { id: genId('u'), email, password, role, name: name || email.split('@')[0] };
  mockUsers.push(user);
  const token = `mock-jwt-token-${Date.now()}`;
  localStorage.setItem('token', token);
  return { user: { ...user, password: undefined }, token };
};

export const login = async (email, password, expectedRole = '') => {
  try {
    const res = await loginUser(email, password);
    if (res.success && res.token) {
      localStorage.setItem('token', res.token);
      return { user: res.user, token: res.token };
    }
    if (res.message) throw new Error(res.message);
  } catch (err) {
    if (err.message && err.message !== 'Failed to fetch') throw err;
    console.warn('Backend server unreachable, using fallback login', err);
  }

  await delay();
  let user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const detectedRole = expectedRole || (email.includes('admin') ? 'admin' : email.includes('org') || email.includes('hospital') || email.includes('clinic') ? 'organization' : 'user');
    user = {
      id: genId('u'),
      name: email.split('@')[0],
      email: email,
      role: detectedRole
    };
    mockUsers.push(user);
  }
  const token = `mock-jwt-token-${Date.now()}`;
  localStorage.setItem('token', token);
  return { user: { ...user, password: undefined }, token };
};

export const createOrganization = async (data) => {
  await delay();
  const organization = {
    id: genId('org'),
    ...data,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  mockOrganizations.push(organization);
  return { organization };
};

export const uploadOrgDocument = async (orgId, file) => {
  await delay();
  const document = {
    id: genId('doc'),
    orgId,
    filename: file.name || 'document.pdf',
    uploadedAt: new Date().toISOString(),
  };
  mockDocuments.push(document);
  return { document };
};

export const addStaff = async (orgId, staffData) => {
  await delay();
  const staff = { id: genId('s'), orgId, ...staffData };
  mockStaff.push(staff);
  return { staff };
};

export const getPendingOrganizations = async () => {
  await delay();
  const organizations = mockOrganizations
    .filter((o) => o.status === 'pending')
    .map((org) => ({
      ...org,
      documents: mockDocuments.filter((d) => d.orgId === org.id),
    }));
  return { organizations };
};

export const approveOrganization = async (orgId) => {
  await delay();
  const org = mockOrganizations.find((o) => o.id === orgId);
  if (!org) throw new Error('Organization not found');
  org.status = 'approved';
  return { success: true };
};

export const rejectOrganization = async (orgId) => {
  await delay();
  const org = mockOrganizations.find((o) => o.id === orgId);
  if (!org) throw new Error('Organization not found');
  org.status = 'rejected';
  return { success: true };
};

export const submitTriageSymptom = async (text, patientProfile = null, chatHistory = []) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomText: text, patientProfile, chatHistory })
    });
    const resData = await response.json();
    if (resData.success && resData.data) {
      return resData.data;
    }
  } catch (err) {
    console.warn('AI Triage API network error, utilizing local evaluator', err);
  }

  const lower = text.toLowerCase();

  // Emergency / cardiac / respiratory
  if (
    lower.includes('chest pain') || lower.includes('chest') ||
    lower.includes('breath') || lower.includes('heart') ||
    lower.includes('palpitation') || lower.includes('cardiac')
  ) {
    return { category: 'Possible cardiac issue', specialty: 'Emergency', urgency_level: 'high' };
  }

  // Neurological emergency
  if (
    lower.includes('stroke') || lower.includes('seizure') ||
    lower.includes('unconscious') || lower.includes('faint')
  ) {
    return { category: 'Possible neurological emergency', specialty: 'Emergency', urgency_level: 'high' };
  }

  // Severe trauma / bleeding
  if (
    lower.includes('bleeding') || lower.includes('fracture') ||
    lower.includes('accident') || lower.includes('burn')
  ) {
    return { category: 'Possible trauma or injury', specialty: 'Emergency', urgency_level: 'high' };
  }

  // Skin conditions
  if (
    lower.includes('rash') || lower.includes('skin') ||
    lower.includes('itch') || lower.includes('acne') ||
    lower.includes('mole') || lower.includes('eczema')
  ) {
    return { category: 'Skin condition', specialty: 'Dermatologist', urgency_level: 'low' };
  }

  // Fever / cold / flu
  if (
    lower.includes('fever') || lower.includes('cold') ||
    lower.includes('cough') || lower.includes('flu') ||
    lower.includes('sore throat') || lower.includes('runny nose')
  ) {
    return { category: 'Common viral infection', specialty: 'General Physician', urgency_level: 'low' };
  }

  // Stomach / digestive
  if (
    lower.includes('stomach') || lower.includes('nausea') ||
    lower.includes('vomit') || lower.includes('diarrhea') ||
    lower.includes('constipation') || lower.includes('bloating')
  ) {
    return { category: 'Digestive issue', specialty: 'Gastroenterologist', urgency_level: 'medium' };
  }

  // Headache
  if (lower.includes('headache') || lower.includes('migraine')) {
    return { category: 'Headache or migraine', specialty: 'General Physician', urgency_level: 'medium' };
  }

  // Bone / joint
  if (
    lower.includes('bone') || lower.includes('joint') ||
    lower.includes('back pain') || lower.includes('knee') ||
    lower.includes('sprain')
  ) {
    return { category: 'Musculoskeletal issue', specialty: 'Orthopedist', urgency_level: 'medium' };
  }

  // Default
  return { category: 'General symptoms', specialty: 'General Physician', urgency_level: 'medium' };
};

export const getAvailableSlots = async (specialtyFilter) => {
  await delay();
  let slots = mockSlots.filter((s) => s.available);
  if (specialtyFilter) {
    slots = slots.filter((s) => s.specialty === specialtyFilter);
  }
  return { slots };
};

export const confirmBooking = async (slotId) => {
  await delay();
  const slot = mockSlots.find((s) => s.id === slotId);
  if (!slot) throw new Error('Slot not found');
  if (!slot.available) throw new Error('Slot is no longer available');
  slot.available = false;
  const booking = {
    id: genId('b'),
    slotId,
    doctor: slot.doctor,
    specialty: slot.specialty,
    date: slot.date,
    time: slot.time,
    confirmedAt: new Date().toISOString(),
  };
  mockBookings.push(booking);
  return { booking };
};

export const getProfile = async () => {
  await delay();
  return {
    profile: { ...mockProfile },
    reports: mockReports.map((r) => ({ ...r })),
  };
};

export const updateProfile = async (data) => {
  await delay();
  mockProfile = { ...mockProfile, ...data };
  return { profile: { ...mockProfile } };
};

export const uploadTestReport = async (file) => {
  await delay();
  const report = {
    id: genId('r'),
    filename: file.name || 'report.pdf',
    uploadedAt: new Date().toISOString(),
    summary: 'Pending analysis',
  };
  mockReports.push(report);
  return { report };
};

let mockEmergencyContact = null;

export const requestAmbulance = async () => {
  await delay();
  const eta = Math.floor(Math.random() * 15) + 5;
  return { eta };
};

export const getEmergencyContact = async () => {
  await delay();
  return {
    contact: mockEmergencyContact
      ? { ...mockEmergencyContact }
      : null,
    hotline: {
      number: '1-800-MEDIGUIDE',
      email: 'emergency@mediguide.health',
      hours: '24/7',
    },
  };
};

export const updateEmergencyContact = async (number) => {
  await delay();
  mockEmergencyContact = { number, savedAt: new Date().toISOString() };
  return { contact: { ...mockEmergencyContact } };
};
