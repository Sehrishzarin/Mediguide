// Result of Nura's guided symptom assessment: what to do, why, and where to go.
import { Siren, TriangleAlert, CalendarClock, HeartPulse, Phone, Navigation, CalendarPlus, Building2, Check, Pill, ChevronDown, BellRing } from 'lucide-react';
import { Button, Alert } from '../../../components/ui';
import { mapsDirectionsUrl, formatDistance } from '../../../components/geo';
import { reasonFromSummary } from '../monitoring/format';
import s from './SummaryCard.module.css';

const LEVEL = {
  emergency: { icon: Siren, cls: s.emergency, label: 'Emergency' },
  urgent: { icon: TriangleAlert, cls: s.urgent, label: 'Urgent' },
  soon: { icon: CalendarClock, cls: s.soon, label: 'See a doctor' },
  home: { icon: HeartPulse, cls: s.home, label: 'Home care' }
};

const slotLabel = (slot) => {
  const d = new Date(`${slot.date}T${slot.time || '00:00'}`);
  if (Number.isNaN(d.getTime())) return [slot.date, slot.time].filter(Boolean).join(' ');
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return `${day}, ${time}`;
};

export default function SummaryCard({ summary, category, onBookSlot, onEmergency }) {
  const lv = LEVEL[summary.level] || LEVEL.soon;
  const Icon = lv.icon;
  const { nearest, nextSlot } = summary;
  const directions = nearest ? mapsDirectionsUrl(nearest) : null;
  const distance = nearest ? formatDistance(nearest.distanceKm) : '';
  const isEmergency = summary.level === 'emergency';

  return (
    <section className={`${s.card} ${lv.cls}`} aria-label={`Assessment result: ${summary.title || lv.label}`} role={isEmergency ? 'alert' : undefined}>
      <header className={s.head}>
        <span className={s.headIcon}><Icon size={20} aria-hidden="true" /></span>
        <div className={s.headText}>
          <p className={s.kicker}>{lv.label}</p>
          <h3 className={s.title}>{summary.title}</h3>
        </div>
      </header>

      <div className={s.body}>
        {summary.message && <p className={s.message}>{summary.message}</p>}

        {isEmergency && (
          <div className={s.actions}>
            <Button variant="danger" icon={Phone} href="tel:1122">Call 1122</Button>
            <Button variant="secondary" icon={Siren} onClick={onEmergency}>Emergency help</Button>
          </div>
        )}

        {summary.reasons.length > 0 && (
          <div className={s.section}>
            <p className={s.sectionTitle}>Why</p>
            <ul className={s.bullets}>
              {summary.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}

        {summary.medicineNotes.length > 0 && (
          <Alert tone="warning" icon={Pill} title="About your medicines">
            {summary.medicineNotes.map((n) => <p key={n}>{n}</p>)}
          </Alert>
        )}

        {summary.advice.length > 0 && (
          <div className={s.section}>
            <p className={s.sectionTitle}>What you can do now</p>
            <ul className={s.checks}>
              {summary.advice.map((a) => (
                <li key={a}><Check size={16} aria-hidden="true" /><span>{a}</span></li>
              ))}
            </ul>
          </div>
        )}

        {summary.warnings.length > 0 && (
          <details className={s.warnings} open={summary.level === 'home' || undefined}>
            <summary><span>Get help sooner if</span><ChevronDown size={18} aria-hidden="true" className={s.chev} /></summary>
            <ul className={s.bullets}>
              {summary.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </details>
        )}

        {nearest && (
          <div className={s.care}>
            <div className={s.careRow}>
              <span className={s.careIcon}><Building2 size={18} aria-hidden="true" /></span>
              <div className={s.careText}>
                <p className={s.careLabel}>Nearest care</p>
                <p className={s.careName}>{nearest.name}</p>
                <p className={s.careMeta}>{[nearest.type, distance && `${distance} away`].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className={s.careActions}>
              {nearest.phone && (
                <Button variant="secondary" size="sm" icon={Phone} href={`tel:${nearest.phone.replace(/[^\d+]/g, '')}`}>Call</Button>
              )}
              {directions && (
                <Button variant="secondary" size="sm" icon={Navigation} href={directions} target="_blank" rel="noopener noreferrer">Directions</Button>
              )}
            </div>
            {nextSlot && !isEmergency && (
              <div className={s.slot}>
                <p className={s.slotText}>
                  <span className={s.careLabel}>Next available</span>
                  <span className={s.slotWho}>{[nextSlot.doctor, slotLabel(nextSlot)].filter(Boolean).join(' · ')}</span>
                </p>
                <Button icon={CalendarPlus} onClick={() => onBookSlot(summary)} block>Book this session</Button>
              </div>
            )}
          </div>
        )}

        {!nearest && !isEmergency && summary.level !== 'home' && summary.specialty && (
          <Button icon={CalendarPlus} onClick={() => onBookSlot(summary)} block>Book a session</Button>
        )}

        {(summary.level === 'home' || summary.level === 'soon') && (
          <div className={s.checkin}>
            <span className={s.checkinIcon}><BellRing size={18} aria-hidden="true" /></span>
            <div className={s.checkinText}>
              <p className={s.checkinTitle}>Let Nura keep an eye on you</p>
              <p className={s.checkinSub}>Nura checks in on a schedule and reaches someone you trust if you don't answer.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              to="/patient/monitoring/setup"
              state={{ reason: reasonFromSummary({ ...summary, category }), from: 'symptom-check' }}
              className={s.checkinBtn}
            >
              Set up check-ins
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
