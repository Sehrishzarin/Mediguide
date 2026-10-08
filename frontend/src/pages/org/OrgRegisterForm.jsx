import { useState } from 'react';
import { createOrganization } from '../../services/api';
import Spinner from '../../components/Spinner';
import styles from './OrgDashboard.module.css';

const TYPES = ['Hospital', 'Clinic', 'Pharmacy', 'Diagnostic Center'];
const SERVICE_SUGGESTIONS = ['Emergency', 'Outpatient', 'Laboratory', 'Radiology', 'Pharmacy', 'Maternity'];
const MAX_SERVICES = 12;

const toNumber = (v) => (String(v).trim() === '' ? NaN : Number(v));

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Enter the facility name.';
  if (!f.address.trim()) e.address = 'Enter the street address.';
  if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (f.phone.trim() && !/^[+\d][\d\s()-]{6,19}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number.';
  const lat = toNumber(f.latitude);
  const lng = toNumber(f.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) e.latitude = 'Latitude must be between -90 and 90.';
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) e.longitude = 'Longitude must be between -180 and 180.';
  return e;
}

export default function OrgRegisterForm({ defaultEmail, onCreated, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: 'Hospital', address: '', phone: '', email: defaultEmail || '', latitude: '', longitude: ''
  });
  const [services, setServices] = useState([]);
  const [serviceDraft, setServiceDraft] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const addService = (value) => {
    const s = value.trim();
    if (!s) return;
    setServices((prev) => (prev.length >= MAX_SERVICES || prev.some((x) => x.toLowerCase() === s.toLowerCase()) ? prev : [...prev, s.slice(0, 40)]));
    setServiceDraft('');
  };

  const onServiceKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addService(serviceDraft);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationNote('Location is not available on this device. Enter the coordinates manually.');
      return;
    }
    setLocating(true);
    setLocationNote('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
        setLocationNote('Location captured. Stand at the facility when doing this for best accuracy.');
        setLocating(false);
      },
      (err) => {
        setLocationNote(
          err.code === 1
            ? 'Location permission was denied. Allow it in your browser settings or enter the coordinates manually.'
            : 'We could not detect your location. Enter the coordinates manually.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    const pendingService = serviceDraft.trim();
    const finalServices = pendingService && !services.includes(pendingService) ? [...services, pendingService] : services;
    const found = validate(form);
    setErrors(found);
    setSubmitError('');
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOrganization({
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        services: finalServices,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude)
      });
      onCreated(res.data);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  const field = (id, label, props = {}) => (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        id={id}
        className={`${styles.input} ${errors[id] ? styles.inputError : ''}`}
        value={form[id]}
        onChange={set(id)}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `${id}-err` : undefined}
        {...props}
      />
      {errors[id] && <p id={`${id}-err`} className={styles.fieldError}>{errors[id]}</p>}
    </div>
  );

  return (
    <form className={styles.card} onSubmit={submit} noValidate>
      <h2 className={styles.cardTitle}>Register your facility</h2>
      <p className={styles.muted}>
        Tell us about your hospital, clinic, pharmacy or diagnostic centre. Our team reviews every listing before it appears to patients.
      </p>

      <div className={styles.grid2}>
        {field('name', 'Facility name', { autoComplete: 'organization', maxLength: 100, placeholder: 'City Care Hospital' })}
        <div className={styles.field}>
          <label htmlFor="type" className={styles.label}>Type</label>
          <select id="type" className={styles.input} value={form.type} onChange={set('type')}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {field('address', 'Address', { autoComplete: 'street-address', maxLength: 200, placeholder: 'Street, area, city' })}

      <div className={styles.grid2}>
        {field('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '+92 300 1234567' })}
        {field('email', 'Contact email (optional)', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Services offered</legend>
        <div className={styles.chips}>
          {services.map((s) => (
            <span key={s} className={styles.chip}>
              {s}
              <button type="button" className={styles.chipX} aria-label={`Remove ${s}`} onClick={() => setServices((p) => p.filter((x) => x !== s))}>&#10005;</button>
            </span>
          ))}
        </div>
        <div className={styles.inlineRow}>
          <input
            className={styles.input}
            value={serviceDraft}
            onChange={(e) => setServiceDraft(e.target.value)}
            onKeyDown={onServiceKey}
            placeholder="Type a service and press Enter"
            aria-label="Add a service"
            maxLength={40}
          />
          <button type="button" className={styles.btnGhost} onClick={() => addService(serviceDraft)}>Add</button>
        </div>
        <div className={styles.suggestions}>
          {SERVICE_SUGGESTIONS.filter((s) => !services.includes(s)).map((s) => (
            <button key={s} type="button" className={styles.suggestion} onClick={() => addService(s)}>+ {s}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Location on the map</legend>
        <p className={styles.muted}>Patients find you by distance, so we need your coordinates.</p>
        <button type="button" className={styles.btnOutline} onClick={useMyLocation} disabled={locating}>
          {locating ? <><Spinner size="sm" /> Detecting...</> : 'Use my current location'}
        </button>
        {locationNote && <p className={styles.note} role="status">{locationNote}</p>}
        <div className={styles.grid2}>
          {field('latitude', 'Latitude', { inputMode: 'decimal', placeholder: '24.8607' })}
          {field('longitude', 'Longitude', { inputMode: 'decimal', placeholder: '67.0011' })}
        </div>
      </fieldset>

      {submitError && <p className={styles.formError} role="alert">{submitError}</p>}

      <div className={styles.actions}>
        {onCancel && <button type="button" className={styles.btnGhost} onClick={onCancel} disabled={submitting}>Cancel</button>}
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? <><Spinner size="sm" /> Submitting...</> : 'Submit for review'}
        </button>
      </div>
    </form>
  );
}
