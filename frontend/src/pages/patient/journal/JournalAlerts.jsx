// Health alerts from the journal (plan danger signs and multi-day trends).
// emergency → danger with Call 1122 and Ask Nura; urgent → warning with Ask Nura; warning → info.
import { Siren, AlertTriangle, Info, Phone, MessageCircle } from 'lucide-react';
import { Alert, Button } from '../../../components/ui';
import { nuraLink } from './journalModel';
import s from './Journal.module.css';

const ORDER = { emergency: 0, urgent: 1, warning: 2 };

export default function JournalAlerts({ alerts, className }) {
  if (!alerts?.length) return null;
  const sorted = [...alerts].sort((a, b) => (ORDER[a.level] ?? 3) - (ORDER[b.level] ?? 3));
  return (
    <div className={`${s.alerts} ${className || ''}`}>
      {sorted.map((a, i) => {
        const tone = a.level === 'emergency' ? 'danger' : a.level === 'urgent' ? 'warning' : 'info';
        const icon = a.level === 'emergency' ? Siren : a.level === 'urgent' ? AlertTriangle : Info;
        return (
          <Alert key={`${a.title}-${i}`} tone={tone} icon={icon} title={a.title}>
            <p>{a.message}</p>
            {a.level !== 'warning' && (
              <div className={s.alertActions}>
                {a.level === 'emergency' && (
                  <Button variant="danger" size="sm" icon={Phone} href="tel:1122">Call 1122</Button>
                )}
                <Button variant="secondary" size="sm" icon={MessageCircle} to={nuraLink(a)}>Ask Nura</Button>
              </div>
            )}
          </Alert>
        );
      })}
    </div>
  );
}
