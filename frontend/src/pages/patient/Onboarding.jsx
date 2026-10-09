import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MessageCircle, MapPin, CalendarCheck, Siren, Mic, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, Alert, ProgressBar, Logo } from '../../components/ui';
import Nura from '../../components/nura/Nura';
import friendlyError from '../../utils/friendlyError';
import { TextField, SelectField, TagInput, MedicationsEditor } from './profile/FormKit';
import {
  BLOOD_GROUPS, GENDERS, PREGNANCY_OPTIONS, LIMITS,
  draftFromUser, payloadFromDraft, validateDraft, todayISO
} from './profile/profileModel';
import styles from './Onboarding.module.css';

const FEATURES = [
  { icon: MessageCircle, title: 'Ask Nura', text: 'Describe how you feel and get clear next steps.' },
  { icon: MapPin, title: 'Nearby care', text: 'Find hospitals and clinics close to you.' },
  { icon: CalendarCheck, title: 'Doctor sessions', text: 'Book available appointments in a few taps.' },
  { icon: Siren, title: 'Emergency info', text: 'Keep key medical details and a contact ready.' }
];

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

const PERM_TONE = { granted: 'success', denied: 'danger', unsupported: 'neutral', nodevice: 'neutral', unavailable: 'warning', asking: 'info' };
const PERM_SHORT = { granted: 'Allowed', denied: 'Blocked', unsupported: 'Not supported', nodevice: 'No microphone', unavailable: 'Allowed', asking: 'Waiting' };

function PermissionRow({ title, description, status, onRequest, icon: Icon }) {
  const busy = status === 'asking';
  const good = status === 'granted';
  return (
    <div className={styles.permRow}>
      <span className={styles.permIcon} aria-hidden="true"><Icon size={20} /></span>
      <div className={styles.permBody}>
        <div className={styles.permTitleRow}>
          <p className={styles.permTitle}>{title}</p>
          {status !== 'idle' && <Badge tone={PERM_TONE[status]}>{PERM_SHORT[status]}</Badge>}
        </div>
        <p className={styles.permDesc}>{description}</p>
        <p className={styles.permStatus} role="status">{status !== 'granted' && status !== 'asking' ? PERM_LABELS[status] : ''}</p>
      </div>
      {!good && (
        <Button variant="secondary" size="sm" onClick={onRequest} loading={busy} className={styles.permBtn}>
          {status === 'idle' || busy ? 'Allow' : 'Try again'}
        </Button>
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
      setSaveError(friendlyError(e, 'We could not save your profile. Please try again.'));
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
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <Logo size={28} />
            <span className={styles.stepCount}>Step {step + 1} of {STEPS.length}</span>
          </div>
          <ProgressBar value={progress} label="Setup progress" />
        </header>

        <main className={styles.body}>
          {stepKey === 'welcome' && (
            <section className={styles.stack}>
              <div className={styles.nuraHero}><Nura size={96} mood="happy" /></div>
              <div>
                <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Hi {firstName}, I&apos;m Nura</h1>
                <p className={styles.lead}>
                  I&apos;ll help you understand symptoms, find nearby care and book doctors.
                  A minute of setup makes my guidance more relevant to you.
                </p>
              </div>
              <ul className={styles.featureList}>
                {FEATURES.map(({ icon: Icon, title, text }) => (
                  <li key={title} className={styles.feature}>
                    <span className={styles.featureIcon} aria-hidden="true"><Icon size={18} /></span>
                    <span>
                      <span className={styles.featureTitle}>{title}</span>
                      <span className={styles.featureText}>{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className={styles.note}>Everything is optional and you can edit it any time from your profile.</p>
            </section>
          )}

          {stepKey === 'about' && (
            <section className={styles.stack}>
              <div>
                <h1 ref={headingRef} tabIndex={-1} className={styles.title}>About you</h1>
                <p className={styles.lead}>These details help tailor health guidance.</p>
              </div>
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
            <section className={styles.stack}>
              <div>
                <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Health background</h1>
                <p className={styles.lead}>Type an item and press Enter or Add. Nothing to add? Just continue.</p>
              </div>
              <TagInput label="Allergies" items={draft.allergies} onChange={(v) => set({ allergies: v })} placeholder="e.g. Penicillin" />
              <TagInput label="Existing conditions" items={draft.preExistingConditions} onChange={(v) => set({ preExistingConditions: v })} placeholder="e.g. Asthma" />
              <MedicationsEditor rows={draft.currentMedications} onChange={(v) => set({ currentMedications: v })} error={err('currentMedications')} />
            </section>
          )}

          {stepKey === 'contact' && (
            <section className={styles.stack}>
              <div>
                <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Contact details</h1>
                <p className={styles.lead}>How to reach you, and someone we can show first in an emergency.</p>
              </div>
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
            <section className={styles.stack}>
              <div>
                <h1 ref={headingRef} tabIndex={-1} className={styles.title}>Permissions</h1>
                <p className={styles.lead}>Both are optional. We only use them when you ask, and nothing is recorded now.</p>
              </div>
              <div className={styles.permList}>
                <PermissionRow
                  title="Location"
                  description="Find hospitals and clinics near you."
                  status={perms.location}
                  onRequest={() => ask('location', requestLocation)}
                  icon={MapPin}
                />
                <PermissionRow
                  title="Microphone"
                  description="Describe your symptoms to Nura by voice."
                  status={perms.mic}
                  onRequest={() => ask('mic', requestMicrophone)}
                  icon={Mic}
                />
              </div>
            </section>
          )}

          {isLast && (
            <section className={styles.stack}>
              <div className={styles.nuraHero}><Nura size={96} mood="happy" /></div>
              <div>
                <h1 ref={headingRef} tabIndex={-1} className={styles.title}>You&apos;re all set</h1>
                <p className={styles.lead}>
                  {summary.length ? 'Here is what we will save to your profile.' : 'You skipped the details. You can add them any time from your profile.'}
                </p>
              </div>
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
            {saveError && <Alert tone="danger" icon={AlertCircle}>{saveError}</Alert>}
          </div>
        </main>

        <footer className={styles.footer}>
          <div className={styles.actions}>
            {!isFirst && (
              <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={back} disabled={saving} className={styles.backBtn}>Back</Button>
            )}
            {isLast ? (
              <Button size="lg" onClick={done} loading={saving} className={styles.primaryBtn}>
                {saving ? 'Saving' : 'Go to my home'}
              </Button>
            ) : (
              <Button size="lg" iconRight={ArrowRight} onClick={next} disabled={saving} className={styles.primaryBtn}>
                {isFirst ? 'Get started' : 'Continue'}
              </Button>
            )}
          </div>
          <div className={styles.links}>
            {optionalStep && (
              <Button variant="ghost" size="sm" onClick={skipStep} disabled={saving}>Skip this step</Button>
            )}
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={skipSetup} disabled={saving} className={styles.mutedLink}>
                {saving ? 'Saving' : 'Skip setup'}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
