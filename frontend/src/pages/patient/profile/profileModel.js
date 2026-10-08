// Shared form model for onboarding and the profile page.
// The draft keeps numbers as strings (so inputs stay editable) and flattens the emergency contact.

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];
export const PREGNANCY_OPTIONS = ['N/A', 'Not pregnant', 'Pregnant', 'Trying to conceive', 'Postpartum / breastfeeding'];

export const LIMITS = { name: 80, item: 80, notes: 1000, address: 200, dosage: 40, frequency: 40, relationship: 40, treatmentNotes: 300 };

export const REPORT_MAX_BYTES = 2 * 1024 * 1024;
export const REPORT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

const asList = (v) => (Array.isArray(v) ? v : []);

export function draftFromUser(user) {
  const mp = user?.medicalProfile || {};
  const ec = mp.emergencyContact || {};
  return {
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: mp.dateOfBirth || '',
    bloodGroup: mp.bloodGroup || '',
    gender: mp.gender || '',
    pregnancyStatus: mp.pregnancyStatus || 'N/A',
    height: mp.height ? String(mp.height) : '',
    weight: mp.weight ? String(mp.weight) : '',
    allergies: [...asList(mp.allergies)],
    preExistingConditions: [...asList(mp.preExistingConditions)],
    currentMedications: asList(mp.currentMedications).map((m) => ({ name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '' })),
    longTermTreatments: asList(mp.longTermTreatments).map((t) => ({ treatmentName: t.treatmentName || '', notes: t.notes || '', isOngoing: t.isOngoing !== false })),
    notes: mp.notes || '',
    ecName: ec.name || '',
    ecRelationship: ec.relationship || '',
    ecPhone: ec.phone || ''
  };
}

const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

// Only profile fields; includeName is false for onboarding (the name is set at signup)
export function payloadFromDraft(d, { includeName = true } = {}) {
  const payload = {
    phone: d.phone.trim(),
    address: d.address.trim(),
    medicalProfile: {
      dateOfBirth: d.dateOfBirth,
      bloodGroup: d.bloodGroup,
      gender: d.gender,
      pregnancyStatus: d.gender === 'Female' ? d.pregnancyStatus || 'N/A' : 'N/A',
      height: num(d.height),
      weight: num(d.weight),
      allergies: d.allergies,
      preExistingConditions: d.preExistingConditions,
      currentMedications: d.currentMedications
        .map((m) => ({ name: m.name.trim(), dosage: m.dosage.trim(), frequency: m.frequency.trim() }))
        .filter((m) => m.name),
      longTermTreatments: d.longTermTreatments
        .map((t) => ({ treatmentName: t.treatmentName.trim(), notes: t.notes.trim(), isOngoing: t.isOngoing }))
        .filter((t) => t.treatmentName),
      notes: d.notes.trim(),
      emergencyContact: { name: d.ecName.trim(), relationship: d.ecRelationship.trim(), phone: d.ecPhone.trim() }
    }
  };
  if (includeName) payload.name = d.name.trim();
  return payload;
}

export const isDirty = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

// ---------- validation (mirrors backend limits) ----------
const PHONE_RE = /^[\d\s+\-()]{7,20}$/;

export function validatePhone(value) {
  const v = value.trim();
  if (!v) return '';
  if (!PHONE_RE.test(v) || (v.match(/\d/g) || []).length < 6) return 'Enter a valid phone number (digits, spaces, +, -, parentheses).';
  return '';
}

export function validateDob(value) {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a valid date.';
  const [y, m, day] = value.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== day) return 'Enter a valid date.';
  const now = new Date();
  if (date > now) return 'Date of birth cannot be in the future.';
  const oldest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  if (date < oldest) return 'Date of birth cannot be more than 120 years ago.';
  return '';
}

const validateNumber = (value, label, max, unit) => {
  if (!String(value).trim()) return '';
  const n = parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > max) return `${label} must be between 0 and ${max} ${unit}.`;
  return '';
};

export function validateDraft(d) {
  const e = {};
  if (!d.name.trim()) e.name = 'Name is required.';
  else if (d.name.trim().length > LIMITS.name) e.name = `Name must be ${LIMITS.name} characters or fewer.`;
  const phone = validatePhone(d.phone);
  if (phone) e.phone = phone;
  if (d.address.length > LIMITS.address) e.address = `Address must be ${LIMITS.address} characters or fewer.`;
  const dob = validateDob(d.dateOfBirth);
  if (dob) e.dateOfBirth = dob;
  const h = validateNumber(d.height, 'Height', 300, 'cm');
  if (h) e.height = h;
  const w = validateNumber(d.weight, 'Weight', 700, 'kg');
  if (w) e.weight = w;
  if (d.notes.length > LIMITS.notes) e.notes = `Notes must be ${LIMITS.notes} characters or fewer.`;
  if (d.ecName.length > LIMITS.name) e.ecName = `Name must be ${LIMITS.name} characters or fewer.`;
  if (d.ecRelationship.length > LIMITS.relationship) e.ecRelationship = `Must be ${LIMITS.relationship} characters or fewer.`;
  const ecPhone = validatePhone(d.ecPhone);
  if (ecPhone) e.ecPhone = ecPhone;
  if (d.currentMedications.some((m) => !m.name.trim() && (m.dosage.trim() || m.frequency.trim()))) {
    e.currentMedications = 'Give each medication a name, or remove the row.';
  } else if (d.currentMedications.some((m) => m.name.length > LIMITS.item || m.dosage.length > LIMITS.dosage || m.frequency.length > LIMITS.frequency)) {
    e.currentMedications = 'A medication entry is too long.';
  }
  if (d.longTermTreatments.some((t) => !t.treatmentName.trim() && t.notes.trim())) {
    e.longTermTreatments = 'Give each treatment a name, or remove the row.';
  } else if (d.longTermTreatments.some((t) => t.treatmentName.length > LIMITS.item || t.notes.length > LIMITS.treatmentNotes)) {
    e.longTermTreatments = 'A treatment entry is too long.';
  }
  return e;
}

// ---------- profile completeness ----------
export function completeness(user) {
  const mp = user?.medicalProfile || {};
  const ec = mp.emergencyContact || {};
  const checks = [
    ['Phone number', Boolean(user?.phone)],
    ['Address', Boolean(user?.address)],
    ['Date of birth', Boolean(mp.dateOfBirth)],
    ['Gender', Boolean(mp.gender)],
    ['Blood group', Boolean(mp.bloodGroup)],
    ['Height', mp.height > 0],
    ['Weight', mp.weight > 0],
    ['Allergies', asList(mp.allergies).length > 0],
    ['Health conditions', asList(mp.preExistingConditions).length > 0],
    ['Medications', asList(mp.currentMedications).length > 0],
    ['Emergency contact name', Boolean(ec.name)],
    ['Emergency contact phone', Boolean(ec.phone)]
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
}

export const formatBytes = (n) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
