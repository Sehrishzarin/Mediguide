// Emergency contacts for Nura Check-In: list with consent status, add, remove, resend invite.
// Contacts must reply YES (in demo mode: on their in-app "phone") before they can be alerted.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, RotateCw, Check, Clock, X, Smartphone, UserPlus } from 'lucide-react';
import { Avatar, Badge, Button, Field, Input, IconButton, Alert, Skeleton, ErrorState } from '../../../components/ui';
import { addCheckInContact, removeCheckInContact, resendCheckInInvite } from '../../../services/api';
import friendlyError from '../../../utils/friendlyError';
import s from './Monitoring.module.css';

const MAX_CONTACTS = 3;

function ConsentBadge({ consent }) {
  if (consent === 'agreed') return <Badge tone="success" icon={Check}>Agreed</Badge>;
  if (consent === 'declined') return <Badge tone="danger" icon={X}>Declined</Badge>;
  return <Badge tone="warning" icon={Clock}>Waiting for reply</Badge>;
}

function ContactRow({ contact, onRemoved, onUpdated }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const remove = async () => {
    setBusy('remove');
    setError('');
    try {
      await removeCheckInContact(contact.id);
      onRemoved(contact.id);
    } catch (err) {
      setError(friendlyError(err, "We couldn't remove this contact. Please try again."));
      setBusy('');
    }
  };

  const resend = async () => {
    setBusy('resend');
    setError('');
    try {
      const res = await resendCheckInInvite(contact.id);
      onUpdated(res.data);
    } catch (err) {
      setError(friendlyError(err, "We couldn't resend the invite. Please try again."));
    } finally {
      setBusy('');
    }
  };

  return (
    <li className={s.contact}>
      <div className={s.contactMain}>
        <Avatar name={contact.name} size={40} />
        <div className={s.contactText}>
          <p className={s.contactName}>
            {contact.name}
            {contact.relationship && <span className={s.contactRel}> · {contact.relationship}</span>}
          </p>
          <p className={s.contactPhone}>{contact.phone}</p>
          <ConsentBadge consent={contact.consent} />
        </div>
        <div className={s.contactActions}>
          {contact.consent !== 'agreed' && (
            <IconButton icon={RotateCw} label={`Resend invite to ${contact.name}`} onClick={resend} disabled={Boolean(busy)} />
          )}
          <IconButton icon={Trash2} label={`Remove ${contact.name}`} onClick={() => setConfirming(true)} disabled={Boolean(busy)} />
        </div>
      </div>

      {contact.consent === 'pending' && (
        <p className={s.contactHint}>
          Nura sent {contact.name} a text asking them to agree (demo: no real text was sent).{' '}
          <Link to={`/patient/monitoring/contact/${contact.id}`} className={s.inlineLink}>
            <Smartphone size={14} aria-hidden="true" /> Open {contact.name}'s demo phone to reply
          </Link>
        </p>
      )}
      {contact.consent !== 'pending' && (
        <Link to={`/patient/monitoring/contact/${contact.id}`} className={s.inlineLink}>
          <Smartphone size={14} aria-hidden="true" /> See {contact.name}'s demo phone
        </Link>
      )}

      {confirming && (
        <div className={s.confirm} role="group" aria-label={`Remove ${contact.name}?`}>
          <span>Remove {contact.name}? They won't be alerted any more.</span>
          <div className={s.confirmActions}>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy === 'remove'}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={remove} loading={busy === 'remove'}>Remove</Button>
          </div>
        </div>
      )}
      {error && <p className={s.fieldError} role="alert">{error}</p>}
    </li>
  );
}

function AddContactForm({ onAdded, onCancel }) {
  const [form, setForm] = useState({ name: '', phone: '', relationship: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Enter the contact's name.";
    if (!/^[+\d][\d\s()-]{6,19}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number, for example 0300 1234567.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setError('');
    try {
      const res = await addCheckInContact({ name: form.name.trim(), phone: form.phone.trim(), relationship: form.relationship.trim() });
      onAdded(res.data);
    } catch (err) {
      setError(friendlyError(err, "We couldn't add this contact. Please try again."));
      setBusy(false);
    }
  };

  return (
    <form className={s.addForm} onSubmit={submit} noValidate>
      <Field label="Name" htmlFor="cc-name" error={errors.name}>
        <Input id="cc-name" autoFocus value={form.name} onChange={update('name')} autoComplete="off" placeholder="e.g. Ammi" invalid={Boolean(errors.name)} maxLength={60} />
      </Field>
      <Field label="Phone number" htmlFor="cc-phone" error={errors.phone}>
        <Input id="cc-phone" type="tel" inputMode="tel" value={form.phone} onChange={update('phone')} autoComplete="off" placeholder="0300 1234567" invalid={Boolean(errors.phone)} maxLength={20} />
      </Field>
      <Field label="Relationship" htmlFor="cc-rel" optional>
        <Input id="cc-rel" value={form.relationship} onChange={update('relationship')} autoComplete="off" placeholder="e.g. Mother" maxLength={30} />
      </Field>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className={s.formActions}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" icon={UserPlus} loading={busy}>Add and send invite</Button>
      </div>
    </form>
  );
}

// contacts: null while loading. status: 'loading' | 'error' | 'ready'
export default function ContactsEditor({ contacts, status, error, onRetry, onChange }) {
  const [adding, setAdding] = useState(false);

  if (status === 'loading') {
    return (
      <div className={s.contactsSkeleton} aria-busy="true" aria-label="Loading contacts">
        <Skeleton height={64} radius="var(--r-md)" />
        <Skeleton height={64} radius="var(--r-md)" />
      </div>
    );
  }
  if (status === 'error') return <ErrorState compact message={error} onRetry={onRetry} />;

  const list = contacts || [];
  const full = list.length >= MAX_CONTACTS;

  return (
    <div className={s.contacts}>
      {list.length === 0 && !adding && (
        <p className={s.muted}>Add someone you trust. They'll get a text asking them to agree first.</p>
      )}
      {list.length > 0 && (
        <ul className={s.contactList}>
          {list.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              onRemoved={(id) => onChange(list.filter((x) => x.id !== id))}
              onUpdated={(updated) => onChange(list.map((x) => (x.id === updated.id ? updated : x)))}
            />
          ))}
        </ul>
      )}

      {adding ? (
        <AddContactForm
          onCancel={() => setAdding(false)}
          onAdded={(c) => { onChange([...list, c]); setAdding(false); }}
        />
      ) : (
        <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)} disabled={full} block>
          {full ? `Up to ${MAX_CONTACTS} contacts` : 'Add a contact'}
        </Button>
      )}
    </div>
  );
}
