import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatient } from './PatientContext';
import HospitalMap from '../../components/HospitalMap';
import OnboardingWizard from '../../components/OnboardingWizard';
import styles from './PatientHome.module.css';

const CATEGORY_CHIPS = [
  { label: 'All', icon: '✨', key: 'all' },
  { label: 'Symptoms', icon: '🩺', key: 'symptoms' },
  { label: 'Specialists', icon: '👨‍⚕️', key: 'specialists' },
  { label: 'Facilities', icon: '🏥', key: 'facilities' },
  { label: 'Reviews', icon: '⭐', key: 'reviews' },
];

const ACTIONS = [
  {
    label: 'AI Health Consultation',
    description: 'Describe symptoms & get clinical hospital advice',
    badgeBg: '#E0F2FE',
    iconColor: '#0F9C8E',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
    to: '/patient/triage?new=true',
  },
  {
    label: 'Book Specialist Session',
    description: 'Browse available doctor sessions & schedule appointment',
    badgeBg: '#FEF3C7',
    iconColor: '#D97706',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    to: '/patient/slots',
  },
  {
    label: 'Emergency Route',
    description: 'Instant 1122 dispatch & emergency facilities map',
    badgeBg: '#FEE2E2',
    iconColor: '#E53E3E',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    to: '/patient/emergency',
  },
];

function PatientHome() {
  const { user } = usePatient();
  const navigate = useNavigate();
  const [recentChats, setRecentChats] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Only trigger onboarding wizard when user JUST created a new account
    const justSignedUp = localStorage.getItem('mediguide_just_signed_up') === 'true';
    const onboarded = localStorage.getItem('mediguide_onboarded') === 'true';

    if (justSignedUp && !onboarded) {
      setShowOnboarding(true);
    }

    try {
      const saved = localStorage.getItem('mediguide_ai_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentChats(parsed.slice(0, 3));
      }
    } catch {
      setRecentChats([]);
    }
  }, [user]);

  const handleSelectBooking = (org) => {
    navigate('/patient/slots', { state: { specialty: org.type || 'General Physician', orgName: org.name } });
  };

  return (
    <div className={styles.container}>
      {/* Onboarding Wizard Modal if new user */}
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      <div className={styles.portalGrid}>
        {/* Main Column (Hero, Categories, Action Cards & Recent Consultations) */}
        <div className={styles.portalMainCol}>
          {/* Hero Header Banner with Primary Teal Gradient */}
          <div className={styles.heroPanel}>
            <div className={styles.heroHeaderRow}>
              <div>
                <span className={styles.welcomePill}>👋 Hello & Welcome</span>
                <h1 className={styles.heroTitle}>
                  {user?.name ? user.name : 'Patient User'}
                </h1>
                <p className={styles.heroSubtitle}>
                  Your AI-guided health triage & emergency navigation hub.
                </p>
              </div>
              <div className={styles.heroAvatarCircle}>
                <svg width="28" height="28" fill="none" stroke="#0F9C8E" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Chips Row */}
          <div className={styles.categoryScrollRow}>
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={`${styles.categoryPill} ${activeCategory === chip.key ? styles.activeCategoryPill : ''}`}
                onClick={() => setActiveCategory(chip.key)}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Action Navigation Cards */}
          <div className={styles.actionsList}>
            {ACTIONS.map((action) => (
              <Link key={action.label} to={action.to} className={styles.elevatedCard}>
                <div className={styles.cardLeftBadge} style={{ background: action.badgeBg, color: action.iconColor }}>
                  {action.icon}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{action.label}</h3>
                  <p className={styles.cardDesc}>{action.description}</p>
                </div>
                <div className={styles.cardChevron}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Consultation Chats Section */}
          <div className={styles.recentConsultationsCard}>
            <div className={styles.recentHeaderRow}>
              <h3 className={styles.recentTitle}>💬 Recent AI Consultations</h3>
              <Link to="/patient/triage?new=true" className={styles.btnStartNewLink}>+ Start New</Link>
            </div>

            {recentChats.length === 0 ? (
              <p className={styles.emptyRecentText}>No recent consultations yet. Click above to describe any symptoms!</p>
            ) : (
              <div className={styles.recentList}>
                {recentChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => navigate(`/patient/triage?session=${chat.id}`)}
                    className={styles.recentItem}
                  >
                    <div className={styles.recentItemBody}>
                      <strong className={styles.recentItemTitle}>💬 {chat.title}</strong>
                      <span className={styles.recentItemMeta}>{new Date(chat.createdAt).toLocaleDateString()} • {chat.messages?.length || 0} messages</span>
                    </div>
                    <span className={styles.resumeArrow}>Resume &rarr;</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Column (Interactive Healthcare Map & Quick Profile Overview) */}
        <div className={styles.portalSideCol}>
          <div className={styles.mapPortalWrapper}>
            <HospitalMap onSelectBooking={handleSelectBooking} />
          </div>

          <div className={styles.quickProfileWidget}>
            <div className={styles.quickProfileHeader}>
              <div className={styles.quickProfileIcon}>📋</div>
              <div>
                <h4 className={styles.quickProfileTitle}>Medical Context Active</h4>
                <p className={styles.quickProfileSub}>Evaluated during AI Triage</p>
              </div>
            </div>
            <div className={styles.quickProfileBadges}>
              <span className={styles.profileBadgeTag}>Blood: {user?.medicalProfile?.bloodGroup || user?.bloodGroup || user?.bloodType || 'O+'}</span>
              <span className={styles.profileBadgeTag}>Gender: {user?.medicalProfile?.gender || user?.gender || 'Not specified'}</span>
              <span className={styles.profileBadgeTag}>Allergies: {(user?.medicalProfile?.allergies || user?.allergies || [])?.length || 'None'}</span>
            </div>
            <Link to="/patient/profile" className={styles.btnEditProfilePortal}>Edit Health Profile &rarr;</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientHome;
