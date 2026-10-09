import { useState } from 'react';
import { Crosshair, Plus, X, AlertCircle, Info } from 'lucide-react';
import { createOrganization } from '../../services/api';
import { Alert, Button, Card, Chip, Field, Input, Select } from '../../components/ui';
import friendlyError from '../../utils/friendlyError';
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

export default function OrgRegisterForm({ defaultEmail, onCreated, onCancel, first }) {
  const [form, setForm] = useState({
    name: '', type: 'Hospital', address: '', phone: '', email: defaultEmail || '', latitude: '', longitude: ''
  });
  const [services, setServices] = useState([]);
  const [serviceDraft, setServiceDraft] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState({ tone: '', text: '' });

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
      setLocationNote({ tone: 'warning', text: 'Location is not available on this device. Enter the coordinates manually.' });
      return;
    }
    setLocating(true);
    setLocationNote({ tone: '', text: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
        setLocationNote({ tone: 'success', text: 'Location captured. For best accuracy, do this while you are at the facility.' });
        setLocating(false);
      },
      (err) => {
        setLocationNote({
          tone: 'warning',
          text: err.code === 1
            ? 'Location permission was denied. Allow it in your browser settings or enter the coordinates manually.'
            : 'We could not detect your location. Enter the coordinates manually.'
        });
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
      document.getElementById(`org-${Object.keys(found)[0]}`)?.focus();
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
      setSubmitError(friendlyError(err, 'We could not submit your facility. Please try again.'));
      setSubmitting(false);
    }
  };

  const field = (key, label, props = {}, fieldProps = {}) => (
    <Field label={label} htmlFor={`org-${key}`} error={errors[key]} {...fieldProps}>
      <Input id={`org-${key}`} value={form[key]} onChange={set(key)} invalid={Boolean(errors[key])} {...props} />
    </Field>
  );

  return (
    <Card as="form" padding="none" className={styles.orgCard} onSubmit={submit} noValidate>
      <header className={styles.formHead}>
        <h2 className={styles.orgTitle}>{first ? 'Register your first facility' : 'Register another facility'}</h2>
        <p className={styles.muted}>
          Tell us about your hospital, clinic, pharmacy or diagnostic centre. Our team reviews every listing before patients can see it.
        </p>
      </header>

      <div className={styles.formBody}>
        <div className={styles.grid2}>
          {field('name', 'Facility name', { autoComplete: 'organization', maxLength: 100, placeholder: 'City Care Hospital' })}
          <Field label="Type" htmlFor="org-type">
            <Select id="org-type" value={form.type} onChange={set('type')}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>

        {field('address', 'Address', { autoComplete: 'street-address', maxLength: 200, placeholder: 'Street, area, city' })}

        <div className={styles.grid2}>
          {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '+92 300 1234567' }, { optional: true })}
          {field('email', 'Contact email', { type: 'email', autoComplete: 'email', inputMode: 'email' }, { optional: true })}
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Services offered <span className={styles.optional}>(optional)</span></legend>
          {services.length > 0 && (
            <ul className={styles.tagList} aria-label="Services added">
              {services.map((s) => (
                <li key={s} className={styles.tag}>
                  <span>{s}</span>
                  <button type="button" className={styles.tagX} aria-label={`Remove ${s}`} onClick={() => setServices((p) => p.filter((x) => x !== s))}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.inlineRow}>
            <Input
              value={serviceDraft}
              onChange={(e) => setServiceDraft(e.target.value)}
              onKeyDown={onServiceKey}
              placeholder="Type a service and press Enter"
              aria-label="Add a service"
              maxLength={40}
            />
            <Button variant="secondary" icon={Plus} onClick={() => addService(serviceDraft)}>Add</Button>
          </div>
          <div className={styles.suggestions}>
            {SERVICE_SUGGESTIONS.filter((s) => !services.includes(s)).map((s) => (
              <Chip key={s} icon={Plus} onClick={() => addService(s)}>{s}</Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Location on the map</legend>
          <p className={styles.muted}>Patients find you by distance, so we need your coordinates.</p>
          <div>
            <Button variant="secondary" icon={Crosshair} onClick={useMyLocation} loading={locating}>
              {locating ? 'Detecting location' : 'Use my current location'}
            </Button>
          </div>
          {locationNote.text && <Alert tone={locationNote.tone} icon={Info}>{locationNote.text}</Alert>}
          <div className={styles.grid2}>
            {field('latitude', 'Latitude', { inputMode: 'decimal', placeholder: '24.8607' })}
            {field('longitude', 'Longitude', { inputMode: 'decimal', placeholder: '67.0011' })}
          </div>
        </fieldset>

        {submitError && <Alert tone="danger" icon={AlertCircle}>{submitError}</Alert>}
      </div>

      <footer className={styles.formFoot}>
        {onCancel && <Button variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>}
        <Button type="submit" loading={submitting}>{submitting ? 'Submitting' : 'Submit for review'}</Button>
      </footer>
    </Card>
  );
}
