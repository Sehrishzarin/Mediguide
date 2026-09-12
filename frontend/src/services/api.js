// ============================================================
// API Base URL — reads from env or falls back to /api or localhost:5000
// ============================================================

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();
export { API_BASE_URL };

// Helper function to safely fetch JSON and avoid unexpected HTML parsing errors
const safeJsonFetch = async (url, options = {}) => {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
  }
  return await response.json();
};

// ============================================================
// Health Check
// ============================================================

export const checkHealth = async () => {
  try {
    return await safeJsonFetch(`${API_BASE_URL}/health`);
  } catch (error) {
    console.error('Error reaching backend server:', error);
    throw error;
  }
};

// ============================================================
// Auth API Calls (real backend)
// ============================================================

export const loginUser = async (email, password) => {
  return await safeJsonFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
};

export const registerUser = async (userData) => {
  return await safeJsonFetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
};

export const getCurrentUserProfile = async (token) => {
  return await safeJsonFetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
};

export const updateUserProfile = async (token, profileData) => {
  return await safeJsonFetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
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
  email: 'user@mediguide.com',
  phone: '+1-555-0100',
  dob: '1995-04-15',
  dateOfBirth: '1995-04-15',
  bloodType: 'O+',
  bloodGroup: 'O+',
  gender: 'Female',
  pregnancyStatus: 'Not Pregnant',
  address: '789 Elm St, Capital City',
  allergies: ['Penicillin'],
  preExistingConditions: ['Asthma'],
  pastConditions: ['Asthma'],
  ongoingMedications: ['Metformin 500mg', 'Vitamin D3'],
  medications: ['Metformin 500mg', 'Vitamin D3'],
  emergencyContact: {
    name: 'Sarah Smith',
    relationship: 'Sister',
    phone: '+1 555-0199'
  },
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
    if (err.message && !err.message.includes('non-JSON') && err.message !== 'Failed to fetch') throw err;
    // Backend unreachable, using fallback signup
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
    if (err.message && !err.message.includes('non-JSON') && err.message !== 'Failed to fetch') throw err;
    // Backend unreachable, using fallback login
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
    // AI Triage API network error, using local fallback
  }

  const lower = text.toLowerCase();

  // Emergency / cardiac / respiratory (including concatenated words like 'heartattack')
  if (
    lower.includes('chest pain') || lower.includes('chest') ||
    lower.includes('breath') || lower.includes('heart') || lower.includes('heartattack') ||
    lower.includes('palpitation') || lower.includes('cardiac') || lower.includes('stroke') ||
    lower.includes('seizure') || lower.includes('unconscious') || lower.includes('faint') ||
    lower.includes('bleeding') || lower.includes('dying') || lower.includes('die')
  ) {
    return {
      is_non_medical: false,
      category: 'Acute Emergency Medical Alert',
      specialty: 'Emergency Department',
      urgency_level: 'high',
      hospital_recommendation: 'HOSPITAL VISIT STRONGLY URGED (Emergency Care Required)',
      show_map: true,
      profile_impact_summary: 'Emergency symptom alert.',
      conversational_response: `🚨 **EMERGENCY WARNING: Immediate Hospital Care Required**\n\nSymptoms such as cardiac chest tightness, heart attack signs, or severe breathlessness require immediate emergency evaluation. Please call emergency services (1122) or go to the nearest Emergency Room without delay.\n\nSit upright, avoid physical exertion, and remain calm while help arrives.`,
      trigger_question: 'Do you require immediate emergency ambulance dispatch?',
      precautionary_advice: 'Call emergency services (1122) or proceed immediately to the nearest Emergency Room.',
      emergency_flag: true
    };
  }

  // Skin conditions
  if (
    lower.includes('rash') || lower.includes('skin') ||
    lower.includes('itch') || lower.includes('acne') ||
    lower.includes('mole') || lower.includes('eczema')
  ) {
    return {
      is_non_medical: false,
      category: 'Skin condition',
      specialty: 'Dermatologist',
      urgency_level: 'low',
      hospital_recommendation: 'NO HOSPITAL VISIT NEEDED (Safe for Home Care)',
      show_map: false,
      profile_impact_summary: 'Dermatology consultation context.',
      conversational_response: `😊 **No Hospital Visit Needed**\n\nBased on your description, this skin symptom can be safely evaluated at home or via a routine dermatologist visit. You do not need an emergency hospital trip.`,
      trigger_question: 'How long has this rash or skin condition been present?',
      precautionary_advice: 'Keep the area clean, cool, and avoid scratching.',
      emergency_flag: false
    };
  }

  // Fever / cold / flu
  if (
    lower.includes('fever') || lower.includes('cold') ||
    lower.includes('cough') || lower.includes('flu') ||
    lower.includes('sore throat') || lower.includes('runny nose')
  ) {
    return {
      is_non_medical: false,
      category: 'Common viral infection',
      specialty: 'General Physician',
      urgency_level: 'low',
      hospital_recommendation: 'NO HOSPITAL VISIT NEEDED (Safe for Home Care)',
      show_map: false,
      profile_impact_summary: 'Routine viral illness.',
      conversational_response: `😊 **No Hospital Visit Needed**\n\nYour symptoms resemble a routine viral illness. Resting and staying hydrated at home is safe. If your fever exceeds 103°F or you develop severe breathing difficulty, seek medical care.`,
      trigger_question: 'When did your fever or cough begin?',
      precautionary_advice: 'Rest adequately and stay hydrated with fluids.',
      emergency_flag: false
    };
  }

  // Default mild guidance
  return {
    is_non_medical: false,
    category: 'General Health Symptom',
    specialty: 'General Physician',
    urgency_level: 'low',
    hospital_recommendation: 'NO HOSPITAL VISIT NEEDED (Safe for Home Care)',
    show_map: false,
    profile_impact_summary: 'General health evaluation.',
    conversational_response: `🩺 **No Hospital Visit Needed**\n\nThere is no immediate indication for an emergency hospital trip. Rest at home and monitor how your body feels.`,
    trigger_question: 'Could you describe how many days you have experienced this?',
    precautionary_advice: 'Rest well and monitor for warning signs.',
    emergency_flag: false
  };
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
  let storedUser = null;
  try {
    const raw = localStorage.getItem('mediguide_patient') || localStorage.getItem('mediguide_user');
    if (raw) storedUser = JSON.parse(raw);
  } catch {}

  const activeProfile = storedUser ? { ...mockProfile, ...storedUser, ...(storedUser.medicalProfile || {}) } : mockProfile;
  return {
    profile: { ...activeProfile },
    reports: mockReports.map((r) => ({ ...r })),
  };
};

export const updateProfile = async (data) => {
  await delay();
  mockProfile = { ...mockProfile, ...data, ...(data.medicalProfile || {}) };
  try {
    const raw = localStorage.getItem('mediguide_patient') || localStorage.getItem('mediguide_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      const updated = {
        ...parsed,
        ...data,
        medicalProfile: {
          ...(parsed.medicalProfile || {}),
          ...(data.medicalProfile || {})
        }
      };
      localStorage.setItem('mediguide_patient', JSON.stringify(updated));
      localStorage.setItem('mediguide_user', JSON.stringify(updated));
    }
  } catch {}
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

export const deleteTestReport = async (reportId) => {
  await delay();
  const idx = mockReports.findIndex((r) => r.id === reportId);
  if (idx === -1) throw new Error('Report not found');
  mockReports.splice(idx, 1);
  return { success: true };
};

export const renameTestReport = async (reportId, newFile) => {
  await delay();
  const report = mockReports.find((r) => r.id === reportId);
  if (!report) throw new Error('Report not found');
  report.filename = newFile.name || 'report.pdf';
  report.uploadedAt = new Date().toISOString();
  return { report: { ...report } };
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
