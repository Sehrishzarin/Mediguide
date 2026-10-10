// Daily log editor for /patient/journal/log/:date — mood, energy, pain, temperature,
// symptoms, period (when cycle tracking is on), care plan questions and notes.
import { useEffect, useId, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Plus, Trash2, Thermometer, CalendarX2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getJournalEntries } from '../../../services/api';
import friendlyError from '../../../utils/friendlyError';
import {
  Alert, Button, Card, Chip, ChipRow, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton, Textarea
} from '../../../components/ui';
import { useBack } from '../monitoring/hooks';
import { useCycle, useJournalToday, useLoad, cycleFlags, saveEntry, removeEntry } from './journalStore';
import { isValidIso, daysBetween, relativeDay, formatShort } from './dates';
import { ENERGY, PAIN, SYMPTOMS, FLOWS, FEVER_C, cToF, entryBody } from './journalModel';
import { MoodPicker } from './MoodFaces';
import JournalAlerts from './JournalAlerts';
import s from './Journal.module.css';

const cx = (...p) => p.filter(Boolean).join(' ');
const CALENDAR = '/patient/journal/calendar';

// 5–6 labelled buttons in a row (energy, pain). Tapping the selected one clears it.
function ScaleButtons({ options, value, onChange, label }) {
  return (
    <div className={s.scale} role="radiogroup" aria-label={label} style={{ '--cols': options.length }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cx(s.scaleBtn, value === o.value && s.scaleBtnOn)}
          onClick={() => onChange(value === o.value ? null : o.value)}
        >
          <span className={s.scaleNum}>{o.value}</span>
          <span className={s.scaleLabel}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ title, hint, children }) {
  const id = useId();
  return (
    <Card as="section" aria-labelledby={id} className={s.logSection}>
      <div className={s.logSectionHead}>
        <h2 id={id} className={s.cardTitle}>{title}</h2>
        {hint && <p className={s.cardText}>{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

// ── Plan questions ─────────────────────────────────────────────────────────
function PlanField({ field, value, onChange }) {
  const id = useId();
  if (field.type === 'choice') {
    return (
      <Field label={field.label} optional={field.optional}>
        <ChipRow wrap>
          {field.options.map((o) => (
            <Chip key={String(o.value)} selected={value === o.value} onClick={() => onChange(value === o.value ? undefined : o.value)}>{o.label}</Chip>
          ))}
        </ChipRow>
      </Field>
    );
  }
  if (field.type === 'boolean') {
    return (
      <Field label={field.label} optional={field.optional}>
        <ChipRow wrap>
          <Chip selected={value === true} icon={value === true ? Check : undefined} onClick={() => onChange(value === true ? undefined : true)}>Yes</Chip>
          <Chip selected={value === false} onClick={() => onChange(value === false ? undefined : false)}>No</Chip>
        </ChipRow>
      </Field>
    );
  }
  if (field.type === 'multi') {
    const list = Array.isArray(value) ? value : [];
    const toggle = (v) => onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    return (
      <Field label={field.label} optional={field.optional} hint="Choose any that apply.">
        <ChipRow wrap>
          {field.options.map((o) => (
            <Chip key={String(o.value)} selected={list.includes(o.value)} onClick={() => toggle(o.value)}>{o.label}</Chip>
          ))}
        </ChipRow>
      </Field>
    );
  }
  // number
  const str = value === undefined || value === null ? '' : String(value);
  const n = Number(str);
  const bad = str !== '' && (!Number.isFinite(n) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max));
  return (
    <Field
      label={field.label}
      optional={field.optional}
      htmlFor={id}
      error={bad ? `Enter a value between ${field.min} and ${field.max}${field.unit ? ` ${field.unit}` : ''}.` : undefined}
    >
      <div className={s.unitInput}>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step || 'any'}
          value={str}
          invalid={bad}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        />
        {field.unit && <span className={s.unit}>{field.unit}</span>}
      </div>
    </Field>
  );
}

const planFieldInvalid = (f, v) => {
  if (f.type !== 'number' || v === undefined || v === null || v === '') return false;
  const n = Number(v);
  return !Number.isFinite(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max);
};

// ── Editor form (mounted once data is ready, keyed by date) ─────────────────
const draftFrom = (e) => ({
  mood: e?.mood ?? null,
  energy: e?.energy ?? null,
  pain: e?.pain ?? null,
  temperature: typeof e?.temperature === 'number' ? String(e.temperature) : '',
  symptoms: e?.symptoms || [],
  notes: e?.notes || '',
  flow: e?.period?.flow || 'none',
  planFields: e?.planFields || {}
});

function EditorForm({ date, today, entry, planGroups, cycleActive, initialMood }) {
  const navigate = useNavigate();
  const back = useBack(CALENDAR);
  const baseline = useMemo(() => draftFrom(entry), [entry]);
  const [draft, setDraft] = useState(() => ({ ...baseline, mood: initialMood || baseline.mood }));
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // alerts returned after saving
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const customId = useId();
  const tempId = useId();

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const set = (patch) => { setError(''); setDraft((d) => ({ ...d, ...patch })); };
  const setPlan = (id, v) => setDraft((d) => {
    const next = { ...d.planFields };
    if (v === undefined) delete next[id];
    else next[id] = v;
    return { ...d, planFields: next };
  });

  // Warn before closing the tab with unsaved edits
  useEffect(() => {
    if (!dirty || result) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, result]);

  const temp = draft.temperature.trim();
  const tempNum = Number(temp);
  const tempBad = temp !== '' && (!Number.isFinite(tempNum) || tempNum < 34 || tempNum > 43);
  const fever = temp !== '' && !tempBad && tempNum >= FEVER_C;
  const allFields = planGroups.flatMap((g) => g.fields);
  const planBad = allFields.some((f) => planFieldInvalid(f, draft.planFields[f.id]));

  const symptomOptions = [...SYMPTOMS, ...draft.symptoms.filter((x) => !SYMPTOMS.includes(x))];
  const toggleSymptom = (sym) => set({ symptoms: draft.symptoms.includes(sym) ? draft.symptoms.filter((x) => x !== sym) : [...draft.symptoms, sym] });
  const addCustom = () => {
    const v = custom.trim().slice(0, 40);
    if (!v) return;
    const exists = symptomOptions.find((x) => x.toLowerCase() === v.toLowerCase());
    if (exists) { if (!draft.symptoms.includes(exists)) toggleSymptom(exists); }
    else set({ symptoms: [...draft.symptoms, v] });
    setCustom('');
  };

  const goBack = () => {
    if (dirty && !result && !window.confirm('Leave without saving? Your changes to this day will be lost.')) return;
    back();
  };

  const save = async () => {
    if (tempBad || planBad) { setError('Please fix the highlighted fields before saving.'); return; }
    setSaving(true);
    setError('');
    const planFields = {};
    allFields.forEach((f) => {
      const v = draft.planFields[f.id];
      if (v === undefined || v === null || v === '') return;
      planFields[f.id] = f.type === 'number' ? Number(v) : v;
    });
    const body = {
      ...entryBody(entry || {}),
      mood: draft.mood,
      energy: draft.energy,
      pain: draft.pain,
      temperature: temp === '' ? null : Math.round(tempNum * 10) / 10,
      symptoms: draft.symptoms,
      notes: draft.notes.trim(),
      // With cycle tracking off, keep whatever was logged before
      period: cycleActive ? { flow: draft.flow } : { flow: entry?.period?.flow || 'none' },
      planFields: { ...(entry?.planFields || {}), ...planFields }
    };
    allFields.forEach((f) => { if (!(f.id in planFields)) delete body.planFields[f.id]; });
    try {
      const data = await saveEntry(date, body);
      if (data.alerts?.length) {
        setResult(data.alerts);
        window.scrollTo({ top: 0 });
      } else {
        navigate(CALENDAR, { state: { saved: true } });
      }
    } catch (err) {
      setError(friendlyError(err, "We couldn't save this day. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError('');
    try {
      await removeEntry(date);
      navigate(CALENDAR, { state: { saved: 'deleted' } });
    } catch (err) {
      setError(friendlyError(err, "We couldn't delete this entry. Please try again."));
      setDeleting(false);
    }
  };

  const title = relativeDay(date, today);
  const subtitle = title === 'Today' || title === 'Yesterday' ? formatShort(date, { weekday: 'long', month: 'long' }) : 'Daily log';

  if (result) {
    return (
      <div className={s.page}>
        <PageHeader title={title} subtitle="Saved to your journal" />
        <div className={s.stack}>
          <Alert tone="success" icon={CheckCircle2} title="Your day is saved">Please read the note below.</Alert>
          <JournalAlerts alerts={result} />
          <Button size="lg" block onClick={() => navigate(CALENDAR, { replace: true })}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <PageHeader title={title} subtitle={subtitle} onBack={goBack} />
      <div className={s.logGrid}>
        <Section title="Mood" hint="How do you feel overall?">
          <MoodPicker value={draft.mood} onChange={(m) => set({ mood: draft.mood === m ? null : m })} label="Mood" />
        </Section>

        <Section title="Energy">
          <ScaleButtons options={ENERGY} value={draft.energy} onChange={(v) => set({ energy: v })} label="Energy" />
        </Section>

        <Section title="Pain">
          <ScaleButtons options={PAIN} value={draft.pain} onChange={(v) => set({ pain: v })} label="Pain" />
        </Section>

        <Section title="Temperature">
          <Field
            label="Temperature"
            optional
            htmlFor={tempId}
            error={tempBad ? 'Enter a temperature between 34 and 43 °C.' : undefined}
            hint={temp !== '' && !tempBad ? `That is ${cToF(tempNum)} °F.` : 'In °C, for example 37.2. Normal is about 36.5 to 37.5.'}
          >
            <div className={s.unitInput}>
              <Input
                id={tempId}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="34"
                max="43"
                placeholder="37.0"
                value={draft.temperature}
                invalid={tempBad}
                onChange={(e) => set({ temperature: e.target.value })}
              />
              <span className={s.unit}>°C</span>
            </div>
          </Field>
          {fever && (
            <Alert tone="warning" icon={Thermometer} title="That's a fever">
              Rest and drink plenty of fluids. See a doctor if it lasts more than 3 days, is above 39.5 °C, or you feel very unwell.
            </Alert>
          )}
        </Section>

        <Section title="Symptoms" hint="Choose any you noticed.">
          <ChipRow wrap>
            {symptomOptions.map((sym) => (
              <Chip key={sym} selected={draft.symptoms.includes(sym)} onClick={() => toggleSymptom(sym)}>{sym}</Chip>
            ))}
          </ChipRow>
          <Field label="Add your own" htmlFor={customId}>
            <div className={s.addRow}>
              <Input
                id={customId}
                value={custom}
                maxLength={40}
                placeholder="e.g. Itchy eyes"
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              />
              <Button variant="secondary" icon={Plus} onClick={addCustom} disabled={!custom.trim()}>Add</Button>
            </div>
          </Field>
        </Section>

        {cycleActive && (
          <Section title="Period" hint="Log each day of your period to see predictions.">
            <ChipRow wrap>
              {FLOWS.map((f) => (
                <Chip key={f.value} selected={draft.flow === f.value} onClick={() => set({ flow: f.value })}>{f.label}</Chip>
              ))}
            </ChipRow>
          </Section>
        )}

        {planGroups.map((g) => (
          <Section key={g.planId} title={g.planTitle} hint="From your care plan">
            <div className={s.stack}>
              {g.fields.map((f) => (
                <PlanField key={f.id} field={f} value={draft.planFields[f.id]} onChange={(v) => setPlan(f.id, v)} />
              ))}
            </div>
          </Section>
        ))}

        <Section title="Notes">
          <Field label="Notes" optional hint={`${draft.notes.length}/1000`}>
            <Textarea rows={4} maxLength={1000} value={draft.notes} placeholder="Anything else about today" onChange={(e) => set({ notes: e.target.value })} aria-label="Notes" />
          </Field>
        </Section>

        {entry && (
          <Card className={s.deleteCard}>
            {!confirmDelete ? (
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} className={s.dangerText}>Delete entry</Button>
            ) : (
              <div className={s.confirmRow} role="group" aria-label="Confirm delete">
                <span className={s.cardText}>Delete everything logged for this day?</span>
                <div className={s.actionRow}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
                  <Button variant="danger" size="sm" icon={Trash2} onClick={remove} loading={deleting}>Delete</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      <div className={s.saveBar}>
        {error && <p className={s.saveError} role="alert">{error}</p>}
        <Button size="lg" block onClick={save} loading={saving} disabled={deleting} icon={Check}>
          {saving ? 'Saving' : entry ? 'Save changes' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ── Route component: validates the date and loads everything the form needs ─
export default function LogEditor() {
  const { date } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const todaySnap = useJournalToday(user);
  const cycleRes = useCycle(user);
  const cycle = cycleFlags(cycleRes);
  const valid = isValidIso(date);
  const entry = useLoad(
    valid ? `entry:${date}` : null,
    () => getJournalEntries(date, date).then((r) => r.data.entries.find((e) => e.date === date) || null),
    "We couldn't load this day."
  );

  if (!valid) return <Navigate to={CALENDAR} replace />;

  const failed = [todaySnap, entry, cycleRes].find((r) => r.status === 'error');
  if (failed) {
    return (
      <div className={s.page}>
        <PageHeader title="Daily log" back={CALENDAR} />
        <Card><ErrorState message={failed.error} onRetry={() => { todaySnap.retry(); cycleRes.retry(); entry.retry(); }} /></Card>
      </div>
    );
  }

  if (todaySnap.status !== 'ready' || entry.status !== 'ready' || cycleRes.status !== 'ready') {
    return (
      <div className={s.page} aria-busy="true" aria-label="Loading">
        <PageHeader title="Daily log" back={CALENDAR} />
        <div className={s.stack}>
          <Skeleton height={140} radius="var(--r-lg)" />
          <Skeleton height={110} radius="var(--r-lg)" />
          <Skeleton height={110} radius="var(--r-lg)" />
        </div>
      </div>
    );
  }

  const today = todaySnap.data.date;
  if (date > today || daysBetween(date, today) > 365) {
    return (
      <div className={s.page}>
        <PageHeader title={formatShort(date, { year: 'numeric' })} back={CALENDAR} />
        <Card>
          <EmptyState
            icon={CalendarX2}
            title={date > today ? "You can't log a day in the future" : 'You can only log days from the past year'}
            action={<Button variant="secondary" to={CALENDAR}>Back to calendar</Button>}
          />
        </Card>
      </div>
    );
  }

  const moodParam = Number(params.get('mood'));
  const initialMood = Number.isInteger(moodParam) && moodParam >= 1 && moodParam <= 5 ? moodParam : null;

  return (
    <EditorForm
      key={date}
      date={date}
      today={today}
      entry={entry.data}
      planGroups={todaySnap.data.planFields || []}
      cycleActive={cycle.active}
      initialMood={initialMood}
    />
  );
}
