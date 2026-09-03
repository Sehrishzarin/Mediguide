import { useState } from 'react';
import * as api from '../../services/api';
import styles from './OrgForms.module.css';

const SPECIALTIES = [
  { value: '', label: 'Select specialty...' },
  { value: 'general', label: 'General Practice' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'nurse', label: 'Nursing' },
  { value: 'administration', label: 'Administration' },
  { value: 'other', label: 'Other' },
];

const emptyStaff = { name: '', specialty: '' };

function OrgStaffForm({ orgId, onNext, onBack }) {
  const [entries, setEntries] = useState([{ ...emptyStaff }]);
  const [added, setAdded] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateEntry = (index, field, value) => {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  };

  const addRow = () => setEntries((prev) => [...prev, { ...emptyStaff }]);
  const removeRow = (index) => setEntries((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setError('');
    const filled = entries.filter((e) => e.name.trim() && e.specialty);
    if (filled.length === 0 && added.length === 0) { onNext({ staff: added }); return; }
    setSaving(true);
    try {
      const results = [];
      for (const entry of filled) {
        const { staff } = await api.addStaff(orgId, { name: entry.name.trim(), specialty: entry.specialty });
        results.push(staff);
      }
      const allStaff = [...added, ...results];
      setAdded(allStaff);
      setEntries([{ ...emptyStaff }]);
      onNext({ staff: allStaff });
    } catch (err) {
      setError(err.message || 'Failed to add staff.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.staffWrapper}>
      <h2 className={styles.heading}>Add staff members</h2>
      <p className={styles.subtext}>Add team members to your organization. You can always add more later.</p>

      <div className={styles.staffEntries}>
        {entries.map((entry, idx) => (
          <div key={idx} className={styles.staffEntry}>
            <div style={{ flex: 1 }}>
              <input type="text" value={entry.name} onChange={(e) => updateEntry(idx, 'name', e.target.value)} placeholder="Full name" className={styles.input} />
            </div>
            <div style={{ flex: 1 }}>
              <select value={entry.specialty} onChange={(e) => updateEntry(idx, 'specialty', e.target.value)} className={styles.select}>
                {SPECIALTIES.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ''}>{opt.label}</option>
                ))}
              </select>
            </div>
            {entries.length > 1 && (
              <button type="button" onClick={() => removeRow(idx)} className={styles.removeRowBtn} title="Remove">
                <svg className={styles.removeRowSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className={styles.addRowBtn}>+ Add another staff member</button>

      {added.length > 0 && (
        <div className={styles.addedList}>
          <p className={styles.addedLabel}>Added:</p>
          <ul className={styles.addedItems}>
            {added.map((s) => (
              <li key={s.id} className={styles.addedItem}>{s.name} — {s.specialty}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.btnRow}>
        <button type="button" onClick={onBack} className={styles.btnBack}>Back</button>
        <button type="button" onClick={handleSubmit} disabled={saving} className={styles.btnPrimary}>
          {saving ? 'Saving...' : 'Finish'}
        </button>
      </div>
    </div>
  );
}

export default OrgStaffForm;
