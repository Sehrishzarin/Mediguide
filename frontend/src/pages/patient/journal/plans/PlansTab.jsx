// "Plans" tab of the Journal hub: active care plans, "Start a plan" and past plans.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, List, ListItem, ProgressBar, Skeleton } from '../../../../components/ui';
import { useAuth } from '../../../../context/AuthContext';
import { usePlans, loadPlans } from './plansStore';
import { planIcon, shortProgress, lowImmunity, notStarted, formatDate, toIso, overdueCount } from './planFormat';
import TimingBadge from './TimingBadge';
import { PlanIcon } from './Icons';
import s from './Plans.module.css';

function PlanCard({ plan }) {
  const next = plan.nextMilestone;
  const p = plan.progress || {};
  return (
    <Card as={Link} to={`/patient/journal/plans/${plan.id}`} interactive className={s.planCard}>
      <div className={s.row}>
        <span className={s.iconTile}><PlanIcon type={plan.type} /></span>
        <div className={s.grow}>
          <p className={s.planTitle}>{plan.title}</p>
          <p className={s.planSub}>{notStarted(plan) ? shortProgress(plan) : p.label}</p>
        </div>
        <ChevronRight size={18} className={s.chev} aria-hidden="true" />
      </div>
      {!notStarted(plan) && <ProgressBar value={p.percent || 0} label={`${plan.title} progress`} />}
      {(lowImmunity(plan) || overdueCount(plan) > 0) && (
        <div className={s.wrapRow}>
          {lowImmunity(plan) && <Badge tone="danger" icon={AlertTriangle}>Low-immunity days</Badge>}
          {overdueCount(plan) > 0 && <Badge tone="warning">{overdueCount(plan)} overdue</Badge>}
        </div>
      )}
      <div className={s.nextRow}>
        {next ? (
          <>
            <span>Next:</span>
            <strong className={s.grow}>{next.title}</strong>
            <TimingBadge ms={next} />
          </>
        ) : (
          <span>No upcoming check-ups</span>
        )}
      </div>
    </Card>
  );
}

function PlansSkeleton() {
  return (
    <div className={s.stack} aria-busy="true" aria-label="Loading care plans">
      <Skeleton height={168} radius="var(--r-lg)" />
      <Skeleton height={168} radius="var(--r-lg)" />
    </div>
  );
}

export default function PlansTab() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const { status, plans, error } = usePlans(userId);
  const [showPast, setShowPast] = useState(false);

  if (status === 'idle' || status === 'loading') return <PlansSkeleton />;
  if (status === 'error') return <ErrorState message={error} onRetry={() => loadPlans(userId, { force: true })} />;

  const active = plans.filter((p) => p.status === 'active');
  const past = plans.filter((p) => p.status !== 'active');

  if (plans.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardList}
          title="Care plans"
          text="Follow a long-term condition with a timeline of check-ups and daily tracking."
          action={<Button icon={Plus} to="/patient/journal/plans/new">Start a plan</Button>}
        />
      </Card>
    );
  }

  return (
    <div className={s.stack}>
      {active.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={ClipboardList}
            title="No active plans"
            text="Start a plan to follow a condition with check-ups and daily tracking."
            action={<Button icon={Plus} to="/patient/journal/plans/new">Start a plan</Button>}
          />
        </Card>
      ) : (
        <>
          {active.map((p) => <PlanCard key={p.id} plan={p} />)}
          <Button variant="secondary" icon={Plus} to="/patient/journal/plans/new" className={s.alignStart}>Start another plan</Button>
        </>
      )}

      {past.length > 0 && (
        <div className={s.section}>
          <button
            type="button"
            className={`${s.disclosure} ${showPast ? s.disclosureOpen : ''}`}
            aria-expanded={showPast}
            aria-controls="past-plans"
            onClick={() => setShowPast((v) => !v)}
          >
            <span>Past plans ({past.length})</span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {showPast && (
            <div id="past-plans">
              <List>
                {past.map((p) => (
                  <ListItem
                    key={p.id}
                    icon={planIcon(p.type)}
                    iconTone="neutral"
                    title={p.title}
                    subtitle={`${formatDate(p.startDate, { year: true })} to ${p.endedAt ? formatDate(toIso(new Date(p.endedAt)), { year: true }) : 'now'}`}
                    meta={<Badge tone={p.status === 'completed' ? 'success' : 'neutral'}>{p.status === 'completed' ? 'Completed' : 'Stopped'}</Badge>}
                    to={`/patient/journal/plans/${p.id}`}
                  />
                ))}
              </List>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
