// Small label that marks anything simulated (SMS, calls, demo speed). Never colour without text.
import { FlaskConical } from 'lucide-react';
import { Badge } from '../../../components/ui';

export default function DemoBadge({ children = 'Demo', className }) {
  return <Badge tone="info" icon={FlaskConical} className={className}>{children}</Badge>;
}
