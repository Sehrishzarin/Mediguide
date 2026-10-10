// /patient/journal/plans/:id: progress, timeline, today's tracking, danger signs and end plan.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, ListChecks, AlertTriangle, MessageCircle, Phone, NotebookPen, Info, SearchX } from 'lucide-react';
import {
  Alert, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, SectionHeader, Select, Skeleton
} from '../../../../components/ui';
import { useAuth } from '../../../../context/AuthContext';
import friendlyError from '../../../../utils/friendlyError';
import ConfirmSheet from '../../care/ConfirmSheet';
import { usePlans, loadPlans, addMilestone, finishPlan } from './plansStore';
import { KINDS, todayIso, addDaysIso } from './planFormat';
import { TrackList, DangerList } from './PlanLists';
import PlanHero from './PlanHero';
import Timeline from './Timeline';
import s from './Plans.module.css';

const LIST = '/patient/journal/plans';

function AddAppointment({ plan, today }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [kind, setKind] = useState('visit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  if (!open) {
    return <Button variant="secondary" icon={Plus} onClick={() => setOpen(true)} className={s.alignStart}>Add an appointment</Button>;
  }

  const reset = () => { setOpen(false); setTitle(''); setDate(''); setKind('visit'); setError(''); setTouched(false); };
  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!title.trim() || !date) return;
    setBusy(true);
    setError('');
    try {
      await addMilestone(plan.id, { title: title.trim(), dueDate: date, kind });
      reset();
    } catch (err) {
      setError(friendlyError(err, "We couldn't add the appointment. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="form" className={s.addForm} onSubmit={submit} noValidate aria-label="Add an appointment">
      <h3 className={s.planTitle}>Add an appointment</h3>
      <Field label="What is it?" htmlFor="ms-title" error={touched && !title.trim() ? 'Please add a title.' : ''}>
        <Input id="ms-title" value={title} maxLength={120} placeholder="For example, scan at City Hospital" onChange={(e) => setTitle(e.target.value)} invalid={touched && !title.trim()} />
      </Field>
      <div className={s.twoCol}>
        <Field label="Date" htmlFor="ms-date" error={touched && !date ? 'Please choose a date.' : ''}>
          <Input id="ms-date" type="date" value={date} min={addDaysIso(today, -365)} onChange={(e) => setDate(e.target.value)} invalid={touched && !date} />
        </Field>
        <Field label="Type" htmlFor="ms-kind">
          <Select id="ms-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
        </Field>
      </div>
      {error && <Alert tone="danger" icon={Info}>{error}</Alert>}
      <div className={s.formActions}>
        <Button type="submit" loading={busy}>Add to timeline</Button>
        <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
      </div>
    </Card>
  );
}

function EndPlanSheet({ plan, onClose, onDone }) {
  const { refreshUser } = useAuth();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const end = async (status) => {
    setBusy(status);
    setError('');
    try {
      await finishPlan(plan.id, status);
      // Ending a pregnancy plan resets the profile's pregnancy status on the server
      if (plan.type === 'pregnancy') refreshUser();
      onDone();
    } catch (err) {
      setError(friendlyError(err, "We couldn't end the plan. Please try again."));
      setBusy('');
    }
  };
  const isPreg = plan.type === 'pregnancy';
  return (
    <ConfirmSheet title="End this plan?" busy={Boolean(busy)} onClose={onClose} labelledBy="end-plan-title">
      <div className={s.stack}>
        <p className={s.sheetText}>
          {isPreg
            ? 'Whenever you are ready. Your timeline is kept in Past plans, and pregnancy questions stop appearing in your daily log.'
            : 'Your timeline is kept in Past plans and the daily questions stop. You can start a new plan at any time.'}
        </p>
        {error && <Alert tone="danger" icon={Info}>{error}</Alert>}
        <div className={s.sheetActions}>
          <Button block data-autofocus onClick={() => end('completed')} loading={busy === 'completed'} disabled={Boolean(busy)}>Mark as complete</Button>
          <Button block variant="secondary" onClick={() => end('stopped')} loading={busy === 'stopped'} disabled={Boolean(busy)}>Stop this plan</Button>
        </div>
      </div>
    </ConfirmSheet>
  );
}

function DetailSkeleton() {
  return (
    <div className={s.page} aria-busy="true" aria-label="Loading plan">
      <PageHeader title="Care plan" back={LIST} />
      <Skeleton height={220} radius="var(--r-lg)" />
      <Skeleton height={320} radius="var(--r-lg)" />
    </div>
  );
}

export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const { status, plans, error } = usePlans(userId, { force: true });
  const [today] = useState(() => todayIso());
  const [ending, setEnding] = useState(false);

  if (status === 'idle' || status === 'loading') return <DetailSkeleton />;
  if (status === 'error') {
    return (
      <div className={s.page}>
        <PageHeader title="Care plan" back={LIST} />
        <ErrorState message={error} onRetry={() => loadPlans(userId, { force: true })} />
      </div>
    );
  }

  const plan = plans.find((p) => p.id === id);
  if (!plan) {
    return (
      <div className={s.page}>
        <PageHeader title="Care plan" back={LIST} />
        <Card>
          <EmptyState icon={SearchX} title="Plan not found" text="It may have been removed." action={<Button to={LIST}>Back to plans</Button>} />
        </Card>
      </div>
    );
  }

  const active = plan.status === 'active';
  const question = `I'm following a ${plan.title.toLowerCase()} care plan (${plan.progress?.label || 'just started'}). What should I watch out for at this stage, and when should I get help?`;

  return (
    <div className={s.page}>
      <PageHeader title={plan.title} subtitle={active ? 'Care plan' : 'Past care plan'} back={LIST} />

      <PlanHero plan={plan} today={today} />

      <section className={s.section} aria-labelledby="timeline-title">
        <SectionHeader title={<span id="timeline-title">Timeline</span>} />
        <Card>
          <Timeline plan={plan} />
        </Card>
        {active && <AddAppointment plan={plan} today={today} />}
      </section>

      {active && plan.dailyFields.length > 0 && (
        <Card>
          <h2 className={s.cardTitle}><ListChecks size={18} aria-hidden="true" />Today's tracking</h2>
          <TrackList fields={plan.dailyFields} />
          <Button icon={NotebookPen} to={`/patient/journal/log/${today}`} className={`${s.alignStart} ${s.metaTop}`}>Log today in your journal</Button>
        </Card>
      )}

      {plan.dangerSigns.length > 0 && (
        <Card className={s.warnCard}>
          <h2 className={s.cardTitle}><AlertTriangle size={18} aria-hidden="true" />Danger signs</h2>
          <DangerList signs={plan.dangerSigns} />
          <p className={`${s.muted} ${s.metaTop}`}>If you notice any of these, get help straight away.</p>
          <div className={`${s.formActions} ${s.metaTop}`}>
            <Button variant="secondary" icon={MessageCircle} to={`/patient/nura/new?q=${encodeURIComponent(question)}`}>Ask Nura</Button>
            <Button variant="dangerSoft" icon={Phone} href="tel:1122">Call 1122</Button>
          </div>
        </Card>
      )}

      {active && (
        <div className={s.endRow}>
          <Button variant="ghost" onClick={() => setEnding(true)}>End plan</Button>
        </div>
      )}
      {ending && <EndPlanSheet plan={plan} onClose={() => setEnding(false)} onDone={() => { setEnding(false); navigate(LIST, { replace: true }); }} />}
    </div>
  );
}
