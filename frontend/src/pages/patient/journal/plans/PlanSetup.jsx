// /patient/journal/plans/new/:type: set the start date (and chemo cycles), then start the plan.
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ListChecks, Info } from 'lucide-react';
import {
  Alert, Button, Card, ErrorState, Field, Input, PageHeader, Segmented, Select, Skeleton, Switch
} from '../../../../components/ui';
import friendlyError from '../../../../utils/friendlyError';
import { useAuth } from '../../../../context/AuthContext';
import { useTemplates, loadTemplates, createPlan, usePlans } from './plansStore';
import { addDaysIso, daysBetween, formatDate, todayIso } from './planFormat';
import { TrackList, DangerList } from './PlanLists';
import { PlanIcon } from './Icons';
import s from './Plans.module.css';

// What the patient will see before saving
function previewText(type, { lmp, cycles, cycleDays, startDate, today }) {
  if (type === 'pregnancy') {
    if (!lmp) return '';
    const days = daysBetween(lmp, today);
    if (days < 0) return 'That date is in the future.';
    if (days > 43 * 7) return 'That date is more than 43 weeks ago. Please check it.';
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    return `You're about ${weeks} week${weeks === 1 ? '' : 's'}${rem ? ` and ${rem} day${rem === 1 ? '' : 's'}` : ''} pregnant · due ${formatDate(addDaysIso(lmp, 280), { year: true })}`;
  }
  if (!startDate) return '';
  if (type === 'chemo') {
    return `${cycles} cycle${cycles === 1 ? '' : 's'} of ${cycleDays} days · last cycle ends around ${formatDate(addDaysIso(startDate, cycles * cycleDays - 1), { year: true })}`;
  }
  if (type === 'tb') return `Treatment usually finishes around ${formatDate(addDaysIso(startDate, 182), { year: true })}`;
  return '';
}

export default function PlanSetup() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { status, data, error: loadError } = useTemplates();
  const { user, refreshUser } = useAuth();
  usePlans(user?.id || user?._id); // primes the shared cache so the new plan shows straight away
  const [today] = useState(() => todayIso());
  const [startDate, setStartDate] = useState(() => (type === 'pregnancy' ? '' : todayIso()));
  const [useDue, setUseDue] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [settings, setSettings] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  if (status === 'error') {
    return (
      <div className={s.page}>
        <PageHeader title="Start a care plan" back="/patient/journal/plans/new" />
        <ErrorState message={loadError} onRetry={loadTemplates} />
      </div>
    );
  }
  if (status !== 'ready') {
    return (
      <div className={s.page} aria-busy="true" aria-label="Loading plan">
        <PageHeader title="Start a care plan" back="/patient/journal/plans/new" />
        <Skeleton height={120} radius="var(--r-lg)" />
        <Skeleton height={180} radius="var(--r-lg)" />
      </div>
    );
  }

  const tpl = data.find((t) => t.type === type);
  if (!tpl) return <Navigate to="/patient/journal/plans/new" replace />;
  const isPreg = tpl.type === 'pregnancy';
  const settingValue = (id) => {
    const def = tpl.settings.find((x) => x.id === id);
    return settings[id] ?? def?.default;
  };
  const cycleDays = Number(settingValue('cycleDays')) || 21;
  const cycles = Number(settingValue('cycles')) || 6;
  const lmp = isPreg ? (useDue && tpl.altStart ? (dueDate ? addDaysIso(dueDate, -280) : '') : startDate) : '';
  const preview = previewText(tpl.type, { lmp, cycles, cycleDays, startDate, today });

  // Limits match the server's checks
  const startMin = isPreg ? addDaysIso(today, -43 * 7) : addDaysIso(today, -3 * 365);
  const startMax = isPreg ? today : addDaysIso(today, 90);
  const dueMin = addDaysIso(today, -21);
  const dueMax = addDaysIso(today, 280);

  const dateValue = isPreg && useDue ? dueDate : startDate;
  const missing = !dateValue;
  const cyclesInvalid = tpl.type === 'chemo' && (!Number.isInteger(cycles) || cycles < 1 || cycles > 12);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (missing || cyclesInvalid) return;
    setBusy(true);
    setError('');
    const payload = { type: tpl.type };
    if (isPreg && useDue) payload.dueDate = dueDate;
    else payload.startDate = startDate;
    if (tpl.type === 'chemo') payload.settings = { cycleDays, cycles };
    try {
      const plan = await createPlan(payload);
      // Starting a pregnancy plan updates the profile's pregnancy status on the server
      if (plan.type === 'pregnancy') refreshUser();
      navigate(`/patient/journal/plans/${plan.id}`, { replace: true });
    } catch (err) {
      setError(friendlyError(err, "We couldn't start the plan. Please try again."));
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <PageHeader title={tpl.title} subtitle={tpl.summary} back="/patient/journal/plans/new" />

      <form className={s.form} onSubmit={submit} noValidate>
        <Card className={s.stack}>
          <div className={s.row}>
            <span className={s.iconTile}><PlanIcon type={tpl.type} /></span>
            <p className={`${s.muted} ${s.grow}`}>{tpl.note}</p>
          </div>

          {isPreg && tpl.altStart && (
            <Switch
              checked={useDue}
              onChange={(v) => { setUseDue(v); setTouched(false); }}
              label="I know my due date"
              description="Use the due date from your scan or doctor instead."
            />
          )}

          {isPreg && useDue ? (
            <Field label="Due date" htmlFor="plan-due" error={touched && missing ? 'Please choose your due date.' : ''}>
              <Input id="plan-due" type="date" value={dueDate} min={dueMin} max={dueMax} onChange={(e) => setDueDate(e.target.value)} invalid={touched && missing} />
            </Field>
          ) : (
            <Field
              label={tpl.startLabel}
              htmlFor="plan-start"
              hint={isPreg ? 'Your due date is worked out from this (40 weeks).' : 'You can pick a date in the past if you have already started.'}
              error={touched && missing ? 'Please choose a date.' : ''}
            >
              <Input id="plan-start" type="date" value={startDate} min={startMin} max={startMax} onChange={(e) => setStartDate(e.target.value)} invalid={touched && missing} />
            </Field>
          )}

          {tpl.settings.length > 0 && (
            <div className={s.twoCol}>
              {tpl.settings.map((st) => (st.type === 'choice' ? (
                <Field key={st.id} label={st.label}>
                  <Segmented
                    label={st.label}
                    options={st.options.map((o) => ({ value: o.value, label: o.label }))}
                    value={settingValue(st.id)}
                    onChange={(v) => setSettings((prev) => ({ ...prev, [st.id]: v }))}
                  />
                </Field>
              ) : (
                <Field key={st.id} label={st.label} htmlFor={`plan-${st.id}`} hint={`Between ${st.min} and ${st.max}`}>
                  <Select
                    id={`plan-${st.id}`}
                    value={String(settingValue(st.id))}
                    onChange={(e) => setSettings((prev) => ({ ...prev, [st.id]: Number(e.target.value) }))}
                  >
                    {Array.from({ length: st.max - st.min + 1 }, (_, i) => st.min + i).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </Field>
              )))}
            </div>
          )}

          {preview && <p className={s.preview} aria-live="polite">{preview}</p>}
        </Card>

        <Card>
          <h2 className={s.cardTitle}><ListChecks size={18} aria-hidden="true" />What Nura will track daily</h2>
          <TrackList fields={tpl.dailyFields} />
          <p className={`${s.meta} ${s.metaTop}`}>You answer these in your journal's daily log.</p>
        </Card>

        <Card className={s.warnCard}>
          <h2 className={s.cardTitle}><AlertTriangle size={18} aria-hidden="true" />Danger signs to know</h2>
          <DangerList signs={tpl.dangerSigns} />
        </Card>

        {error && <Alert tone="danger" icon={Info}>{error}</Alert>}
        <Button type="submit" size="lg" block loading={busy}>Start plan</Button>
      </form>
    </div>
  );
}
