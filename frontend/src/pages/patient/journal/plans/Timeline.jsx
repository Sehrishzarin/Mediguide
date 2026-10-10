// Plan timeline: milestones grouped Overdue / Coming up / Later / Done, each with
// mark done, change date and (for ones the patient added) remove.
import { useState } from 'react';
import { Check, CalendarClock, Trash2, ChevronDown, Info } from 'lucide-react';
import { Alert, Button, Input } from '../../../../components/ui';
import friendlyError from '../../../../utils/friendlyError';
import { setMilestone, removeMilestone } from './plansStore';
import { kindLabel, formatDate, passed, isOverdue } from './planFormat';
import TimingBadge from './TimingBadge';
import { KindIcon } from './Icons';
import s from './Plans.module.css';

const LATER_PREVIEW = 4;
// The server also flags rescheduled template milestones as `custom`; only ones the patient added can be removed
const addedByPatient = (ms) => ms.custom && String(ms.key || '').startsWith('custom_');

function MilestoneRow({ planId, ms, readOnly }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(ms.dueDate);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (what, fn, fallback) => {
    setBusy(what);
    setError('');
    try {
      await fn();
      return true;
    } catch (err) {
      setError(friendlyError(err, fallback));
      return false;
    } finally {
      setBusy('');
    }
  };

  const toggleDone = () => run('done', () => setMilestone(planId, ms.id, { done: !ms.done }), "We couldn't update this. Please try again.");
  const saveDate = async () => {
    if (!date || date === ms.dueDate) { setEditing(false); return; }
    if (await run('date', () => setMilestone(planId, ms.id, { dueDate: date }), "We couldn't change the date. Please try again.")) setEditing(false);
  };
  const remove = () => run('delete', () => removeMilestone(planId, ms.id), "We couldn't remove this. Please try again.");

  const cls = [s.tlItem, ms.done && s.tlDone, !readOnly && isOverdue(ms) && s.tlOverdue].filter(Boolean).join(' ');
  return (
    <li className={cls}>
      <button
        type="button"
        className={s.tlCheck}
        role="checkbox"
        aria-checked={ms.done}
        aria-label={`${ms.title}: ${ms.done ? 'done' : 'not done'}`}
        onClick={toggleDone}
        disabled={readOnly || Boolean(busy)}
      >
        <span className={s.tlBox} aria-hidden="true">{ms.done && <Check size={16} strokeWidth={3} />}</span>
      </button>
      <div className={s.tlBody}>
        <div className={s.tlHead}>
          <p className={s.tlTitle}>{ms.title}</p>
          {(!readOnly || ms.done) && <TimingBadge ms={ms} />}
        </div>
        <p className={s.tlMeta}>
          <KindIcon kind={ms.kind} />
          <span>{kindLabel(ms.kind)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(ms.dueDate, { weekday: true })}</span>
          {addedByPatient(ms) && <><span aria-hidden="true">·</span><span>Added by you</span></>}
        </p>
        {open && ms.description && <p className={s.tlDesc}>{ms.description}</p>}

        {editing && (
          <div className={s.dateEdit}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={`New date for ${ms.title}`} />
            <Button size="sm" onClick={saveDate} loading={busy === 'date'}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDate(ms.dueDate); }} disabled={busy === 'date'}>Cancel</Button>
          </div>
        )}
        {confirmDelete && (
          <div className={s.dateEdit}>
            <span className={s.muted}>Remove this from your timeline?</span>
            <Button size="sm" variant="dangerSoft" onClick={remove} loading={busy === 'delete'}>Remove</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy === 'delete'}>Keep</Button>
          </div>
        )}

        {(ms.description || (!readOnly && !editing && !confirmDelete)) && (
          <div className={s.tlActions}>
            {ms.description && (
              <Button size="sm" variant="ghost" icon={ChevronDown} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? 'Hide details' : 'Details'}
              </Button>
            )}
            {!readOnly && !editing && !confirmDelete && !ms.done && (
              <Button size="sm" variant="ghost" icon={CalendarClock} onClick={() => { setDate(ms.dueDate); setEditing(true); }}>Change date</Button>
            )}
            {!readOnly && !editing && !confirmDelete && addedByPatient(ms) && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>Remove</Button>
            )}
          </div>
        )}
        {error && <Alert tone="danger" icon={Info}>{error}</Alert>}
      </div>
    </li>
  );
}

function Group({ title, items, planId, readOnly, collapsible, defaultOpen = true, preview = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  const [all, setAll] = useState(false);
  if (items.length === 0) return null;
  const shown = preview && !all ? items.slice(0, preview) : items;
  return (
    <div>
      {collapsible ? (
        <button
          type="button"
          className={`${s.disclosure} ${open ? s.disclosureOpen : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={s.groupTitle}>{title} ({items.length})</span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      ) : (
        <h3 className={s.groupTitle}>{title} ({items.length})</h3>
      )}
      {open && (
        <>
          <ol className={s.timeline}>
            {shown.map((ms) => <MilestoneRow key={`${ms.id}:${ms.dueDate}`} planId={planId} ms={ms} readOnly={readOnly} />)}
          </ol>
          {shown.length < items.length && (
            <Button variant="ghost" size="sm" icon={ChevronDown} onClick={() => setAll(true)}>
              Show {items.length - shown.length} more
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function Timeline({ plan }) {
  const readOnly = plan.status !== 'active';
  const overdue = [];
  const soon = [];
  const later = [];
  const done = [];
  plan.milestones.forEach((ms) => {
    if (ms.done || passed(ms)) done.push(ms);
    else if (isOverdue(ms)) overdue.push(ms);
    else if (ms.daysAway <= 30) soon.push(ms);
    else later.push(ms);
  });
  if (plan.milestones.length === 0) return <p className={s.muted}>No check-ups on this plan yet.</p>;
  // Past plans: one neutral list by date, nothing labelled overdue
  if (readOnly) return <Group title="Check-ups and milestones" items={plan.milestones} planId={plan.id} readOnly />;
  return (
    <div className={s.stack}>
      {!readOnly && overdue.length > 0 && (
        <p className={s.muted}>Already had some of these? Tick them off. If not, change the date or ask your doctor when to book them.</p>
      )}
      <Group title="Overdue" items={overdue} planId={plan.id} readOnly={readOnly} />
      <Group title="Coming up" items={soon} planId={plan.id} readOnly={readOnly} />
      {!readOnly && overdue.length + soon.length === 0 && <p className={s.muted}>Nothing in the next 30 days.</p>}
      <Group title="Later" items={later} planId={plan.id} readOnly={readOnly} preview={LATER_PREVIEW} />
      <Group title="Done and past" items={[...done].reverse()} planId={plan.id} readOnly={readOnly} collapsible defaultOpen={readOnly} />
    </div>
  );
}
