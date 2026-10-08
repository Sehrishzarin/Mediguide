import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import { TextField, SelectField, TagInput, MedicationsEditor } from './profile/FormKit';
import {
  BLOOD_GROUPS, GENDERS, PREGNANCY_OPTIONS, LIMITS,
  draftFromUser, payloadFromDraft, validateDraft, todayISO
} from './profile/profileModel';
import styles from './Onboarding.module.css';

const STEPS = ['welcome', 'about', 'health', 'contact', 'permissions', 'done'];
const STEP_FIELDS = {
  about: ['dateOfBirth', 'height', 'weight'],
  health: ['currentMedications'],
  contact: ['phone', 'address', 'ecName', 'ecRelationship', 'ecPhone']
};

const BLANK_FOR = {
  dateOfBirth: '', height: '', weight: '', currentMedications: [], phone: '', address: '', ecName: '', ecRelationship: '', ecPhone: ''
};

const PERM_LABELS = {
  idle: '',
  asking: 'Waiting for your answer…',
  granted: 'Allowed',
  denied: 'Blocked. You can change this in your browser or phone settings.',
  unsupported: 'Not supported on this device or browser.',
  unavailable: 'Allowed, but your location could not be determined right now.',
  nodevice: 'No microphone was found on this device.'
};

async function requestLocation() {
  if (!('geolocation' in navigator)) return 'unsupported';
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === 1 ? 'denied' : 'unavailable'),
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

async function requestMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return 'granted';
  } catch (err) {
    if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') return 'nodevice';
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError' || err?.name === 'PermissionDeniedError') return 'denied';
    return 'unsupported';
  }
}

function PermissionRow({ title, description, status, onRequest, icon }) {
  const busy = status === 'asking';
  const good = status === 'granted';
  const bad = status === 'denied' || status === 'unsupported' || status === 'nodevice';
  return (
    <div className={styles.permRow}>
      <div className={styles.permIcon} aria-hidden="true">{icon}</div>
      <div className={styles.permBody}>
        <p className={styles.permTitle}>{title}</p>
        <p className={styles.permDesc}>{description}</p>
        <p
          className={`${styles.permStatus} ${good ? styles.permGood : ''} ${bad ? styles.permBad : ''}`}
          role="status"
        >
          {PERM_LABELS[status]}
        </p>
      </div>
      {!good && (
        <button type="button" className={styles.permBtn} onClick={onRequest} disabled={busy}>
          {busy ? <Spinner size="sm" /> : status === 'idle' ? 'Allow' : 'Try again'}
        </button>
      )}
    </div>
  );
}

export default function Onboarding() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => draftFromUser(user));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [perms, setPerms] = useState({ location: 'idle', mic: 'idle' });
  const [today] = useState(todayISO);
  const headingRef = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  if (!user) return null;
  if (user.onboardingCompleted && !saving) return <Navigate to="/patient/home" replace />;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const errors = validateDraft(draft);
  const stepKey = STEPS[step];
  const err = (key) => (showErrors ? errors[key] : undefined);
  const stepHasErrors = (key) => (STEP_FIELDS[key] || []).some((f) => errors[f]);

  const finish = async (data) => {
    setSaving(true);
    setSaveError('');
    try {
      await updateProfile({ ...payloadFromDraft(data, { includeName: false }), onboardingCompleted: true });
      navigate('/patient/home', { replace: true });
    } catch (e) {
      setSaveError(e.message || 'Could not save your profile. Please try again.');
      setSaving(false);
    }
  };

  const next = () => {
    if (stepHasErrors(stepKey)) { setShowErrors(true); return; }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const skipStep = () => { setShowErrors(false); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => { setShowErrors(false); setStep((s) => Math.max(s - 1, 0)); };

  // "Skip setup": keep everything valid that was entered, drop anything invalid
  const skipSetup = () => {
    const cleaned = { ...draft };
    Object.keys(errors).forEach((k) => { if (k in BLANK_FOR) cleaned[k] = BLANK_FOR[k]; });
    finish(cleaned);
  };

  const done = () => {
    const bad = ['about', 'health', 'contact'].find(stepHasErrors);
    if (bad) { setShowErrors(true); setStep(STEPS.indexOf(bad)); return; }
    finish(draft);
  };

  const ask = async (key, fn) => {
    setPerms((p) => ({ ...p, [key]: 'asking' }));
    const result = await fn();
    setPerms((p) => ({ ...p, [key]: result }));
  };

  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';
  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  const isFirst = step === 0;
  const isLast = stepKey === 'done';
  const optionalStep = ['about', 'health', 'contact', 'permissions'].includes(stepKey);

  const summary = [
    ['Date of birth', draft.dateOfBirth],
    ['Blood group', draft.bloodGroup],
    ['Allergies', draft.allergies.join(', ')],
    ['Conditions', draft.preExistingConditions.join(', ')],
    ['Medications', draft.currentMedications.filter((m) => m.name.trim()).map((m) => m.name.trim()).join(', ')],
    ['Emergency contact', draft.ecName]
  ].filter(([, v]) => v);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.brand}>
              <img src="/logo.jpg" alt="" className={styles.logo} />
              MediGuide
            </span>
            <span className={styles.stepCount}>Step {step + 1} of {STEPS.length}</span>
          </div>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Setup progress"
          >
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </header>

        <main className={styles.body}>
          {stepKey === 'welcome' && (
            <section>
              <div className={styles.heroIcon} aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
              </div>
              <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Welcome, {firstName}</h1>
              <p className={styles.lead}>
                MediGuide helps you understand your symptoms, find nearby care and book doctor sessions.
                A minute of setup makes the guidance more relevant to you.
              </p>
              <ul className={styles.featureList}>
                <li><strong>Symptom check.</strong> Describe how you feel and get guided next steps.</li>
                <li><strong>Nearby care.</strong> Find hospitals and clinics close to you.</li>
                <li><strong>Doctor sessions.</strong> Book available appointments.</li>
                <li><strong>Emergency info.</strong> Keep your key medical details and a contact ready.</li>
              </ul>
              <p className={styles.note}>Everything is optional and you can edit it any time from your profile.</p>
            </section>
          )}

          {stepKey === 'about' && (
            <section className={styles.form}>
              <h1 ref={headingRef} tabIndex={-1} className={styles.title}>About you</h1>
              <p className={styles.lead}>These details help tailor health guidance.</p>
              <TextField
                label="Date of birth"
                type="date"
                value={draft.dateOfBirth}
                onChange={(v) => set({ dateOfBirth: v })}
                max={today}
                min="1900-01-01"
                autoComplete="bday"
                error={err('dateOfBirth')}
              />
              <div className={styles.twoCol}>
                <SelectField label="Gender" value={draft.gender} onChange={(v) => set({ gender: v })} options={GENDERS} />
                <SelectField label="Blood group" value={draft.bloodGroup} onChange={(v) => set({ bloodGroup: v })} options={BLOOD_GROUPS} />
              </div>
              <div className={styles.twoCol}>
                <TextField label="Height" suffix="cm" inputMode="decimal" value={draft.height} onChange={(v) => set({ height: v })} placeholder="170" error={err('height')} autoComplete="off" />
                <TextField label="Weight" suffix="kg" inputMode="decimal" value={draft.weight} onChange={(v) => set({ weight: v })} placeholder="65" error={err('weight')} autoComplete="off" />
              </div>
              {draft.gender === 'Female' && (
                <SelectField
                  label="Pregnancy status"
                  value={draft.pregnancyStatus === 'N/A' ? '' : draft.pregnancyStatus}
                  onChange={(v) => set({ pregnancyStatus: v || 'N/A' })}
                  options={PREGNANCY_OPTIONS.filter((o) => o !== 'N/A')}
                  placeholder="Prefer not to say"
                />
              )}
            </section>
          )}

          {stepKey === 'health' && (
            <section className={styles.form}>
              <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Health background</h1>
              <p className={styles.lead}>Type an item and press Enter or Add. Nothing to add? Just continue.</p>
              <TagInput label="Allergies" items={draft.allergies} onChange={(v) => set({ allergies: v })} placeholder="e.g. Penicillin" />
              <TagInput label="Existing conditions" items={draft.preExistingConditions} onChange={(v) => set({ preExistingConditions: v })} placeholder="e.g. Asthma" />
              <MedicationsEditor rows={draft.currentMedications} onChange={(v) => set({ currentMedications: v })} error={err('currentMedications')} />
            </section>
          )}

          {stepKey === 'contact' && (
            <section className={styles.form}>
              <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Contact details</h1>
              <p className={styles.lead}>Someone we can show first in an emergency, and how to reach you.</p>
              <TextField label="Your phone" type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(v) => set({ phone: v })} placeholder="+1 555 123 4567" error={err('phone')} />
              <TextField label="Address" autoComplete="street-address" value={draft.address} onChange={(v) => set({ address: v })} maxLength={LIMITS.address} placeholder="Street, city" error={err('address')} />
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Emergency contact</legend>
                <TextField label="Name" autoComplete="off" value={draft.ecName} onChange={(v) => set({ ecName: v })} maxLength={LIMITS.name} error={err('ecName')} />
                <div className={styles.twoCol}>
                  <TextField label="Relationship" autoComplete="off" value={draft.ecRelationship} onChange={(v) => set({ ecRelationship: v })} maxLength={LIMITS.relationship} placeholder="e.g. Sister" error={err('ecRelationship')} />
                  <TextField label="Phone" type="tel" inputMode="tel" autoComplete="off" value={draft.ecPhone} onChange={(v) => set({ ecPhone: v })} error={err('ecPhone')} />
                </div>
              </fieldset>
            </section>
          )}

          {stepKey === 'permissions' && (
            <section>
              <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Permissions</h1>
              <p className={styles.lead}>Both are optional. We only ask when needed, and never record anything now.</p>
              <div className={styles.permList}>
                <PermissionRow
                  title="Location"
                  description="Find hospitals and clinics near you."
                  status={perms.location}
                  onRequest={() => ask('location', requestLocation)}
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>}
                />
                <PermissionRow
                  title="Microphone"
                  description="Describe your symptoms by voice."
                  status={perms.mic}
                  onRequest={() => ask('mic', requestMicrophone)}
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
                />
              </div>
            </section>
          )}

          {isLast && (
            <section>
              <div className={styles.heroIcon} aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <h1 ref={headingRef} tabIndex={-1} className={styles.title}>You are all set</h1>
              <p className={styles.lead}>
                {summary.length ? 'Here is what we will save to your profile.' : 'You skipped the details. You can add them any time from your profile.'}
              </p>
              {summary.length > 0 && (
                <dl className={styles.summary}>
                  {summary.map(([k, v]) => (
                    <div key={k} className={styles.summaryRow}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}

          <div aria-live="assertive" className={styles.liveRegion}>
            {saveError && <p className={styles.saveError} role="alert">{saveError}</p>}
          </div>
        </main>

        <footer className={styles.footer}>
          <div className={styles.actions}>
            {!isFirst && (
              <button type="button" className={styles.secondaryBtn} onClick={back} disabled={saving}>Back</button>
            )}
            {isLast ? (
              <button type="button" className={styles.primaryBtn} onClick={done} disabled={saving}>
                {saving ? <><Spinner size="sm" /> Saving…</> : 'Go to my dashboard'}
              </button>
            ) : (
              <button type="button" className={styles.primaryBtn} onClick={next} disabled={saving}>
                {isFirst ? 'Get started' : 'Next'}
              </button>
            )}
          </div>
          <div className={styles.links}>
            {optionalStep && (
              <button type="button" className={styles.linkBtn} onClick={skipStep} disabled={saving}>Skip for now</button>
            )}
            {!isLast && (
              <button type="button" className={styles.linkBtn} onClick={skipSetup} disabled={saving}>
                {saving ? 'Saving…' : 'Skip setup'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
