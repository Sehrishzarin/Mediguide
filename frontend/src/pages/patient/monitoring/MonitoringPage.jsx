// /patient/monitoring: picks the right Nura Check-In screen for the current state.
//   no session -> setup | open check-in -> prompt (or escalation once the loud step ran)
//   "Need help" pressed -> help options | just answered -> what happens next | otherwise -> status hub
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ErrorState, PageHeader, Skeleton } from '../../../components/ui';
import { useMonitoring, useFastMonitoringPoll, refreshMonitoring } from './monitoringStore';
import { monitoringView } from './format';
import { useBack } from './hooks';
import CheckInPrompt from './CheckInPrompt';
import EscalationView from './EscalationView';
import StatusHub from './StatusHub';
import { AnswerDone, HelpSent } from './AnswerOutcome';
import s from './Monitoring.module.css';

function LoadingView() {
  return (
    <div className={s.stack} aria-busy="true" aria-label="Loading Nura Check-In">
      <Skeleton height={72} width={72} radius="var(--r-full)" />
      <Skeleton height={28} width="80%" />
      <Skeleton height={16} width="60%" />
      <Skeleton height={160} radius="var(--r-lg)" />
    </div>
  );
}

export default function MonitoringPage() {
  const { user } = useAuth();
  const mon = useMonitoring(user?.id);
  useFastMonitoringPoll();
  const back = useBack('/patient/home');
  // Preview of the escalation plan, tied to the check-in it was opened for
  const [previewFor, setPreviewFor] = useState('');

  const { data, status, recent } = mon;

  if (!data && status === 'error') {
    return (
      <div className={s.page}>
        <PageHeader title="Nura Check-In" onBack={back} />
        <ErrorState message={mon.error} onRetry={refreshMonitoring} />
      </div>
    );
  }
  if (!data && status !== 'ready') {
    return (
      <div className={s.page}>
        <PageHeader title="Nura Check-In" onBack={back} />
        <LoadingView />
      </div>
    );
  }
  if (!data) return <Navigate to="/patient/monitoring/setup" replace />;

  const view = monitoringView(data);
  let body;
  if (view === 'prompt' && previewFor === data.openCheckIn.id) {
    body = <EscalationView monitoring={data} preview onBack={() => setPreviewFor('')} />;
  } else if (view === 'prompt') {
    body = <CheckInPrompt monitoring={data} userName={user?.name} onPreview={() => setPreviewFor(data.openCheckIn.id)} />;
  } else if (view === 'escalation') {
    body = <EscalationView monitoring={data} />;
  } else if (view === 'helpSent') {
    body = <HelpSent monitoring={data} />;
  } else if (recent && recent.answer !== 'help') {
    body = <AnswerDone monitoring={data} recent={recent} />;
  } else {
    body = <StatusHub monitoring={data} />;
  }

  return (
    <div className={s.page}>
      <PageHeader title="Nura Check-In" onBack={back} />
      <div key={view} className="animate-fade-in">{body}</div>
    </div>
  );
}
