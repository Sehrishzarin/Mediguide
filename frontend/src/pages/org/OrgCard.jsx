import { useRef, useState } from 'react';
import { Clock, CheckCircle2, XCircle, MapPin, Stethoscope, FileText, Upload, Eye, Trash2, Plus, AlertCircle, Users } from 'lucide-react';
import { addStaffMember, removeStaffMember, uploadFile, deleteFile, openFile } from '../../services/api';
import { Alert, Avatar, Badge, Button, Card, EmptyState, Field, Input, List } from '../../components/ui';
import friendlyError from '../../utils/friendlyError';
import styles from './OrgDashboard.module.css';

const SPECIALTIES = ['Cardiologist', 'General Physician', 'Pediatrician', 'Dermatologist', 'Gastroenterologist', 'Orthopedist'];
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

const STATUS = {
  pending: {
    label: 'Pending review',
    tone: 'warning',
    alert: 'warning',
    icon: Clock,
    text: 'Our team is verifying your facility. You can add staff and upload verification documents now. Patients can book your doctors once you are approved.'
  },
  approved: {
    label: 'Approved',
    tone: 'success',
    alert: 'success',
    icon: CheckCircle2,
    text: 'Your facility is live. Every staff member you add becomes a bookable doctor session for patients straight away.'
  },
  rejected: {
    label: 'Not approved',
    tone: 'danger',
    alert: 'danger',
    icon: XCircle,
    text: 'This listing was not approved. Please check your details and documents, then register the facility again with corrected information.'
  }
};

const formatSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} KB`);
const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

function StaffSection({ org, onChange }) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const add = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setNameError('Enter the doctor\'s name.'); return; }
    setBusy(true);
    setError('');
    setNameError('');
    try {
      const res = await addStaffMember(org.id, { name: n, specialty: specialty.trim() || 'General Physician' });
      onChange({ ...org, staff: res.data });
      setName('');
      setSpecialty('');
    } catch (err) {
      setError(friendlyError(err, 'We could not add this staff member. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (staffId) => {
    setRemovingId(staffId);
    setError('');
    try {
      const res = await removeStaffMember(org.id, staffId);
      onChange({ ...org, staff: res.data });
      setConfirmId(null);
    } catch (err) {
      setError(friendlyError(err, 'We could not remove this staff member. Please try again.'));
    } finally {
      setRemovingId(null);
    }
  };

  const listId = `specialties-${org.id}`;
  const nameId = `staff-name-${org.id}`;
  const specId = `staff-spec-${org.id}`;

  return (
    <section className={styles.section} aria-labelledby={`staff-${org.id}`}>
      <div className={styles.sectionHead}>
        <h3 id={`staff-${org.id}`} className={styles.sectionTitle}>
          Doctors and staff <Badge>{org.staff.length}</Badge>
        </h3>
        <p className={styles.muted}>
          {org.status === 'approved'
            ? 'New doctors appear in patients’ booking list immediately.'
            : 'Doctors become bookable by patients once your facility is approved.'}
        </p>
      </div>

      {org.staff.length === 0 ? (
        <div className={styles.emptyBox}>
          <EmptyState compact icon={Users} title="No staff added yet" text="Add your first doctor below." />
        </div>
      ) : (
        <List>
          {org.staff.map((s) => (
            <div key={s._id} className={styles.row}>
              <Avatar name={s.name} size={40} />
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{s.name}</span>
                <span className={styles.rowSub}>{s.specialty}</span>
              </div>
              {confirmId === s._id ? (
                <div className={styles.confirm}>
                  <span className={styles.confirmText}>Remove? Unbooked sessions will be deleted.</span>
                  <div className={styles.confirmBtns}>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)} disabled={removingId === s._id}>Keep</Button>
                    <Button variant="danger" size="sm" loading={removingId === s._id} onClick={() => remove(s._id)}>Remove</Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" icon={Trash2} className={styles.removeBtn} onClick={() => setConfirmId(s._id)} aria-label={`Remove ${s.name}`}>
                  <span className={styles.hideXs}>Remove</span>
                </Button>
              )}
            </div>
          ))}
        </List>
      )}

      <form className={styles.addRow} onSubmit={add} noValidate>
        <Field label="Doctor name" htmlFor={nameId} error={nameError} className={styles.addField}>
          <Input id={nameId} value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} placeholder="Dr. Sara Khan" maxLength={80} invalid={Boolean(nameError)} autoComplete="off" />
        </Field>
        <Field label="Specialty" htmlFor={specId} className={styles.addField}>
          <Input id={specId} value={specialty} onChange={(e) => setSpecialty(e.target.value)} list={listId} placeholder="General Physician" maxLength={60} autoComplete="off" />
        </Field>
        <datalist id={listId}>{SPECIALTIES.map((s) => <option key={s} value={s} />)}</datalist>
        <Button type="submit" icon={Plus} loading={busy} className={styles.addBtn}>Add doctor</Button>
      </form>
      {error && <Alert tone="danger" icon={AlertCircle}>{error}</Alert>}
    </section>
  );
}

function DocumentsSection({ org, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const docId = (d) => d.id || d._id;
  const pick = () => inputRef.current?.click();

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Only PDF, PNG, JPG or WEBP files are accepted.'); return; }
    if (file.size > MAX_BYTES) { setError('That file is larger than 2 MB. Please choose a smaller one.'); return; }
    setUploading(true);
    setError('');
    try {
      const res = await uploadFile(file, { kind: 'org-document', organizationId: org.id });
      onChange({ ...org, documents: [res.data, ...org.documents] });
    } catch (err) {
      setError(friendlyError(err, 'The upload did not go through. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const view = async (id, filename) => {
    setBusyId(id);
    setError('');
    try { await openFile(id, filename); } catch (err) { setError(friendlyError(err, 'We could not open this document.')); } finally { setBusyId(null); }
  };

  const remove = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await deleteFile(id);
      onChange({ ...org, documents: org.documents.filter((d) => docId(d) !== id) });
      setConfirmId(null);
    } catch (err) {
      setError(friendlyError(err, 'We could not delete this document.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={styles.section} aria-labelledby={`docs-${org.id}`}>
      <div className={styles.sectionHeadRow}>
        <div className={styles.sectionHead}>
          <h3 id={`docs-${org.id}`} className={styles.sectionTitle}>
            Verification documents <Badge>{org.documents.length}</Badge>
          </h3>
          <p className={styles.muted}>Your licence or registration certificate. PDF, PNG, JPG or WEBP, up to 2 MB each.</p>
        </div>
        {org.documents.length > 0 && (
          <Button variant="secondary" size="sm" icon={Upload} loading={uploading} onClick={pick} className={styles.headBtn}>
            {uploading ? 'Uploading' : 'Upload'}
          </Button>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" hidden onChange={upload} />

      {org.documents.length === 0 ? (
        <div className={styles.emptyBox}>
          <EmptyState
            compact
            icon={FileText}
            title="No documents uploaded yet"
            text="Upload a document so our team can verify your facility."
            action={<Button size="sm" icon={Upload} loading={uploading} onClick={pick}>{uploading ? 'Uploading' : 'Upload a document'}</Button>}
          />
        </div>
      ) : (
        <List>
          {org.documents.map((d) => {
            const id = docId(d);
            return (
              <div key={id} className={styles.row}>
                <span className={styles.docIcon} aria-hidden="true"><FileText size={20} /></span>
                <div className={styles.rowMain}>
                  <span className={`${styles.rowTitle} ${styles.ellipsis}`}>{d.filename}</span>
                  <span className={styles.rowSub}>{formatSize(d.size)} · {formatDate(d.uploadedAt)}</span>
                </div>
                {confirmId === id ? (
                  <div className={styles.confirm}>
                    <span className={styles.confirmText}>Delete this file?</span>
                    <div className={styles.confirmBtns}>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)} disabled={busyId === id}>Keep</Button>
                      <Button variant="danger" size="sm" loading={busyId === id} onClick={() => remove(id)}>Delete</Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.rowActions}>
                    <Button variant="ghost" size="sm" icon={Eye} loading={busyId === id} onClick={() => view(id, d.filename)} aria-label={`View ${d.filename}`}>
                      <span className={styles.hideXs}>View</span>
                    </Button>
                    <Button variant="ghost" size="sm" icon={Trash2} className={styles.removeBtn} onClick={() => setConfirmId(id)} aria-label={`Delete ${d.filename}`}>
                      <span className={styles.hideXs}>Delete</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </List>
      )}

      {error && <Alert tone="danger" icon={AlertCircle}>{error}</Alert>}
    </section>
  );
}

export default function OrgCard({ org, onChange }) {
  const status = STATUS[org.status] || STATUS.pending;
  return (
    <Card as="article" padding="none" className={styles.orgCard}>
      <header className={styles.orgHead}>
        <div className={styles.orgHeadText}>
          <h2 className={styles.orgTitle}>{org.name}</h2>
          <p className={styles.orgMeta}>
            <span className={styles.metaItem}><Stethoscope size={14} aria-hidden="true" />{org.type}</span>
            <span className={styles.metaItem}><MapPin size={14} aria-hidden="true" />{org.address}</span>
          </p>
        </div>
        <Badge tone={status.tone} icon={status.icon}>{status.label}</Badge>
      </header>

      <div className={styles.orgBody}>
        <Alert tone={status.alert} icon={status.icon}>{status.text}</Alert>

        {org.services?.length > 0 && (
          <div className={styles.services} aria-label="Services">
            {org.services.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
          </div>
        )}

        {org.status !== 'rejected' && (
          <>
            <StaffSection org={org} onChange={onChange} />
            <DocumentsSection org={org} onChange={onChange} />
          </>
        )}
      </div>
    </Card>
  );
}
