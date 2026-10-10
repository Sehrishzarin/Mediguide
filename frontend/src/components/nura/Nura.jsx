// Nura — MediGuide's health assistant. A soft, morphing blob with a face.
//
// <Nura size={48} mood="idle" />
// mood: idle | listening | thinking | speaking | happy | empathetic | concerned
// `still` disables motion (e.g. in long lists). Motion is also off for prefers-reduced-motion.
import s from './Nura.module.css';

export const NURA_NAME = 'Nura';

function Eyes({ mood }) {
  if (mood === 'happy') {
    return (
      <g className={s.stroke}>
        <path d="M33 47 Q38 41 43 47" />
        <path d="M57 47 Q62 41 67 47" />
      </g>
    );
  }
  if (mood === 'empathetic') {
    // Soft, gently lowered eyes
    return (
      <g>
        <ellipse cx="38" cy="47.5" rx="4.4" ry="4.6" className={s.pupil} />
        <ellipse cx="62" cy="47.5" rx="4.4" ry="4.6" className={s.pupil} />
        <circle cx="39.4" cy="46" r="1.3" className={s.shine} />
        <circle cx="63.4" cy="46" r="1.3" className={s.shine} />
      </g>
    );
  }
  return (
    <g className={`${s.eyes} ${mood === 'thinking' ? s.eyesUp : ''}`}>
      <g className={s.eye}>
        <ellipse cx="38" cy="46" rx="4.6" ry="6.2" className={s.pupil} />
        <circle cx="39.6" cy="43.6" r="1.6" className={s.shine} />
      </g>
      <g className={s.eye}>
        <ellipse cx="62" cy="46" rx="4.6" ry="6.2" className={s.pupil} />
        <circle cx="63.6" cy="43.6" r="1.6" className={s.shine} />
      </g>
    </g>
  );
}

function Mouth({ mood }) {
  switch (mood) {
    case 'speaking':
      return <ellipse cx="50" cy="63" rx="5" ry="3.4" className={`${s.mouthFill} ${s.talk}`} />;
    case 'thinking':
      return <path d="M46 64 Q50 62.5 54 64" className={s.stroke} />;
    case 'concerned':
      return <path d="M42 66 Q50 60.5 58 66" className={s.stroke} />;
    case 'happy':
      return <path d="M40 59 Q50 70 60 59 Z" className={s.mouthFill} />;
    case 'empathetic':
      return <path d="M44 62.5 Q50 66 56 62.5" className={s.stroke} />;
    case 'listening':
      return <ellipse cx="50" cy="63.5" rx="3.2" ry="2.6" className={s.mouthFill} />;
    default:
      return <path d="M42 61 Q50 68 58 61" className={s.stroke} />;
  }
}

export default function Nura({ size = 48, mood = 'idle', still = false, className = '', label }) {
  return (
    <span
      className={`${s.root} ${s[mood] || ''} ${still ? s.still : ''} ${className}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {mood === 'listening' && <span className={s.ring} />}
      <span className={s.body}>
        <span className={s.sheen} />
        <svg viewBox="0 0 100 100" className={s.face}>
          {mood === 'empathetic' && (
            <g className={s.stroke}>
              <path d="M33 38.5 L42 36.5" />
              <path d="M67 38.5 L58 36.5" />
            </g>
          )}
          {mood === 'concerned' && (
            <g className={s.stroke}>
              <path d="M32 38 L43 34" />
              <path d="M68 38 L57 34" />
            </g>
          )}
          <Eyes mood={mood} />
          <ellipse cx="29" cy="57" rx="5" ry="3" className={s.cheek} />
          <ellipse cx="71" cy="57" rx="5" ry="3" className={s.cheek} />
          <Mouth mood={mood} />
        </svg>
      </span>
      {mood === 'thinking' && (
        <span className={s.dots} aria-hidden="true"><i /><i /><i /></span>
      )}
    </span>
  );
}
