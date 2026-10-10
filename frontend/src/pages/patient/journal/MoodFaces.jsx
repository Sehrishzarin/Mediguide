// SVG mood faces (no emoji): 1 = awful (frown) … 5 = great (smile).
import { useRef, useState } from 'react';
import { MOODS, moodTone } from './journalModel';
import s from './Journal.module.css';

const cx = (...p) => p.filter(Boolean).join(' ');

const MOUTHS = {
  1: 'M12.5 26 Q18 20 23.5 26',
  2: 'M13 25 Q18 21.5 23 25',
  3: 'M13 23.5 L23 23.5',
  4: 'M13 22.5 Q18 25.5 23 22.5',
  5: 'M12.5 21.5 Q18 28 23.5 21.5'
};

export function MoodFace({ mood, className }) {
  const tone = moodTone(mood) || 'mid';
  return (
    <svg viewBox="0 0 36 36" className={cx(s.face, s[`tone_${tone}`], className)} aria-hidden="true">
      <circle cx="18" cy="18" r="16" className={s.faceBg} />
      {mood === 1 && (
        <g className={s.faceStroke}>
          <path d="M10.5 12 L15 13.5" />
          <path d="M25.5 12 L21 13.5" />
        </g>
      )}
      <circle cx="13" cy="16" r="1.8" className={s.faceFill} />
      <circle cx="23" cy="16" r="1.8" className={s.faceFill} />
      <path d={MOUTHS[mood] || MOUTHS[3]} className={s.faceStroke} />
    </svg>
  );
}

// Radio group of the five faces. `value` may be null; `onChange(mood)`.
export function MoodPicker({ value, onChange, label = 'Mood', compact }) {
  const selectedIndex = MOODS.findIndex((m) => m.value === value);
  const [focus, setFocus] = useState(selectedIndex >= 0 ? selectedIndex : 2);
  const refs = useRef([]);

  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % MOODS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + MOODS.length) % MOODS.length;
    if (next === null) return;
    e.preventDefault();
    setFocus(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={cx(s.moodPicker, compact && s.moodPickerCompact)} role="radiogroup" aria-label={label}>
      {MOODS.map((m, i) => {
        const selected = m.value === value;
        return (
          <button
            key={m.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === focus ? 0 : -1}
            className={cx(s.moodOption, s[`tone_${moodTone(m.value)}`], selected && s.moodSelected)}
            onClick={() => onChange(m.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onFocus={() => setFocus(i)}
          >
            <MoodFace mood={m.value} />
            <span className={s.moodLabel}>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
