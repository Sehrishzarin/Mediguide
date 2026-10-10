// Home: Nura Check-In status (active / waiting for an answer) or a small entry row.
import { BellRing, Siren, HeartPulse } from 'lucide-react';
import { List, ListItem } from '../../../components/ui';
import { clockTime, intervalLabel, monitoringView } from './format';

export default function CheckInHomeCard({ monitoring, status, className }) {
  if (status !== 'ready') return null; // the entry row appears once we know the state
  let item;
  if (!monitoring) {
    item = (
      <ListItem
        icon={HeartPulse}
        title="Nura Check-In"
        subtitle="Let Nura check on you while you recover"
        to="/patient/monitoring/setup"
      />
    );
  } else {
    const view = monitoringView(monitoring);
    if (view === 'status') {
      item = (
        <ListItem
          icon={BellRing}
          title="Nura Check-In"
          subtitle={`Every ${intervalLabel(monitoring.intervalMin)} · next at ${clockTime(monitoring.nextCheckInAt, monitoring.demoSpeed)}`}
          to="/patient/monitoring"
        />
      );
    } else {
      const ackBy = monitoring.openCheckIn.acknowledgedBy;
      const urgent = view === 'helpSent' || (view === 'escalation' && !ackBy);
      let subtitle = 'Tap to tell Nura how you feel';
      if (view === 'helpSent') subtitle = 'You asked for help. Tap for options';
      else if (ackBy) subtitle = `${ackBy} confirmed they reached you. Tap to close the check-in`;
      item = (
        <ListItem
          icon={urgent ? Siren : BellRing}
          iconTone={urgent ? 'danger' : 'warning'}
          title="Nura is waiting for your answer"
          subtitle={subtitle}
          to="/patient/monitoring"
        />
      );
    }
  }
  return (
    <section className={className} aria-label="Nura Check-In">
      <List>{item}</List>
    </section>
  );
}
