import { useLocation, Link, useNavigate } from 'react-router-dom';
import styles from './TriageResult.module.css';

const SPECIALTY_LABELS = { Emergency: 'Emergency', Dermatologist: 'Dermatologist', 'General Physician': 'General Physician', Gastroenterologist: 'Gastroenterologist', Orthopedist: 'Orthopedist' };

function TriageResult() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className={styles.fallback}>
        <p className={styles.fallbackText}>No symptom data found. Please describe your symptoms first.</p>
        <Link to="/patient/triage" className={styles.fallbackLink}>&larr; Describe symptoms</Link>
      </div>
    );
  }

  const { query, category, specialty, urgency_level, reasoning, precautionary_advice } = state;
  const isHighUrgency = urgency_level === 'high';
  const specialtyLabel = SPECIALTY_LABELS[specialty] || specialty;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>AI Consultation Result</h1>
      <p className={styles.subtext}>Evaluated based on your symptoms & medical profile context.</p>

      <div className={styles.chatArea}>
        <div className={styles.userRow}>
          <div className={styles.userBubble}><p className={styles.userText}>{query}</p></div>
        </div>

        <div className={styles.resultRow}>
          <div className={styles.botAvatar}>
            <svg className={styles.botAvatarSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div className={isHighUrgency ? styles.resultBubbleUrgent : styles.resultBubbleNormal}>
            <p className={styles.resultText}>
              Problem Area: <span className={styles.bold}>{category}</span>.<br />
              Recommended Care: Visit a <span className={styles.bold}>{specialtyLabel}</span>.
            </p>
            {reasoning && (
              <p className={styles.resultText} style={{ marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
                💡 <strong>AI Analysis:</strong> {reasoning}
              </p>
            )}
            {precautionary_advice && (
              <p className={styles.resultText} style={{ marginTop: '6px', fontSize: '13px', opacity: 0.9 }}>
                🛡️ <strong>Guidance:</strong> {precautionary_advice}
              </p>
            )}
            <div className={styles.badgeWrap}>
              <span className={isHighUrgency ? styles.badgeHigh : urgency_level === 'medium' ? styles.badgeMedium : styles.badgeLow}>
                {isHighUrgency ? 'High urgency' : urgency_level === 'medium' ? 'Medium urgency' : 'Low urgency'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.disclaimer}>
          <strong className={styles.disclaimerBold}>Safety Disclaimer:</strong> This AI assistant provides triage & specialist navigation only. It does not provide medical disease diagnoses or prescriptions.
        </div>
      </div>

      <div className={styles.actions}>
        {isHighUrgency ? (
          <button onClick={() => navigate('/patient/home')} className={styles.btnEmergency}>
            <svg className={styles.btnSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Go to Emergency
          </button>
        ) : (
          <button onClick={() => navigate('/patient/slots', { state: { specialty } })} className={styles.btnPrimary}>
            Book a {specialtyLabel}
          </button>
        )}
        <button onClick={() => navigate('/patient/triage')} className={styles.btnSecondary}>Describe different symptoms</button>
      </div>
    </div>
  );
}

export default TriageResult;
