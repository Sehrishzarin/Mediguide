import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, HeartPulse, Phone, FileText, ShieldCheck, ChevronLeft, LogOut, CheckCircle2, AlertCircle, BellRing } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Button, Card, List, ListItem, ProgressBar } from '../../components/ui';
import friendlyError from '../../utils/friendlyError';
import { TextField, SelectField, TagInput, MedicationsEditor, TreatmentsEditor } from './profile/FormKit';
import ReportsSection from './profile/ReportsSection';
import AccountSection from './profile/AccountSection';
import {
  BLOOD_GROUPS, GENDERS, PREGNANCY_OPTIONS, LIMITS,
  draftFromUser, payloadFromDraft, validateDraft, isDirty, completeness, todayISO
} from './profile/profileModel';
import styles from './PatientProfile.module.css';

const SECTIONS = [
  { id: 'personal', label: 'Personal info', hint: 'Name, phone, date of birth, address', icon: User },
  { id: 'medical', label: 'Medical profile', hint: 'Blood group, allergies, medications', icon: HeartPulse },
  { id: 'emergency', label: 'Emergency contact', hint: 'Who to call when you need help', icon: Phone },
  { id: 'reports', label: 'Test reports', hint: 'Lab results and prescriptions', icon: FileText },
  { id: 'account', label: 'Account', hint: 'Password, log out, delete account', icon: ShieldCheck }
];

// Which form fields live in which section (to flag sections with errors)
const SECTION_FIELDS = {
  personal: ['name', 'phone', 'dateOfBirth', 'address'],
  medical: ['height', 'weight', 'currentMedications', 'longTermTreatments', 'notes'],
  emergency: ['ecName', 'ecRelationship', 'ecPhone']
};

function Section({ id, title, description, current, onBack, children }) {
  return (
    <Card as="section" padding="none" id={`section-${id}`} className={`${styles.section} ${current ? '' : styles.hidden}`} aria-labelledby={`h-${id}`}>
      <div className={styles.sectionHead}>
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onBack} className={styles.backBtn}>All settings</Button>
        <h2 id={`h-${id}`} className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.sectionDesc}>{description}</p>}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </Card>
  );
}

export default function PatientProfile() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const baseline = useMemo(() => draftFromUser(user), [user]);
  const [draft, setDraft] = useState(baseline);
  // null = mobile settings index; desktop always shows a section (personal by default)
  const [active, setActive] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [today] = useState(todayISO);
  const savedTimer = useRef(null);
  const topRef = useRef(null);

  const dirty = isDirty(draft, baseline);
  const errors = validateDraft(draft);
  const errCount = Object.keys(errors).length;
  const meter = useMemo(() => completeness(user), [user]);
  const current = active || 'personal';

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
  const sectionHasErrors = (id) => showErrors && (SECTION_FIELDS[id] || []).some((f) => errors[f]);

  // Small screens show the index OR one section: bring whichever is shown into view
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!window.matchMedia('(max-width: 899px)').matches) return;
    if (active) topRef.current?.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }, [active]);

  const open = (id) => setActive(id);
  const backToIndex = () => setActive(null);

  const save = async () => {
    if (errCount) {
      setShowErrors(true);
      setSaveError('Please fix the highlighted fields before saving.');
      const bad = Object.keys(SECTION_FIELDS).find((id) => SECTION_FIELDS[id].some((f) => errors[f]));
      if (bad && bad !== current) setActive(bad);
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
      setSaveError(friendlyError(e, 'We could not save your changes. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(baseline);
    setShowErrors(false);
    setSaveError('');
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const missingHint = meter.missing.length
    ? `Still missing: ${meter.missing.slice(0, 3).join(', ').toLowerCase()}${meter.missing.length > 3 ? ` and ${meter.missing.length - 3} more` : ''}.`
    : 'Your profile is complete.';

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Profile and settings</h1>
      </header>

      <Card className={styles.profileCard}>
        <div className={styles.identity}>
          <Avatar name={user.name} size={56} />
          <div className={styles.identityText}>
            <p className={styles.name}>{user.name}</p>
            <p className={styles.email}>{user.email}</p>
          </div>
        </div>
        <div className={styles.meter}>
          <div className={styles.meterTop}>
            <span className={styles.meterLabel}>Profile completeness</span>
            <span className={styles.meterValue}>{meter.percent}%</span>
          </div>
          <ProgressBar value={meter.percent} label="Profile completeness" />
          <p className={styles.meterHint}>
            {meter.missing.length === 0 && <CheckCircle2 size={14} aria-hidden="true" className={styles.meterOk} />}
            {missingHint}
          </p>
        </div>
      </Card>

      <div className={`${styles.layout} ${active ? styles.hasActive : ''}`} ref={topRef}>
        {/* Mobile: settings index */}
        <div className={styles.index}>
          <List>
            {SECTIONS.map((s) => (
              <ListItem
                key={s.id}
                icon={s.icon}
                iconTone={s.id === 'account' ? 'neutral' : 'brand'}
                title={s.label}
                subtitle={s.hint}
                meta={sectionHasErrors(s.id) ? <span className={styles.errDot}>Needs attention</span> : undefined}
                onClick={() => open(s.id)}
              />
            ))}
          </List>
          <Button variant="secondary" size="lg" block icon={LogOut} onClick={signOut} className={styles.indexLogout}>Log out</Button>
        </div>

        {/* Desktop: side navigation */}
        <nav className={styles.sideNav} aria-label="Profile sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.navItem} ${current === s.id ? styles.navActive : ''}`}
              aria-current={current === s.id ? 'true' : undefined}
              onClick={() => setActive(s.id)}
            >
              <s.icon size={18} aria-hidden="true" />
              <span>{s.label}</span>
              {sectionHasErrors(s.id) && <AlertCircle size={16} className={styles.navErr} aria-label="Has errors" />}
            </button>
          ))}
          <div className={styles.navDivider} />
          <button type="button" className={`${styles.navItem} ${styles.navLogout}`} onClick={signOut}>
            <LogOut size={18} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </nav>

        <div className={styles.content}>
          <Section id="personal" title="Personal info" current={current === 'personal'} onBack={backToIndex}>
            <div className={styles.grid}>
              <TextField label="Full name" autoComplete="name" value={draft.name} onChange={(v) => set({ name: v })} maxLength={LIMITS.name} error={err('name')} />
              <TextField label="Email" value={user.email} onChange={() => {}} disabled hint="Your email can't be changed." />
              <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(v) => set({ phone: v })} placeholder="+1 555 123 4567" error={err('phone')} />
              <TextField label="Date of birth" type="date" autoComplete="bday" value={draft.dateOfBirth} onChange={(v) => set({ dateOfBirth: v })} min="1900-01-01" max={today} error={err('dateOfBirth')} />
              <TextField className={styles.spanAll} label="Address" autoComplete="street-address" value={draft.address} onChange={(v) => set({ address: v })} maxLength={LIMITS.address} placeholder="Street, city" error={err('address')} />
            </div>
          </Section>

          <Section id="medical" title="Medical profile" description="Used to tailor Nura's guidance and shown on your emergency screen." current={current === 'medical'} onBack={backToIndex}>
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
                optional
                value={draft.notes}
                onChange={(v) => set({ notes: v })}
                maxLength={LIMITS.notes}
                placeholder="Anything else a doctor should know"
                hint={`${draft.notes.length}/${LIMITS.notes}`}
                error={err('notes')}
              />
            </div>
          </Section>

          <Section id="emergency" title="Emergency contact" description="Someone we show first when you need urgent help." current={current === 'emergency'} onBack={backToIndex}>
            <div className={styles.grid}>
              <TextField label="Contact name" autoComplete="off" value={draft.ecName} onChange={(v) => set({ ecName: v })} maxLength={LIMITS.name} error={err('ecName')} />
              <TextField label="Relationship" autoComplete="off" value={draft.ecRelationship} onChange={(v) => set({ ecRelationship: v })} maxLength={LIMITS.relationship} placeholder="e.g. Sister" error={err('ecRelationship')} />
              <TextField label="Contact phone" type="tel" inputMode="tel" autoComplete="off" value={draft.ecPhone} onChange={(v) => set({ ecPhone: v })} error={err('ecPhone')} />
            </div>
            <List className={styles.checkinLink}>
              <ListItem
                icon={BellRing}
                title="Nura Check-In contacts"
                subtitle="People Nura alerts if you miss a check-in (up to 3)"
                to="/patient/monitoring/setup"
              />
            </List>
          </Section>

          <Section id="reports" title="Test reports" description="PDF, PNG, JPG or WEBP, up to 2 MB each. Only you can see them." current={current === 'reports'} onBack={backToIndex}>
            <ReportsSection />
          </Section>

          <Section id="account" title="Account" current={current === 'account'} onBack={backToIndex}>
            <AccountSection onLogout={signOut} />
          </Section>

        </div>
      </div>

      {(dirty || saved) && (
        <div className={styles.saveBar} role="region" aria-label="Unsaved changes">
          <p className={`${styles.saveMsg} ${saveError ? styles.saveMsgError : ''} ${saved && !dirty ? styles.saveMsgOk : ''}`} role={saveError ? 'alert' : 'status'}>
            {saved && !dirty && !saveError && <CheckCircle2 size={16} aria-hidden="true" />}
            {saveError || (saved && !dirty ? 'Changes saved.' : 'You have unsaved changes.')}
          </p>
          {dirty && (
            <div className={styles.saveActions}>
              <Button variant="secondary" onClick={discard} disabled={saving}>Discard</Button>
              <Button onClick={save} loading={saving}>{saving ? 'Saving' : 'Save changes'}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
