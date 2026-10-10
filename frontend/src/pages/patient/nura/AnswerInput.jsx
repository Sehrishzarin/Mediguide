// Structured answers for Nura's guided symptom assessment:
//   scale  → 1–5 faces (radiogroup, arrow keys)
//   choice → one tap sends
//   multi  → toggle chips + Continue, or "None of these"
import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Chip, ChipRow } from '../../../components/ui';
import s from './AnswerInput.module.css';

const STEPS = ['severity', 'duration', 'associated', 'meds'];

// Simple face, calm (1) to distressed (5). Mouth curve goes from smile to frown.
const MOUTHS = [
  'M13 22 Q18 27 23 22',
  'M13 22.5 Q18 25 23 22.5',
  'M13 23.5 L23 23.5',
  'M13 25 Q18 21.5 23 25',
  'M12.5 26 Q18 20 23.5 26'
];
function Face({ level }) {
  return (
    <svg viewBox="0 0 36 36" className={s.face} aria-hidden="true">
      <circle cx="18" cy="18" r="16" className={s.faceBg} />
      {level >= 4 ? (
        <g className={s.faceStroke}>
          <path d="M10.5 12.5 L15 10.8" />
          <path d="M25.5 12.5 L21 10.8" />
        </g>
      ) : null}
      <circle cx="13" cy="16" r="1.8" className={s.faceFill} />
      <circle cx="23" cy="16" r="1.8" className={s.faceFill} />
      <path d={MOUTHS[level - 1] || MOUTHS[2]} className={s.faceStroke} />
    </svg>
  );
}

function Scale({ input, onAnswer, disabled }) {
  const [focus, setFocus] = useState(0);
  const refs = useRef([]);
  const options = input.options;

  const pick = (o) => onAnswer({ id: input.id, value: Number(o.value) }, `${o.label} (${o.value}/5)`);

  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next === null) return;
    e.preventDefault();
    setFocus(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={s.scale} role="radiogroup" aria-label={input.question}>
      {options.map((o, i) => {
        const level = Math.min(5, Math.max(1, Number(o.value) || i + 1));
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={false}
            tabIndex={i === focus ? 0 : -1}
            className={`${s.scaleOption} ${s[`lvl${level}`]}`}
            onClick={() => pick(o)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onFocus={() => setFocus(i)}
            disabled={disabled}
          >
            <Face level={level} />
            <span className={s.scaleNum}>{o.value}</span>
            <span className={s.scaleLabel}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Choice({ input, onAnswer, disabled }) {
  return (
    <div className={s.choices} role="group" aria-label={input.question}>
      {input.options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={s.choice}
          onClick={() => onAnswer({ id: input.id, value: o.value }, o.label)}
          disabled={disabled}
        >
          <span>{o.label}</span>
          <ArrowRight size={16} aria-hidden="true" className={s.choiceArrow} />
        </button>
      ))}
    </div>
  );
}

function Multi({ input, onAnswer, disabled }) {
  const [selected, setSelected] = useState([]);
  const toggle = (v) => setSelected((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  const labels = input.options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const noneLabel = input.noneLabel || 'None of these';

  return (
    <div className={s.multi} role="group" aria-label={input.question}>
      <ChipRow wrap>
        {input.options.map((o) => (
          <Chip key={o.value} selected={selected.includes(o.value)} onClick={() => toggle(o.value)} disabled={disabled}>
            {o.label}
          </Chip>
        ))}
      </ChipRow>
      <div className={s.multiActions}>
        <Button variant="secondary" size="sm" onClick={() => onAnswer({ id: input.id, value: [] }, noneLabel)} disabled={disabled}>
          {noneLabel}
        </Button>
        <Button
          size="sm"
          iconRight={ArrowRight}
          onClick={() => onAnswer({ id: input.id, value: selected }, labels.join(', '))}
          disabled={disabled || selected.length === 0}
        >
          Continue{selected.length ? ` (${selected.length})` : ''}
        </Button>
      </div>
    </div>
  );
}

export default function AnswerInput({ input, onAnswer, disabled }) {
  const step = STEPS.indexOf(input.id);
  let body = null;
  if (input.type === 'scale') body = <Scale input={input} onAnswer={onAnswer} disabled={disabled} />;
  else if (input.type === 'multi') body = <Multi input={input} onAnswer={onAnswer} disabled={disabled} />;
  else body = <Choice input={input} onAnswer={onAnswer} disabled={disabled} />;

  return (
    <div className={s.wrap}>
      <div className={s.panel}>
        {/* The question itself is the last line of Nura's bubble; repeat it only for screen readers */}
        <div className={s.head}>
          <span className="sr-only">{input.question}</span>
          <span className={s.step}>
            {step >= 0 ? `Question ${step + 1} of ${STEPS.length}` : 'Choose one, or type it'}
          </span>
        </div>
        {body}
      </div>
    </div>
  );
}
