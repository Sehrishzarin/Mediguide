import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, MapPin, Siren, CalendarClock, ClipboardList, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyAppointments } from '../../services/api';
import { Card, SectionHeader, List, ListItem, Alert, Button, Skeleton } from '../../components/ui';
import Nura from '../../components/nura/Nura';
import { loadSessions } from './chatStorage';
import { useMonitoring } from './monitoring/monitoringStore';
import CheckInHomeCard from './monitoring/CheckInHomeCard';
import TodayCard from './journal/TodayCard';
import PlanHomeCard from './journal/plans/PlanHomeCard';
import { slotToDate, formatSlotDate, formatSlotTime } from './care/slotTime';
import { friendlyError } from './care/errors';
import styles from './PatientHome.module.css';

const SUGGESTIONS = [
  'I have a headache and fever',
  'Which doctor should I see for a rash?',
  'Is my chest pain urgent?'
];

const QUICK_ACTIONS = [
  { to: '/patient/care/book', label: 'Book a doctor', icon: CalendarPlus, tone: 'brand' },
  { to: '/patient/care/nearby', label: 'Nearby care', icon: MapPin, tone: 'brand' },
  { to: '/patient/emergency', label: 'Emergency', icon: Siren, tone: 'danger' }
];

const greetingFor = (date) => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const relativeTime = (iso, now) => {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t) || t <= 0) return '';
  const mins = Math.round((now.getTime() - t) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

function missingProfileFields(profile) {
  const p = profile || {};
  const missing = [];
  if (!p.bloodGroup) missing.push('blood group');
  if (!p.allergies || p.allergies.length === 0) missing.push('allergies');
  if (!p.emergencyContact?.phone) missing.push('emergency contact');
  return missing;
}

const joinWords = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

// ── Nura hero card ──────────────────────────────────────────────────────
function NuraCard({ className }) {
  return (
    <Card as="section" padding="none" className={`${styles.nuraCard} ${className}`} aria-labelledby="ask-nura-h">
      <div className={styles.nuraHead}>
        <Nura size={56} mood="idle" />
        <div>
          <h2 id="ask-nura-h" className={styles.nuraTitle}>Ask Nura</h2>
          <p className={styles.nuraText}>Tell Nura how you feel and get clear next steps.</p>
        </div>
      </div>
      <Link to="/patient/nura/new" className={styles.fakeInput}>
        <span className={styles.fakeInputText}>
          <span className={styles.longText}>Describe a symptom or ask a health question</span>
          <span className={styles.shortText}>Describe a symptom or ask a question</span>
        </span>
        <span className={styles.fakeInputIcon} aria-hidden="true"><ArrowRight size={18} /></span>
      </Link>
      <div className={styles.suggestions} aria-label="Suggested questions">
        {SUGGESTIONS.map((q) => (
          <Link key={q} to={`/patient/nura/new?q=${encodeURIComponent(q)}`} className={styles.suggestion}>{q}</Link>
        ))}
      </div>
    </Card>
  );
}

// ── Next appointment ────────────────────────────────────────────────────
function NextAppointment({ className }) {
  const [state, setState] = useState({ status: 'loading', next: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyAppointments()
      .then((res) => {
        if (cancelled) return;
        const now = new Date();
        const next = (res.data || [])
          .map((a) => ({ a, t: slotToDate(a.date, a.time) }))
          .filter((x) => x.t >= now)
          .sort((x, y) => x.t - y.t)[0]?.a || null;
        setState({ status: 'ready', next });
      })
      .catch((err) => { if (!cancelled) setState({ status: 'error', next: null, error: friendlyError(err, "Couldn't load appointments") }); });
    return () => { cancelled = true; };
  }, [nonce]);

  const retry = () => { setState({ status: 'loading', next: null }); setNonce((n) => n + 1); };
  const { status, next } = state;

  return (
    <section className={className} aria-labelledby="next-appt-h">
      <SectionHeader
        title={<span id="next-appt-h">Next appointment</span>}
        action={<Link to="/patient/care/appointments" className={styles.textLink}>View all</Link>}
      />
      {status === 'loading' && (
        <Card padding="md" className={styles.apptSkeleton} aria-busy="true" aria-label="Loading appointment">
          <Skeleton width={44} height={44} radius="var(--r-md)" />
          <div className={styles.apptSkeletonText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="85%" height={12} />
          </div>
        </Card>
      )}
      {status === 'error' && (
        <List>
          <div className={styles.inlineError} role="alert">
            <span>{state.error}</span>
            <Button variant="ghost" size="sm" onClick={retry}>Retry</Button>
          </div>
        </List>
      )}
      {status === 'ready' && !next && (
        <List>
          <ListItem
            icon={CalendarClock}
            iconTone="neutral"
            title="No upcoming appointments"
            subtitle="Book a doctor"
            to="/patient/care/book"
          />
        </List>
      )}
      {status === 'ready' && next && (
        <List>
          <ListItem
            to="/patient/care/appointments"
            leading={
              <span className={styles.dateTile} aria-hidden="true">
                <span>{formatSlotDate(next.date, { month: 'short' })}</span>
                <strong>{formatSlotDate(next.date, { day: 'numeric' })}</strong>
              </span>
            }
            title={next.doctor}
            subtitle={
              <>
                <span className={styles.apptLine}>{next.specialty} · {next.org}</span>
                <span className={styles.apptLine}>{formatSlotDate(next.date, { weekday: 'long', day: 'numeric', month: 'short' })} at {formatSlotTime(next.date, next.time)}</span>
              </>
            }
          />
        </List>
      )}
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────
function PatientHome() {
  const { user } = useAuth();
  // Captured once per visit: keeps render pure while greeting and relative times stay correct
  const [now] = useState(() => new Date());
  const [sessions] = useState(() => (user?.id ? loadSessions(user.id) : []));

  const greeting = useMemo(() => greetingFor(now), [now]);
  const today = useMemo(() => now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }), [now]);
  const recent = useMemo(
    () => [...sessions]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 3),
    [sessions]
  );

  const monitoring = useMonitoring(user?.id);
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : '';
  const missing = missingProfileFields(user?.medicalProfile);

  return (
    <div className={styles.page}>
      <header className={styles.greeting}>
        <h1 className={styles.greetingTitle}>{greeting}{firstName ? `, ${firstName}` : ''}</h1>
        <p className={styles.greetingDate}>{today}</p>
      </header>

      <div className={styles.grid}>
        <NuraCard className={styles.areaNura} />

        <div className={styles.side}>
          <CheckInHomeCard
            monitoring={monitoring.data}
            status={monitoring.status}
            className={monitoring.data ? styles.areaCheckinActive : styles.areaCheckin}
          />
          <TodayCard compact className={styles.areaToday} />
          <div className={styles.areaPlan}><PlanHomeCard /></div>
          <NextAppointment className={styles.areaAppt} />

          {missing.length > 0 && (
            <Alert
              tone="info"
              icon={ClipboardList}
              title="Complete your medical profile"
              className={styles.areaNudge}
              action={<Button variant="ghost" size="sm" to="/patient/profile">Update</Button>}
            >
              Add your {joinWords(missing)} so doctors and responders have what they need.
            </Alert>
          )}
        </div>

        <section className={styles.areaActions} aria-labelledby="quick-h">
          <h2 id="quick-h" className="sr-only">Quick actions</h2>
          <div className={styles.tiles}>
            {QUICK_ACTIONS.map(({ to, label, icon: Icon, tone }) => (
              <Card key={to} as={Link} to={to} padding="sm" interactive className={styles.tile}>
                <span className={`${styles.tileIcon} ${tone === 'danger' ? styles.tileIconDanger : ''}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className={styles.tileLabel}>{label}</span>
              </Card>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <section className={styles.areaRecent} aria-labelledby="recent-h">
            <SectionHeader
              title={<span id="recent-h">Recent conversations</span>}
              action={<Link to="/patient/nura" className={styles.textLink}>See all</Link>}
            />
            <List>
              {recent.map((chat) => (
                <ListItem
                  key={chat.id}
                  to={`/patient/nura/${encodeURIComponent(chat.id)}`}
                  leading={<span className={styles.chatAvatar}><Nura size={36} still /></span>}
                  title={chat.title || 'Conversation'}
                  meta={relativeTime(chat.updatedAt || chat.createdAt, now)}
                />
              ))}
            </List>
          </section>
        )}
      </div>
    </div>
  );
}

export default PatientHome;
