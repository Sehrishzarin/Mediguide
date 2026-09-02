import { useState } from 'react';
import * as api from '../../services/api';
import styles from './OrgForms.module.css';

const ORG_TYPES = [
  { value: '', label: 'Select type / specialty...' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'rehabilitation', label: 'Rehabilitation Center' },
  { value: 'mental_health', label: 'Mental Health Facility' },
  { value: 'dental', label: 'Dental Clinic' },
  { value: 'other', label: 'Other' },
];

function OrgDataForm({ onNext, onBack }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !type) { setError('Organization name and type are required.'); return; }
    setLoading(true);
    try {
      const data = { name, type, address, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null };
      const { organization } = await api.createOrganization(data);
      onNext({ organization });
    } catch (err) {
      setError(err.message || 'Failed to create organization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Organization details</h2>
      <p className={styles.subtext}>Tell us about your organization.</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Organization name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. City General Hospital" className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Type / Specialty</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={styles.select}>
            {ORG_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.value === ''}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, city" className={styles.input} />
        </div>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Latitude</label>
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 40.7128" className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Longitude</label>
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. -74.0060" className={styles.input} />
          </div>
        </div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        <div className={styles.btnRow}>
          <button type="button" onClick={onBack} className={styles.btnBack}>Back</button>
          <button type="submit" disabled={loading} className={styles.btnPrimary}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OrgDataForm;
