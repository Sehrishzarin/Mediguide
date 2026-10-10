// Sticky attention banner under the top bar while a check-in needs the patient.
import { Link } from 'react-router-dom';
import { ChevronRight, BellRing, Siren } from 'lucide-react';
import { monitoringView } from './format';
import s from './MonitoringBanner.module.css';

export default function MonitoringBanner({ monitoring, className }) {
  const view = monitoring ? monitoringView(monitoring) : 'status';
  if (view === 'status') return null;
  const open = monitoring.openCheckIn;

  let text = 'Nura: How are you feeling? Tap to answer';
  let danger = false;
  if (view === 'escalation') {
    danger = !open.acknowledgedBy;
    text = open.acknowledgedBy
      ? `${open.acknowledgedBy} confirmed they reached you. Tap to close the check-in`
      : "Nura hasn't heard from you. Tap to answer";
  } else if (view === 'helpSent') {
    danger = true;
    text = 'You asked for help. Tap for help options';
  }
  const Icon = danger ? Siren : BellRing;

  return (
    <Link to="/patient/monitoring" className={`${s.banner} ${danger ? s.danger : ''} ${className || ''}`} role="status">
      <Icon size={18} aria-hidden="true" className={s.icon} />
      <span className={s.text}>{text}</span>
      <ChevronRight size={18} aria-hidden="true" className={s.icon} />
    </Link>
  );
}
