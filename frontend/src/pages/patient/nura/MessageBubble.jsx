// One chat message. Nura replies can carry structured extras rendered as quiet cards.
import { memo } from 'react';
import { Phone, Siren, AlertTriangle, Stethoscope, CalendarPlus, ShieldCheck, UserRound, MapPin } from 'lucide-react';
import { Button } from '../../../components/ui';
import Nura from '../../../components/nura/Nura';
import { bookableSpecialty, stripEmoji } from '../chatStorage';
import { FormattedText } from './FormattedText';
import { messageTime } from './time';
import s from './MessageBubble.module.css';

const URGENCY = {
  high: { label: 'High urgency', text: 'Please get medical care today.', tone: s.urgencyHigh },
  medium: { label: 'Moderate urgency', text: 'See a doctor in the next few days.', tone: s.urgencyMedium }
};

const cleanProfileNote = (t) => String(t || '').replace(/^\s*(profile check|based on your profile)\s*:\s*/i, '').trim();

function Extras({ result, onBook, onEmergency, onNearby }) {
  if (!result) return null;
  const urgency = URGENCY[result.urgency_level];
  const ctaBook = result.cta?.type === 'book';
  const specialty = bookableSpecialty(result);
  const profileNote = cleanProfileNote(result.profile_impact_summary);
  const showBook = !result.emergency_flag && (ctaBook || (specialty && !result.is_non_medical));
  const showNearby = !result.emergency_flag && result.show_map;

  if (!result.emergency_flag && !urgency && !showBook && !showNearby && !result.precautionary_advice && !profileNote) {
    return null;
  }

  return (
    <div className={s.extras}>
      {result.emergency_flag && (
        <div className={s.emergency} role="alert">
          <div className={s.emergencyHead}>
            <Siren size={20} aria-hidden="true" />
            <p className={s.emergencyTitle}>This may need urgent help</p>
          </div>
          <p className={s.emergencyText}>If you or someone else is in danger, call emergency services now.</p>
          <div className={s.emergencyActions}>
            <Button variant="danger" size="sm" icon={Phone} href="tel:1122">Call 1122</Button>
            <Button variant="secondary" size="sm" icon={Siren} onClick={onEmergency}>Emergency help</Button>
          </div>
        </div>
      )}

      {urgency && !result.emergency_flag && (
        <div className={`${s.urgency} ${urgency.tone}`}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span><strong>{urgency.label}.</strong> {urgency.text}</span>
        </div>
      )}

      {showBook && (
        <div className={s.card}>
          <span className={s.cardIcon}><Stethoscope size={18} aria-hidden="true" /></span>
          <div className={s.cardBody}>
            <p className={s.cardLabel}>Recommended</p>
            <p className={s.cardValue}>{specialty || 'A doctor'}</p>
          </div>
          <Button size="sm" icon={CalendarPlus} onClick={() => onBook(specialty)}>Book a session</Button>
        </div>
      )}

      {showNearby && (
        <div className={s.card}>
          <span className={s.cardIcon}><MapPin size={18} aria-hidden="true" /></span>
          <div className={s.cardBody}>
            <p className={s.cardLabel}>Nearby care</p>
            <p className={s.cardValue}>{result.hospital_recommendation || 'Find a hospital or clinic near you'}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={onNearby}>Open map</Button>
        </div>
      )}

      {profileNote && (
        <p className={s.note}>
          <UserRound size={16} aria-hidden="true" />
          <span><strong>Based on your profile:</strong> {profileNote}</span>
        </p>
      )}

      {result.precautionary_advice && (
        <p className={s.note}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{result.precautionary_advice}</span>
        </p>
      )}
    </div>
  );
}

function MessageBubble({ message, showAvatar, onBook, onEmergency, onNearby }) {
  const time = messageTime(message.time);

  if (message.sender === 'user') {
    return (
      <div className={`${s.row} ${s.rowUser}`}>
        <div className={s.stackUser}>
          <div className={`${s.bubble} ${s.bubbleUser}`}>
            <span className="sr-only">You said: </span>
            <FormattedText text={message.text} className={s.text} listClassName={s.list} />
          </div>
          {time && <time className={s.time} dateTime={message.time}>{time}</time>}
        </div>
      </div>
    );
  }

  return (
    <div className={`${s.row} ${s.rowAi}`}>
      <div className={s.avatarSlot}>
        {showAvatar && <Nura size={28} still mood={message.result?.emergency_flag ? 'concerned' : 'idle'} />}
      </div>
      <div className={s.stackAi}>
        <div className={`${s.bubble} ${s.bubbleAi}`}>
          <span className="sr-only">Nura said: </span>
          <FormattedText text={stripEmoji(message.text)} className={s.text} listClassName={s.list} />
        </div>
        <Extras result={message.result} onBook={onBook} onEmergency={onEmergency} onNearby={onNearby} />
        {time && <time className={s.time} dateTime={message.time}>{time}</time>}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
