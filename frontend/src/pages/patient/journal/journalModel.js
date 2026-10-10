// Labels and helpers shared by the journal screens.
export const MOODS = [
  { value: 1, label: 'Awful' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' }
];

export const ENERGY = [
  { value: 1, label: 'Exhausted' },
  { value: 2, label: 'Tired' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Energetic' }
];

export const PAIN = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Strong' },
  { value: 4, label: 'Severe' },
  { value: 5, label: 'Worst' }
];

export const SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Sore throat', 'Nausea', 'Vomiting', 'Diarrhoea', 'Stomach pain',
  'Back pain', 'Dizziness', 'Fatigue', 'Cramps', 'Bloating', 'Breast tenderness', 'Acne',
  'Trouble sleeping', 'Anxiety', 'Low mood'
];

export const FLOWS = [
  { value: 'none', label: 'None' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' }
];
export const BLEEDING = ['light', 'medium', 'heavy'];

export const FEVER_C = 38;

export const labelOf = (list, v) => list.find((x) => x.value === v)?.label || '';

// mood 1-2 → low (muted amber), 3 → mid (neutral), 4-5 → good (teal)
export const moodTone = (mood) => {
  if (!mood) return null;
  if (mood <= 2) return 'low';
  if (mood === 3) return 'mid';
  return 'good';
};

export const cToF = (c) => Math.round((c * 9 / 5 + 32) * 10) / 10;

// The full body for PUT /journal/:date (the endpoint replaces the whole entry)
export const entryBody = (e = {}) => ({
  mood: e.mood ?? null,
  energy: e.energy ?? null,
  pain: e.pain ?? null,
  temperature: e.temperature ?? null,
  symptoms: Array.isArray(e.symptoms) ? e.symptoms : [],
  notes: e.notes || '',
  period: { flow: e.period?.flow || 'none' },
  planFields: e.planFields || {}
});

// Short one-line description of a logged day
export function entrySummary(e, { cycle = false } = {}) {
  const parts = [];
  if (e.mood) parts.push(`Mood: ${labelOf(MOODS, e.mood).toLowerCase()}`);
  if (e.energy) parts.push(`Energy: ${labelOf(ENERGY, e.energy).toLowerCase()}`);
  if (typeof e.pain === 'number' && e.pain > 0) parts.push(`Pain: ${labelOf(PAIN, e.pain).toLowerCase()}`);
  if (typeof e.temperature === 'number') parts.push(`${e.temperature} °C`);
  if (cycle && e.period?.flow && e.period.flow !== 'none') parts.push(`Period: ${labelOf(FLOWS, e.period.flow).toLowerCase()}`);
  if (e.symptoms?.length) parts.push(e.symptoms.slice(0, 3).join(', ') + (e.symptoms.length > 3 ? ` +${e.symptoms.length - 3}` : ''));
  return parts.join(' · ') || (e.notes ? 'Note added' : 'Logged');
}

export const nuraLink = (alert) =>
  `/patient/nura/new?q=${encodeURIComponent(`${alert.title}. ${alert.message} What should I do?`)}`;
