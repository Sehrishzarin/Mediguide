// Home: compact rows for up to two active care plans. Renders nothing when there are none
// (and nothing while loading, so Home stays calm).
import { AlertTriangle } from 'lucide-react';
import { Badge, List, ListItem } from '../../../../components/ui';
import { useAuth } from '../../../../context/AuthContext';
import { usePlans } from './plansStore';
import s from './Plans.module.css';
import { planIcon, shortProgress, lowImmunity, relativeDays, overdueCount } from './planFormat';

// Lead with what's next; overdue items are mentioned after it so Home stays calm
const nextLine = (plan) => {
  const ms = plan.nextMilestone;
  const parts = [ms ? `${ms.title} · ${relativeDays(ms.daysAway)}` : 'No upcoming check-ups'];
  if (overdueCount(plan) > 0) parts.push(`${overdueCount(plan)} overdue`);
  return parts.join(' · ');
};

export default function PlanHomeCard() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const { status, plans } = usePlans(userId);
  if (status !== 'ready') return null;
  const active = plans.filter((p) => p.status === 'active').slice(0, 2);
  if (active.length === 0) return null;

  return (
    <section aria-label="Care plans">
      <List>
        {active.map((p) => (
          <ListItem
            key={p.id}
            icon={planIcon(p.type)}
            title={(
              <span className={s.homeTitleRow}>
                <span>{p.title} · {shortProgress(p)}</span>
                {lowImmunity(p) && <Badge tone="danger" icon={AlertTriangle}>Low-immunity days</Badge>}
              </span>
            )}
            subtitle={nextLine(p)}
            to={`/patient/journal/plans/${p.id}`}
          />
        ))}
      </List>
    </section>
  );
}
