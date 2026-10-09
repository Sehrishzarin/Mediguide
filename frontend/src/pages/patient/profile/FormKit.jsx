// Profile / onboarding form helpers built on the UI kit fields.
// Every control takes `onChange(value)` (not the event) to keep the forms terse.
import { useId, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '../../../components/ui';
import { LIMITS } from './profileModel';
import styles from './FormKit.module.css';

export function TextField({ label, value, onChange, error, hint, suffix, as = 'input', optional, className = '', ...rest }) {
  const id = useId();
  const Control = as === 'textarea' ? Textarea : Input;
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} optional={optional} className={className}>
      <div className={suffix ? styles.suffixWrap : undefined}>
        <Control
          id={id}
          className={suffix ? styles.hasSuffix : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          invalid={Boolean(error)}
          {...rest}
        />
        {suffix && <span className={styles.suffix} aria-hidden="true">{suffix}</span>}
      </div>
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, placeholder = 'Select', error, className = '' }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} error={error} className={className}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} invalid={Boolean(error)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    </Field>
  );
}

// Type an item and press Enter (or Add); items show as removable chips.
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
    <Field label={label} htmlFor={id} error={err} hint={hint}>
      <div className={styles.tagRow}>
        <Input
          id={id}
          type="text"
          value={text}
          placeholder={placeholder}
          enterKeyHint="done"
          autoComplete="off"
          invalid={Boolean(err)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onBlur={add}
        />
        <Button variant="secondary" icon={Plus} onClick={add} aria-label={`Add to ${label.toLowerCase()}`}>Add</Button>
      </div>
      {items.length > 0 && (
        <ul className={styles.chips} aria-label={`${label} added`}>
          {items.map((item) => (
            <li key={item} className={styles.chip}>
              <span className={styles.chipText}>{item}</span>
              <button type="button" className={styles.chipRemove} onClick={() => onChange(items.filter((i) => i !== item))} aria-label={`Remove ${item}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

function RowsEditor({ label, emptyHint, rows, onChange, error, addLabel, blank, renderRow, removeLabel }) {
  const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>{label}</span>
      {rows.length === 0 && <p className={styles.hint}>{emptyHint}</p>}
      {rows.length > 0 && (
        <div className={styles.rows}>
          {rows.map((row, i) => (
            // eslint-disable-next-line react/no-array-index-key -- rows have no stable id until saved
            <div key={i} className={styles.rowCard}>
              {renderRow(row, (patch) => update(i, patch))}
              <div className={styles.rowFoot}>
                <Button variant="ghost" size="sm" icon={Trash2} className={styles.rowRemove} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                  {removeLabel}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div>
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...rows, { ...blank }])}>{addLabel}</Button>
      </div>
    </div>
  );
}

export function MedicationsEditor({ rows, onChange, error }) {
  return (
    <RowsEditor
      label="Current medications"
      emptyHint="No medications added."
      rows={rows}
      onChange={onChange}
      error={error}
      addLabel="Add medication"
      removeLabel="Remove"
      blank={{ name: '', dosage: '', frequency: '' }}
      renderRow={(row, update) => (
        <>
          <TextField label="Medication" value={row.name} onChange={(v) => update({ name: v })} placeholder="e.g. Metformin" maxLength={LIMITS.item} autoComplete="off" />
          <div className={styles.twoCol}>
            <TextField label="Dosage" value={row.dosage} onChange={(v) => update({ dosage: v })} placeholder="500 mg" maxLength={LIMITS.dosage} autoComplete="off" />
            <TextField label="Frequency" value={row.frequency} onChange={(v) => update({ frequency: v })} placeholder="Twice daily" maxLength={LIMITS.frequency} autoComplete="off" />
          </div>
        </>
      )}
    />
  );
}

export function TreatmentsEditor({ rows, onChange, error }) {
  return (
    <RowsEditor
      label="Long-term treatments"
      emptyHint="For example dialysis, physiotherapy or insulin therapy."
      rows={rows}
      onChange={onChange}
      error={error}
      addLabel="Add treatment"
      removeLabel="Remove"
      blank={{ treatmentName: '', notes: '', isOngoing: true }}
      renderRow={(row, update) => (
        <>
          <TextField label="Treatment" value={row.treatmentName} onChange={(v) => update({ treatmentName: v })} placeholder="e.g. Physiotherapy" maxLength={LIMITS.item} autoComplete="off" />
          <TextField label="Notes" optional value={row.notes} onChange={(v) => update({ notes: v })} placeholder="Any details" maxLength={LIMITS.treatmentNotes} autoComplete="off" />
          <label className={styles.check}>
            <input type="checkbox" checked={row.isOngoing} onChange={(e) => update({ isOngoing: e.target.checked })} />
            <span>Ongoing</span>
          </label>
        </>
      )}
    />
  );
}
