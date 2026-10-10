// "Today" / "In 5 days" / "Overdue" / "Done" badge for a plan milestone.
import { Badge } from '../../../../components/ui';
import { milestoneTiming } from './planFormat';

export default function TimingBadge({ ms }) {
  const t = milestoneTiming(ms);
  return <Badge tone={t.tone}>{t.text.charAt(0).toUpperCase() + t.text.slice(1)}</Badge>;
}
