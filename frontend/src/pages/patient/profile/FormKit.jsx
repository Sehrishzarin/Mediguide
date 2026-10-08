import { useId, useState } from 'react';
import { LIMITS } from './profileModel';
import styles from './FormKit.module.css';

export function TextField({ label, value, onChange, error, hint, suffix, as = 'input', className = '', ...rest }) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  const Control = as;
  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.controlWrap}>
        <Control
          id={id}
          className={`${styles.control} ${error ? styles.controlError : ''} ${suffix ? styles.hasSuffix : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {suffix && <span className={styles.suffix} aria-hidden="true">{suffix}</span>}
      </div>
      {hint && !error && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      {error && <p id={`${id}-err`} className={styles.error}>{error}</p>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, placeholder = 'Select…', error, className = '' }) {
  const id = useId();
  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <select
        id={id}
        className={`${styles.control} ${styles.select} ${error ? styles.controlError : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export function TagInput({ label, items, onChange, placeholder, hint }) {
  const id = useId();
  const [text, setText] = useState('');
  const [err, setErr] = useState('');

  const add = () => {
    const v = text.trim();
    if (!v) { setErr(''); return; }
    if (v.length > LIMITS.item) { setErr(`Keep each entry under ${LIMITS.item} characters.`); return; }
    if (!items.some((i) => i.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setText('');
    setErr('');
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.tagRow}>
        <input
          id={id}
          type="text"
          className={`${styles.control} ${err ? styles.controlError : ''}`}
          value={text}
          placeholder={placeholder}
          enterKeyHint="done"
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onBlur={add}
          aria-describedby={err ? `${id}-err` : hint ? `${id}-hint` : undefined}
        />
        <button type="button" className={styles.addBtn} onClick={add}>Add</button>
      </div>
      {err && <p id={`${id}-err`} className={styles.error}>{err}</p>}
      {hint && !err && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      {items.length > 0 && (
        <ul className={styles.chips} aria-label={`${label} added`}>
          {items.map((item) => (
            <li key={item} className={styles.chip}>
              <span className={styles.chipText}>{item}</span>
              <button type="button" className={styles.chipRemove} onClick={() => onChange(items.filter((i) => i !== item))} aria-label={`Remove ${item}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </svg>
);

export function MedicationsEditor({ rows, onChange, error }) {
  const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className={styles.field}>
      <span className={styles.label}>Current medications</span>
      {rows.length === 0 && <p className={styles.hint}>No medications added.</p>}
      <div className={styles.rows}>
        {rows.map((row, i) => (
          <div key={i} className={styles.rowCard}>
            <TextField label="Medication" value={row.name} onChange={(v) => update(i, { name: v })} placeholder="e.g. Metformin" maxLength={LIMITS.item} autoComplete="off" />
            <div className={styles.twoCol}>
              <TextField label="Dosage" value={row.dosage} onChange={(v) => update(i, { dosage: v })} placeholder="500 mg" maxLength={LIMITS.dosage} autoComplete="off" />
              <TextField label="Frequency" value={row.frequency} onChange={(v) => update(i, { frequency: v })} placeholder="Twice daily" maxLength={LIMITS.frequency} autoComplete="off" />
            </div>
            <button type="button" className={styles.rowRemove} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
              <TrashIcon /> Remove medication
            </button>
          </div>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.addRowBtn} onClick={() => onChange([...rows, { name: '', dosage: '', frequency: '' }])}>+ Add medication</button>
    </div>
  );
}

export function TreatmentsEditor({ rows, onChange, error }) {
  const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className={styles.field}>
      <span className={styles.label}>Long-term treatments</span>
      {rows.length === 0 && <p className={styles.hint}>E.g. dialysis, physiotherapy, insulin therapy.</p>}
      <div className={styles.rows}>
        {rows.map((row, i) => (
          <div key={i} className={styles.rowCard}>
            <TextField label="Treatment" value={row.treatmentName} onChange={(v) => update(i, { treatmentName: v })} placeholder="e.g. Physiotherapy" maxLength={LIMITS.item} autoComplete="off" />
            <TextField label="Notes" value={row.notes} onChange={(v) => update(i, { notes: v })} placeholder="Optional details" maxLength={LIMITS.treatmentNotes} autoComplete="off" />
            <label className={styles.check}>
              <input type="checkbox" checked={row.isOngoing} onChange={(e) => update(i, { isOngoing: e.target.checked })} />
              <span>Ongoing</span>
            </label>
            <button type="button" className={styles.rowRemove} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
              <TrashIcon /> Remove treatment
            </button>
          </div>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.addRowBtn} onClick={() => onChange([...rows, { treatmentName: '', notes: '', isOngoing: true }])}>+ Add treatment</button>
    </div>
  );
}
