import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAppointments } from '../../services/api';
import { slotToDate, formatSlotDate, formatSlotTime } from './slotTime';
import styles from './PatientHome.module.css';

// Leaflet is heavy: keep it out of the first paint
const HospitalMap = lazy(() => import('../../components/HospitalMap'));

const ACTIONS = [
  {
    label: 'AI Health Consultation',
    description: 'Describe symptoms and get guidance on where to go',
    badgeBg: '#E0F2FE',
    iconColor: '#0F9C8E',
    path: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z',
    to: '/patient/triage?new=true'
  },
  {
    label: 'Book a Doctor Session',
    description: 'Browse real open sessions and book in seconds',
    badgeBg: '#FEF3C7',
    iconColor: '#D97706',
    path: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    to: '/patient/slots'
  },
  {
    label: 'Emergency Help',
    description: 'Call 1122, share your location, find the nearest hospital',
    badgeBg: '#FEE2E2',
    iconColor: '#E53E3E',
    path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
    to: '/patient/emergency'
  }
];

function readRecentChats(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`mediguide_ai_chats:${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => c && c.id).slice(0, 3) : [];
  } catch {
    return [];
  }
}

function missingProfileFields(profile) {
  const p = profile || {};
  const missing = [];
  if (!p.bloodGroup) missing.push('blood group');
  if (!p.allergies || p.allergies.length === 0) missing.push('allergies');
  if (!p.emergencyContact?.phone) missing.push('emergency contact');
  return missing;
}

function MapSkeleton() {
  return (
    <div className={styles.mapSkeleton} aria-busy="true" aria-label="Loading map">
      <div className={`skeleton-box ${styles.mapSkeletonMap}`} />
      <div className={`skeleton-box ${styles.mapSkeletonRow}`} />
      <div className={`skeleton-box ${styles.mapSkeletonRow}`} />
    </div>
  );
}

function NextAppointment() {
  const [state, setState] = useState({ status: 'loading', next: null, error: '' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyAppointments()
      .then((res) => {
        if (cancelled) return;
        const now = new Date();
        const upcoming = (res.data || []).find((a) => slotToDate(a.date, a.time) >= now) || null;
        setState({ status: 'ready', next: upcoming, error: '' });
      })
      .catch((err) => { if (!cancelled) setState({ status: 'error', next: null, error: err.message }); });
    return () => { cancelled = true; };
  }, [nonce]);

  const retry = () => { setState({ status: 'loading', next: null, error: '' }); setNonce((n) => n + 1); };

  if (state.status === 'loading') {
    return <div className={`skeleton-box ${styles.apptSkeleton}`} aria-busy="true" aria-label="Loading appointment" />;
  }

  if (state.status === 'error') {
    return (
      <div className={styles.apptCard}>
        <div className={styles.apptBody}>
          <span className={styles.apptLabel}>Next appointment</span>
          <p className={styles.apptError} role="alert">{state.error}</p>
        </div>
        <button type="button" className={styles.apptBtn} onClick={retry}>Retry</button>
      </div>
    );
  }

  const { next } = state;
  if (!next) {
    return (
      <div className={styles.apptCard}>
        <div className={styles.apptBody}>
          <span className={styles.apptLabel}>Next appointment</span>
          <p className={styles.apptTitle}>Nothing booked yet</p>
          <p className={styles.apptMeta}>Find a doctor session that suits you.</p>
        </div>
        <Link to="/patient/slots" className={styles.apptBtn}>Book now</Link>
      </div>
    );
  }

  return (
    <Link to="/patient/appointments" className={styles.apptCard}>
      <div className={styles.apptDate} aria-hidden="true">
        <span>{formatSlotDate(next.date, { month: 'short' })}</span>
        <strong>{formatSlotDate(next.date, { day: 'numeric' })}</strong>
      </div>
      <div className={styles.apptBody}>
        <span className={styles.apptLabel}>Next appointment</span>
        <p className={styles.apptTitle}>{next.doctor}</p>
        <p className={styles.apptMeta}>
          {next.specialty} · {formatSlotDate(next.date)} at {formatSlotTime(next.date, next.time)}
        </p>
        <p className={styles.apptMeta}>{next.org}</p>
      </div>
      <span className={styles.apptChevron} aria-hidden="true">&rsaquo;</span>
    </Link>
  );
}

function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentChats] = useState(() => readRecentChats(user?.id));

  const handleSelectBooking = useCallback((org) => {
    navigate('/patient/slots', { state: { orgName: org.name } });
  }, [navigate]);

  const profile = user?.medicalProfile;
  const missing = missingProfileFields(profile);
  const firstName = user?.name ? user.name.split(' ')[0] : '';

  return (
    <div className={styles.container}>
      <div className={styles.portalGrid}>
        <div className={styles.portalMainCol}>
          <div className={styles.heroPanel}>
            <span className={styles.welcomePill}>Welcome back</span>
            <h1 className={styles.heroTitle}>Hello{firstName ? `, ${firstName}` : ''}</h1>
            <p className={styles.heroSubtitle}>Your AI-guided health triage and emergency navigation hub.</p>
          </div>

          <NextAppointment />

          {missing.length > 0 && (
            <Link to="/patient/profile" className={styles.nudge}>
              <div className={styles.nudgeText}>
                <strong>Complete your medical profile</strong>
                <span>Add your {missing.join(', ')} so doctors and responders have what they need.</span>
              </div>
              <span className={styles.nudgeCta}>Update &rarr;</span>
            </Link>
          )}

          <div className={styles.actionsList}>
            {ACTIONS.map((action) => (
              <Link key={action.label} to={action.to} className={styles.elevatedCard}>
                <div className={styles.cardLeftBadge} style={{ background: action.badgeBg, color: action.iconColor }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.path} />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{action.label}</h3>
                  <p className={styles.cardDesc}>{action.description}</p>
                </div>
                <span className={styles.cardChevron} aria-hidden="true">&rsaquo;</span>
              </Link>
            ))}
            <Link to="/patient/appointments" className={styles.linkRow}>View all my appointments &rarr;</Link>
          </div>

          <div className={styles.recentConsultationsCard}>
            <div className={styles.recentHeaderRow}>
              <h3 className={styles.recentTitle}>Recent AI consultations</h3>
              <Link to="/patient/triage?new=true" className={styles.btnStartNewLink}>+ Start new</Link>
            </div>

            {recentChats.length === 0 ? (
              <p className={styles.emptyRecentText}>No consultations yet. Describe how you feel and get guidance in a minute.</p>
            ) : (
              <div className={styles.recentList}>
                {recentChats.map((chat) => (
                  <Link key={chat.id} to={`/patient/triage?session=${encodeURIComponent(chat.id)}`} className={styles.recentItem}>
                    <div className={styles.recentItemBody}>
                      <strong className={styles.recentItemTitle}>{chat.title || 'Consultation'}</strong>
                      <span className={styles.recentItemMeta}>
                        {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ''} · {chat.messages?.length || 0} messages
                      </span>
                    </div>
                    <span className={styles.resumeArrow}>Resume &rarr;</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.portalSideCol}>
          <div className={styles.mapPortalWrapper}>
            <Suspense fallback={<MapSkeleton />}>
              <HospitalMap onSelectBooking={handleSelectBooking} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientHome;
