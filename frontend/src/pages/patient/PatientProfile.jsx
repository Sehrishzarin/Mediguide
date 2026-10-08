import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import { TextField, SelectField, TagInput, MedicationsEditor, TreatmentsEditor } from './profile/FormKit';
import ReportsSection from './profile/ReportsSection';
import AccountSection from './profile/AccountSection';
import {
  BLOOD_GROUPS, GENDERS, PREGNANCY_OPTIONS, LIMITS,
  draftFromUser, payloadFromDraft, validateDraft, isDirty, completeness, todayISO
} from './profile/profileModel';
import styles from './PatientProfile.module.css';

const SECTIONS = [
  { id: 'personal', label: 'Personal info' },
  { id: 'medical', label: 'Medical profile' },
  { id: 'emergency', label: 'Emergency contact' },
  { id: 'reports', label: 'Test reports' },
  { id: 'account', label: 'Account & security' }
];

const initialsOf = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

function Section({ id, title, description, active, children }) {
  return (
    <section id={`section-${id}`} className={`${styles.card} ${active ? styles.sectionActive : styles.sectionHidden}`} aria-labelledby={`h-${id}`}>
      <div className={styles.cardHead}>
        <h2 id={`h-${id}`} className={styles.cardTitle}>{title}</h2>
        {description && <p className={styles.cardDesc}>{description}</p>}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

export default function PatientProfile() {
  const { user, updateProfile } = useAuth();
  const baseline = useMemo(() => draftFromUser(user), [user]);
  const [draft, setDraft] = useState(baseline);
  const [active, setActive] = useState('personal');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [today] = useState(todayISO);
  const savedTimer = useRef(null);

  const dirty = isDirty(draft, baseline);
  const errors = validateDraft(draft);
  const errCount = Object.keys(errors).length;
  const meter = useMemo(() => completeness(user), [user]);

  // Warn before closing the tab with unsaved edits
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const set = (patch) => {
    setSaved(false);
    setSaveError('');
    setDraft((d) => ({ ...d, ...patch }));
  };
  const err = (key) => (showErrors ? errors[key] : undefined);

  const save = async () => {
    if (errCount) {
      setShowErrors(true);
      setSaveError('Please fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateProfile(payloadFromDraft(draft));
      setDraft(draftFromUser(updated));
      setShowErrors(false);
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 4000);
    } catch (e) {
      setSaveError(e.message || 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(baseline);
    setShowErrors(false);
    setSaveError('');
  };

  if (!user) return null;

  const missingHint = meter.missing.length
    ? `Add: ${meter.missing.slice(0, 3).join(', ')}${meter.missing.length > 3 ? ` and ${meter.missing.length - 3} more` : ''}`
    : 'Your profile is complete.';

  return (
    <div className={styles.page}>
      <header className={`${styles.card} ${styles.header}`}>
        <div className={styles.avatar} aria-hidden="true">{initialsOf(user.name)}</div>
        <div className={styles.headerInfo}>
          <h1 className={styles.name}>{user.name}</h1>
          <p className={styles.email}>{user.email}</p>
          <p className={styles.emailNote}>Your email can&apos;t be changed.</p>
        </div>
        <div className={styles.meter}>
          <div className={styles.meterTop}>
            <span className={styles.meterLabel}>Profile completeness</span>
            <span className={styles.meterValue}>{meter.percent}%</span>
          </div>
          <div className={styles.meterTrack} role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={meter.percent}>
            <div className={styles.meterFill} style={{ width: `${meter.percent}%` }} />
          </div>
          <p className={styles.meterHint}>{missingHint}</p>
        </div>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="Profile sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.navItem} ${active === s.id ? styles.navActive : ''}`}
              aria-current={active === s.id ? 'true' : undefined}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          <Section id="personal" title="Personal info" active={active === 'personal'}>
            <div className={styles.grid}>
              <TextField label="Full name" autoComplete="name" value={draft.name} onChange={(v) => set({ name: v })} maxLength={LIMITS.name} error={err('name')} />
              <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(v) => set({ phone: v })} placeholder="+1 555 123 4567" error={err('phone')} />
              <TextField label="Date of birth" type="date" autoComplete="bday" value={draft.dateOfBirth} onChange={(v) => set({ dateOfBirth: v })} min="1900-01-01" max={today} error={err('dateOfBirth')} />
              <TextField className={styles.spanAll} label="Address" autoComplete="street-address" value={draft.address} onChange={(v) => set({ address: v })} maxLength={LIMITS.address} placeholder="Street, city" error={err('address')} />
            </div>
          </Section>

          <Section id="medical" title="Medical profile" description="Shared with you in emergencies and used to tailor health guidance." active={active === 'medical'}>
            <div className={styles.stack}>
              <div className={styles.grid}>
                <SelectField label="Blood group" value={draft.bloodGroup} onChange={(v) => set({ bloodGroup: v })} options={BLOOD_GROUPS} placeholder="Not set" />
                <SelectField label="Gender" value={draft.gender} onChange={(v) => set({ gender: v })} options={GENDERS} placeholder="Not set" />
                {draft.gender === 'Female' && (
                  <SelectField label="Pregnancy status" value={draft.pregnancyStatus} onChange={(v) => set({ pregnancyStatus: v || 'N/A' })} options={PREGNANCY_OPTIONS} placeholder="N/A" />
                )}
                <TextField label="Height" suffix="cm" inputMode="decimal" autoComplete="off" value={draft.height} onChange={(v) => set({ height: v })} placeholder="170" error={err('height')} />
                <TextField label="Weight" suffix="kg" inputMode="decimal" autoComplete="off" value={draft.weight} onChange={(v) => set({ weight: v })} placeholder="65" error={err('weight')} />
              </div>
              <TagInput label="Allergies" items={draft.allergies} onChange={(v) => set({ allergies: v })} placeholder="e.g. Penicillin" hint="Press Enter or Add after each one." />
              <TagInput label="Existing conditions" items={draft.preExistingConditions} onChange={(v) => set({ preExistingConditions: v })} placeholder="e.g. Asthma" />
              <MedicationsEditor rows={draft.currentMedications} onChange={(v) => set({ currentMedications: v })} error={err('currentMedications')} />
              <TreatmentsEditor rows={draft.longTermTreatments} onChange={(v) => set({ longTermTreatments: v })} error={err('longTermTreatments')} />
              <TextField
                as="textarea"
                rows={4}
                label="Notes"
                value={draft.notes}
                onChange={(v) => set({ notes: v })}
                maxLength={LIMITS.notes}
                placeholder="Anything else a doctor should know"
                hint={`${draft.notes.length}/${LIMITS.notes}`}
                error={err('notes')}
              />
            </div>
          </Section>

          <Section id="emergency" title="Emergency contact" description="Someone we can show first when you need urgent help." active={active === 'emergency'}>
            <div className={styles.grid}>
              <TextField label="Contact name" autoComplete="off" value={draft.ecName} onChange={(v) => set({ ecName: v })} maxLength={LIMITS.name} error={err('ecName')} />
              <TextField label="Relationship" autoComplete="off" value={draft.ecRelationship} onChange={(v) => set({ ecRelationship: v })} maxLength={LIMITS.relationship} placeholder="e.g. Sister" error={err('ecRelationship')} />
              <TextField label="Contact phone" type="tel" inputMode="tel" autoComplete="off" value={draft.ecPhone} onChange={(v) => set({ ecPhone: v })} error={err('ecPhone')} />
            </div>
          </Section>

          <Section id="reports" title="Test reports" description="PDF, PNG, JPG or WEBP, up to 2 MB each." active={active === 'reports'}>
            <ReportsSection />
          </Section>

          <Section id="account" title="Account & security" active={active === 'account'}>
            <AccountSection />
          </Section>

          {(dirty || saved) && (
            <div className={styles.saveSpacer} aria-hidden="true" />
          )}
          {(dirty || saved) && (
            <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
              <p className={`${styles.saveMsg} ${saveError ? styles.saveMsgError : ''} ${saved ? styles.saveMsgOk : ''}`} role={saveError ? 'alert' : 'status'}>
                {saveError || (saved ? 'Changes saved.' : 'You have unsaved changes.')}
              </p>
              {dirty && (
                <div className={styles.saveActions}>
                  <button type="button" className={styles.discardBtn} onClick={discard} disabled={saving}>Discard</button>
                  <button type="button" className={styles.saveBtn} onClick={save} disabled={saving}>
                    {saving ? <><Spinner size="sm" /> Saving…</> : 'Save changes'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
