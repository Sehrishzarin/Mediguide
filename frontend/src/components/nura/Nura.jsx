// Nura — MediGuide's health assistant. A soft, morphing blob with a face.
//
// <Nura size={48} mood="idle" />
// mood: idle | listening | thinking | speaking | happy | empathetic | concerned | shy
// gaze: where she looks.
//   'pointer'        follow the mouse / finger anywhere on the page
//   { x, y }         look in a direction, each from -1 (left/up) to 1 (right/down)
//   null (default)   look straight ahead
// `still` disables motion (e.g. in long lists). Motion is also off for prefers-reduced-motion.
import { useEffect, useRef } from 'react';
import s from './Nura.module.css';

export const NURA_NAME = 'Nura';

// How far the eyes and face can move, in face units (the face is 100 x 100)
const EYE_RANGE = { x: 5, y: 3.5 };
const FACE_RATIO = 0.4; // mouth, cheeks and brows move less than the eyes: a little head turn

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Moves the eye and face groups directly (no React re-render on every mouse move)
function useGaze(rootRef, eyesRef, faceRef, gaze, still) {
  const isPointer = gaze === 'pointer';
  const gx = !isPointer && gaze ? gaze.x : 0;
  const gy = !isPointer && gaze ? gaze.y : 0;

  useEffect(() => {
    const eyes = eyesRef.current;
    const face = faceRef.current;
    if (!eyes || !face) return undefined;
    const apply = (nx, ny) => {
      const x = Math.max(-1, Math.min(1, nx)) * EYE_RANGE.x;
      const y = Math.max(-1, Math.min(1, ny)) * EYE_RANGE.y;
      eyes.style.transform = `translate(${x}px, ${y}px)`;
      face.style.transform = `translate(${x * FACE_RATIO}px, ${y * FACE_RATIO}px)`;
    };

    if (still || reducedMotion()) { apply(0, 0); return undefined; }
    if (!isPointer) { apply(gx, gy); return undefined; }

    let frame = 0;
    let last = null;
    const update = () => {
      frame = 0;
      const root = rootRef.current;
      if (!root || !last) return;
      const r = root.getBoundingClientRect();
      const dx = last.x - (r.left + r.width / 2);
      const dy = last.y - (r.top + r.height / 2);
      // Soft curve: small moves near Nura matter, far away it saturates
      apply(dx / (Math.abs(dx) + 160), dy / (Math.abs(dy) + 160));
    };
    const onMove = (e) => {
      last = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onLeave = () => { last = null; apply(0, 0); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootRef, eyesRef, faceRef, isPointer, gx, gy, still]);
}

function Eyes({ mood }) {
  if (mood === 'happy') {
    return (
      <g className={s.stroke}>
        <path d="M33 47 Q38 41 43 47" />
        <path d="M57 47 Q62 41 67 47" />
      </g>
    );
  }
  if (mood === 'shy') {
    // Eyes gently closed (looking away while you type your password)
    return (
      <g className={s.stroke}>
        <path d="M33 46 Q38 50 43 46" />
        <path d="M57 46 Q62 50 67 46" />
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
    case 'shy':
      return <path d="M45 62 Q50 65 55 62" className={s.stroke} />;
    case 'listening':
      return <ellipse cx="50" cy="63.5" rx="3.2" ry="2.6" className={s.mouthFill} />;
    default:
      return <path d="M42 61 Q50 68 58 61" className={s.stroke} />;
  }
}

export default function Nura({ size = 48, mood = 'idle', still = false, gaze = null, className = '', label }) {
  const rootRef = useRef(null);
  const eyesRef = useRef(null);
  const faceRef = useRef(null);
  useGaze(rootRef, eyesRef, faceRef, gaze, still);

  return (
    <span
      ref={rootRef}
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
          <g ref={faceRef} className={s.gaze}>
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
            <ellipse cx="29" cy="57" rx="5" ry="3" className={`${s.cheek} ${mood === 'shy' ? s.blush : ''}`} />
            <ellipse cx="71" cy="57" rx="5" ry="3" className={`${s.cheek} ${mood === 'shy' ? s.blush : ''}`} />
            <Mouth mood={mood} />
          </g>
          <g ref={eyesRef} className={s.gaze}>
            <Eyes mood={mood} />
          </g>
        </svg>
      </span>
      {mood === 'thinking' && (
        <span className={s.dots} aria-hidden="true"><i /><i /><i /></span>
      )}
    </span>
  );
}
