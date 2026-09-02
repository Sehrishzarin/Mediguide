import { Link } from 'react-router-dom';
import { usePatient } from './PatientContext';
import styles from './PatientHome.module.css';

const ACTIONS = [
  {
    label: 'Seek consultation',
    description: 'Describe symptoms and get matched to a specialist',
    icon: (
      <svg className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    colorClass: styles.actionTeal,
    to: '/patient/triage',
  },
  {
    label: 'Book a session',
    description: 'Browse available slots and book an appointment',
    icon: (
      <svg className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    colorClass: styles.actionBlue,
    to: '/patient/slots',
  },
  {
    label: 'Emergency',
    description: 'Request an ambulance or find emergency contacts',
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

  return (
    <div className={styles.container}>
      <div className={styles.greeting}>
        <h1 className={styles.heading}>
          {user?.name ? `Hello, ${user.name}` : 'Hello'}
        </h1>
        <p className={styles.subtext}>What are you looking for today?</p>
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
    </div>
  );
}

export default PatientHome;
