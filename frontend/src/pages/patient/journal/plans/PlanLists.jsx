// Bullet lists shared by the setup form and plan detail.
import { Check, AlertTriangle } from 'lucide-react';
import s from './Plans.module.css';

export function TrackList({ fields }) {
  return (
    <ul className={s.bullets}>
      {fields.map((f) => (
        <li key={f.id}>
          <Check size={16} aria-hidden="true" />
          <span>{f.label}{f.unit ? ` (${f.unit})` : ''}{f.optional ? ' (optional)' : ''}{f.fromWeek ? ` · from week ${f.fromWeek}` : ''}</span>
        </li>
      ))}
    </ul>
  );
}

export function DangerList({ signs }) {
  return (
    <ul className={`${s.bullets} ${s.warnList}`}>
      {signs.map((d) => (
        <li key={d}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{d}</span>
        </li>
      ))}
    </ul>
  );
}
