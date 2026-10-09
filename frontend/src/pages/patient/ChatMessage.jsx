import { memo } from 'react';
import { Link } from 'react-router-dom';
import styles from './SymptomInput.module.css';

// ---- Tiny safe formatter: **bold**, line breaks, "- " bullets. Never injects HTML. ----
function renderInline(line, keyPrefix) {
  return line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
      : <span key={`${keyPrefix}-${i}`}>{part}</span>
  );
}

export function FormattedText({ text }) {
  const blocks = [];
  let list = null;
  String(text || '').split('\n').forEach((raw, idx) => {
    const line = raw.trim();
    const bullet = line.match(/^[-•*]\s+(.*)$/);
    if (bullet) {
      if (!list) { list = []; blocks.push({ type: 'ul', items: list, key: idx }); }
      list.push(bullet[1]);
      return;
    }
    list = null;
    if (line) blocks.push({ type: 'p', text: line, key: idx });
  });
  return blocks.map((b) =>
    b.type === 'ul'
      ? <ul key={b.key} className={styles.msgList}>{b.items.map((it, i) => <li key={i}>{renderInline(it, `${b.key}-${i}`)}</li>)}</ul>
      : <p key={b.key} className={styles.msgPara}>{renderInline(b.text, b.key)}</p>
  );
}

const URGENCY = {
  high: { label: 'High urgency', cls: 'urgHigh' },
  medium: { label: 'Medium urgency', cls: 'urgMedium' },
  low: { label: 'Low urgency', cls: 'urgLow' }
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

function ChatMessage({ message, isLatestAi, canAsk, onPickQuestion }) {
  const isUser = message.sender === 'user';
  const r = message.result;
  const urgency = r && !r.is_non_medical ? URGENCY[r.urgency_level] : null;
  const specialty = r && !r.is_non_medical ? r.specialty : '';
  // Only real doctor specialties get a booking button (not "Emergency Department" or "Self-Care Monitoring")
  const bookable = Boolean(specialty) && !/emergency|self|monitor|counsel|none|n\/a/i.test(specialty);
  const reco = r?.hospital_recommendation || '';
  const advisesHome = /no (hospital |clinic )?visit|not need/i.test(reco);
  const optionalVisit = /optional|home care/i.test(reco);
  const recommendsVisit = r && !r.is_non_medical && bookable && !advisesHome &&
    (r.show_map || r.urgency_level === 'high' || r.urgency_level === 'medium' || /visit|clinic|hospital|doctor|consult/i.test(reco));

  return (
    <div data-row className={`${styles.msgRow} ${isUser ? styles.msgRowUser : ''}`}>
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAi}`}>
        {!isUser && r?.emergency_flag && (
          <div className={styles.emergencyBanner} role="alert">
            <strong className={styles.emergencyTitle}>This may be an emergency</strong>
            <p>Do not wait. Call emergency services now or go to the nearest emergency department.</p>
            <div className={styles.emergencyActions}>
              <a href="tel:1122" className={styles.callBtn}>Call 1122</a>
              <Link to="/patient/emergency" className={styles.emergencyLink}>Emergency care options</Link>
            </div>
          </div>
        )}

        <FormattedText text={message.text} />

        {!isUser && r && (urgency || specialty) && (
          <div className={styles.badgeRow}>
            {urgency && <span className={`${styles.badge} ${styles[urgency.cls]}`}>{urgency.label}</span>}
            {specialty && <span className={`${styles.badge} ${styles.badgeSpecialty}`}>{specialty}</span>}
          </div>
        )}

        {!isUser && r?.profile_impact_summary && (
          <p className={styles.profileNote}><strong>From your profile:</strong> {r.profile_impact_summary}</p>
        )}

        {!isUser && r?.precautionary_advice && (
          <div className={styles.adviceBox}>
            <span className={styles.adviceLabel}>What you can do now</span>
            <p>{r.precautionary_advice}</p>
          </div>
        )}

        {!isUser && recommendsVisit && (
          <div className={styles.ctaRow}>
            {r.hospital_recommendation && <p className={styles.recoText}>{r.hospital_recommendation}</p>}
            <Link to="/patient/slots" state={{ specialty }} className={optionalVisit ? styles.bookBtnSoft : styles.bookBtn}>
              {optionalVisit ? `Prefer to see a doctor? Book a ${specialty}` : `Find a ${specialty} session`}
            </Link>
          </div>
        )}

        {!isUser && isLatestAi && canAsk && r?.trigger_question && (
          <button type="button" className={styles.suggestChip} onClick={() => onPickQuestion(r.trigger_question)}>
            {r.trigger_question}
          </button>
        )}

        <span className={styles.msgTime}>{formatTime(message.time)}</span>
      </div>
    </div>
  );
}

export default memo(ChatMessage);
