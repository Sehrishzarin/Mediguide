import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatient } from './PatientContext';
import HospitalMap from '../../components/HospitalMap';
import styles from './PatientHome.module.css';

const ACTIONS = [
  {
    label: 'AI Health Consultation',
    description: 'Describe symptoms & get clinical hospital advice',
    icon: (
      <svg className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    colorClass: styles.actionTeal,
    to: '/patient/triage',
  },
  {
    label: 'Book Specialist Session',
    description: 'Browse available slots & schedule appointment',
    icon: (
      <svg className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    colorClass: styles.actionBlue,
    to: '/patient/slots',
  },
  {
    label: 'Emergency Route',
    description: 'Instant 911 dispatch & emergency facilities map',
    icon: (
      <svg className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    colorClass: styles.actionRed,
    to: '/patient/emergency',
  },
];

function PatientHome() {
  const { user } = usePatient();
  const navigate = useNavigate();
  const [recentChats, setRecentChats] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mediguide_ai_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentChats(parsed.slice(0, 3));
      }
    } catch {
      setRecentChats([]);
    }
  }, []);

  const handleSelectBooking = (org) => {
    navigate('/patient/slots', { state: { specialty: org.type || 'General Physician', orgName: org.name } });
  };

  return (
    <div className={styles.container}>
      <div className={styles.greeting}>
        <h1 className={styles.heading}>
          {user?.name ? `Hello, ${user.name}` : 'Welcome back'}
        </h1>
        <p className={styles.subtext}>Your AI-guided health triage & emergency navigation hub.</p>
      </div>

      <div className={styles.actions}>
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`${styles.actionCard} ${action.colorClass}`}
          >
            <div>{action.icon}</div>
            <div>
              <p className={styles.actionLabel}>{action.label}</p>
              <p className={styles.actionDesc}>{action.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* DUAL SOURCE HEALTHCARE MAP DIRECTLY ON FRONT SCREEN */}
      <div style={{ marginTop: '1.5rem' }}>
        <HospitalMap onSelectBooking={handleSelectBooking} />
      </div>

      {/* Recent Consultation Chats Section right on front screen */}
      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>💬 Recent AI Consultations</h3>
          <Link to="/patient/triage" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0d9488', textDecoration: 'none' }}>+ Start New</Link>
        </div>

        {recentChats.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>No recent consultations yet. Click above to describe any symptoms!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate('/patient/triage')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>💬 {chat.title}</strong>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{new Date(chat.createdAt).toLocaleDateString()} • {chat.messages?.length || 0} messages</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0d9488' }}>Resume &rarr;</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientHome;
