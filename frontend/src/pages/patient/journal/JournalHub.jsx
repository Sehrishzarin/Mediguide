// Journal hub: Calendar · Cycle · Plans, driven by the :tab route.
// The Cycle tab exists only when cycle tracking is enabled (paused during pregnancy).
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader, Segmented } from '../../../components/ui';
import { useCycle, cycleFlags } from './journalStore';
import CalendarTab from './CalendarTab';
import CycleTab from './CycleTab';
import PlansTab from './plans/PlansTab';
import s from './Journal.module.css';

const TAB_LABELS = { calendar: 'Calendar', cycle: 'Cycle', plans: 'Plans' };

export default function JournalHub({ tab: fixedTab }) {
  const params = useParams();
  const tab = fixedTab || params.tab;
  const navigate = useNavigate();
  const { user } = useAuth();
  const cycle = cycleFlags(useCycle(user));

  if (!TAB_LABELS[tab]) return <Navigate to="/patient/journal/calendar" replace />;
  if (tab === 'cycle' && cycle.known && !cycle.enabled) return <Navigate to="/patient/journal/calendar" replace />;

  const tabs = ['calendar', ...(cycle.enabled || tab === 'cycle' ? ['cycle'] : []), 'plans'];

  return (
    <div className={s.page}>
      <PageHeader title="Journal" subtitle="How you feel, day by day" />
      <Segmented
        label="Journal sections"
        options={tabs.map((t) => ({ value: t, label: TAB_LABELS[t] }))}
        value={tab}
        onChange={(v) => { if (v !== tab) navigate(`/patient/journal/${v}`); }}
        className={s.tabs}
      />
      <div className={s.panel} role="tabpanel" aria-label={TAB_LABELS[tab]}>
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'cycle' && <CycleTab />}
        {tab === 'plans' && <PlansTab />}
      </div>
    </div>
  );
}
