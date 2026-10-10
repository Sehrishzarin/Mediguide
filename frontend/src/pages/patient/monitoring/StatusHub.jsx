// Monitoring is on and no check-in is open: schedule, contacts, recent events, stop.
import { useState } from 'react';
import { Clock, CalendarClock, Moon, Sun, Smartphone, Settings2, Square, MapPin } from 'lucide-react';
import { Alert, Avatar, Badge, Button, Card, List, ListItem, SectionHeader } from '../../../components/ui';
import Nura from '../../../components/nura/Nura';
import friendlyError from '../../../utils/friendlyError';
import { stop } from './monitoringStore';
import { alertAfterLabel, clockTime, countdown, dateTime, intervalLabel, reasonLabel } from './format';
import { useNow } from './hooks';
import { TodaySoFar } from './CheckInPrompt';
import DemoBadge from './DemoBadge';
import s from './Monitoring.module.css';

const CONSENT_TEXT = { agreed: 'Agreed', pending: 'Waiting for reply', declined: 'Declined' };
const CONSENT_TONE = { agreed: 'success', pending: 'warning', declined: 'danger' };
const EVENTS_SHOWN = 6;

export default function StatusHub({ monitoring }) {
  const now = useNow(1000);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [allEvents, setAllEvents] = useState(false);
  const demo = monitoring.demoSpeed;
  const events = monitoring.events || [];

  const doStop = async () => {
    setBusy(true);
    setError('');
    try {
      await stop();
    } catch (err) {
      setError(friendlyError(err, "We couldn't stop monitoring. Please try again."));
      setBusy(false);
    }
  };

  return (
    <div className={s.stack}>
      <Card padding="md" className={s.statusCard}>
        <div className={s.statusHead}>
          <Nura size={56} mood="happy" />
          <div className={s.statusText}>
            <div className={s.promptBadges}>
              <Badge tone="success">Monitoring on</Badge>
              {demo && <DemoBadge>Demo speed</DemoBadge>}
            </div>
            <h1 className={s.statusTitle}>Nura is checking in every {intervalLabel(monitoring.intervalMin)}</h1>
            <p className={s.muted}>For your {reasonLabel(monitoring.reason)} · alerts after {alertAfterLabel(monitoring.alertAfterMin)} without a reply</p>
          </div>
        </div>

        <div className={s.nextBox}>
          <Clock size={20} aria-hidden="true" />
          <div>
            <p className={s.nextLabel}>Next check-in</p>
            <p className={s.nextValue}>
              {clockTime(monitoring.nextCheckInAt, demo)} <span className={s.nextIn}>({countdown(monitoring.nextCheckInAt, now, monitoring.demoSpeed)})</span>
            </p>
          </div>
        </div>

        <ul className={s.facts}>
          <li>
            <CalendarClock size={16} aria-hidden="true" />
            <span>{monitoring.endsAt ? `Ends ${dateTime(monitoring.endsAt, new Date(now))}` : 'Until you stop'}</span>
          </li>
          <li>
            {monitoring.overnight ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            <span>{monitoring.overnight ? 'Checks in overnight too' : 'No check-ins between 10 PM and 7 AM'}</span>
          </li>
          {monitoring.lastLocation && (
            <li>
              <MapPin size={16} aria-hidden="true" />
              <span>Location last updated {clockTime(monitoring.lastLocation.at, demo)} (shared only if an alert goes out)</span>
            </li>
          )}
        </ul>
      </Card>

      <section className={s.section}>
        <SectionHeader title="Contacts" action={<Button variant="ghost" size="sm" icon={Settings2} to="/patient/monitoring/setup">Manage</Button>} />
        <List>
          {monitoring.contacts.map((c) => (
            <ListItem
              key={c.id}
              to={`/patient/monitoring/contact/${c.id}`}
              leading={<Avatar name={c.name} size={40} />}
              title={c.name}
              subtitle={<Badge tone={CONSENT_TONE[c.consent] || 'neutral'}>{CONSENT_TEXT[c.consent] || c.consent}</Badge>}
              meta={<span className={s.metaIcon}><Smartphone size={14} aria-hidden="true" /> Demo phone</span>}
            />
          ))}
        </List>
      </section>

      <TodaySoFar history={monitoring.history} demo={demo} />

      <section className={s.section} aria-labelledby="events-h">
        <h2 id="events-h" className={s.sectionTitle}>Recent activity</h2>
        {events.length === 0 ? (
          <p className={s.muted}>Nothing yet.</p>
        ) : (
          <Card padding="none">
            <ul className={s.historyList}>
              {(allEvents ? events : events.slice(0, EVENTS_SHOWN)).map((e, i) => (
                <li key={`${e.at}-${i}`} className={s.eventRow}>
                  <span className={s.historyTime}>{clockTime(e.at, demo)}</span>
                  <span className={s.eventText}>{e.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {events.length > EVENTS_SHOWN && (
          <Button variant="ghost" size="sm" onClick={() => setAllEvents((v) => !v)}>{allEvents ? 'Show less' : 'Show all'}</Button>
        )}
      </section>

      {error && <Alert tone="danger">{error}</Alert>}
      {confirming ? (
        <div className={s.confirm} role="group" aria-label="Stop monitoring?">
          <span>Stop Nura Check-In? Nura won't check in or alert anyone.</span>
          <div className={s.confirmActions}>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Keep monitoring</Button>
            <Button variant="danger" onClick={doStop} loading={busy}>Stop</Button>
          </div>
        </div>
      ) : (
        <Button variant="dangerSoft" block icon={Square} onClick={() => setConfirming(true)}>Stop monitoring</Button>
      )}
      <p className={s.footer}>Nura is not an emergency service. If you feel seriously unwell, call 1122.</p>
    </div>
  );
}
