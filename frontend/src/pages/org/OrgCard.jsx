import { useRef, useState } from 'react';
import { addStaffMember, removeStaffMember, uploadFile, deleteFile, openFile } from '../../services/api';
import Spinner from '../../components/Spinner';
import styles from './OrgDashboard.module.css';

const SPECIALTIES = ['Cardiologist', 'General Physician', 'Pediatrician', 'Dermatologist', 'Gastroenterologist', 'Orthopedist'];
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

const STATUS = {
  pending: {
    label: 'Pending review',
    cls: 'statusPending',
    text: 'Our team is verifying your facility. You can add staff and upload verification documents now. Patients can book your doctors once you are approved.'
  },
  approved: {
    label: 'Approved',
    cls: 'statusApproved',
    text: 'Your facility is live. Every staff member you add becomes a bookable doctor session for patients straight away.'
  },
  rejected: {
    label: 'Not approved',
    cls: 'statusRejected',
    text: 'This listing was not approved. Please check your details and documents, then register the facility again with corrected information.'
  }
};

const formatSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

function StaffSection({ org, onChange }) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const add = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) { setError('Enter the staff member\'s name.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await addStaffMember(org.id, { name: n, specialty: specialty.trim() || 'General Physician' });
      onChange({ ...org, staff: res.data });
      setName('');
      setSpecialty('');
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  const listId = `specialties-${org.id}`;

  return (
    <section className={styles.section} aria-labelledby={`staff-${org.id}`}>
      <h3 id={`staff-${org.id}`} className={styles.sectionTitle}>Doctors and staff <span className={styles.count}>{org.staff.length}</span></h3>
      {org.status === 'approved'
        ? <p className={styles.muted}>New doctors appear in patients&apos; booking list immediately.</p>
        : <p className={styles.muted}>Doctors become bookable by patients once your facility is approved.</p>}

      {org.staff.length === 0 ? (
        <p className={styles.empty}>No staff added yet.</p>
      ) : (
        <ul className={styles.list}>
          {org.staff.map((s) => (
            <li key={s._id} className={styles.listItem}>
              <div className={styles.itemMain}>
                <span className={styles.itemTitle}>{s.name}</span>
                <span className={styles.itemSub}>{s.specialty}</span>
              </div>
              {confirmId === s._id ? (
                <div className={styles.confirm}>
                  <span>Remove? Unbooked sessions will be deleted.</span>
                  <button type="button" className={styles.btnDanger} disabled={removingId === s._id} onClick={() => remove(s._id)}>
                    {removingId === s._id ? <Spinner size="sm" /> : 'Remove'}
                  </button>
                  <button type="button" className={styles.btnGhost} onClick={() => setConfirmId(null)}>Keep</button>
                </div>
              ) : (
                <button type="button" className={styles.btnLink} onClick={() => setConfirmId(s._id)} aria-label={`Remove ${s.name}`}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className={styles.addRow} onSubmit={add} noValidate>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Doctor name"
          aria-label="Doctor name"
          maxLength={80}
        />
        <input
          className={styles.input}
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          list={listId}
          placeholder="Specialty"
          aria-label="Specialty"
          maxLength={60}
        />
        <datalist id={listId}>{SPECIALTIES.map((s) => <option key={s} value={s} />)}</datalist>
        <button type="submit" className={styles.btnPrimary} disabled={busy}>
          {busy ? <Spinner size="sm" /> : 'Add'}
        </button>
      </form>
      {error && <p className={styles.formError} role="alert">{error}</p>}
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
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const view = async (id, filename) => {
    setBusyId(id);
    setError('');
    try { await openFile(id, filename); } catch (err) { setError(err.message); } finally { setBusyId(null); }
  };

  const remove = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await deleteFile(id);
      onChange({ ...org, documents: org.documents.filter((d) => docId(d) !== id) });
      setConfirmId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={styles.section} aria-labelledby={`docs-${org.id}`}>
      <h3 id={`docs-${org.id}`} className={styles.sectionTitle}>Verification documents <span className={styles.count}>{org.documents.length}</span></h3>
      <p className={styles.muted}>Upload your licence or registration certificate so we can verify you. PDF, PNG, JPG or WEBP, up to 2 MB each.</p>

      {org.documents.length === 0 ? (
        <p className={styles.empty}>No documents uploaded yet.</p>
      ) : (
        <ul className={styles.list}>
          {org.documents.map((d) => {
            const id = docId(d);
            return (
              <li key={id} className={styles.listItem}>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{d.filename}</span>
                  <span className={styles.itemSub}>{formatSize(d.size)} &middot; {formatDate(d.uploadedAt)}</span>
                </div>
                {confirmId === id ? (
                  <div className={styles.confirm}>
                    <span>Delete this file?</span>
                    <button type="button" className={styles.btnDanger} disabled={busyId === id} onClick={() => remove(id)}>
                      {busyId === id ? <Spinner size="sm" /> : 'Delete'}
                    </button>
                    <button type="button" className={styles.btnGhost} onClick={() => setConfirmId(null)}>Keep</button>
                  </div>
                ) : (
                  <div className={styles.itemActions}>
                    <button type="button" className={styles.btnLink} disabled={busyId === id} onClick={() => view(id, d.filename)}>View</button>
                    <button type="button" className={styles.btnLink} onClick={() => setConfirmId(id)} aria-label={`Delete ${d.filename}`}>Delete</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" hidden onChange={upload} />
      <button type="button" className={styles.btnOutline} disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <><Spinner size="sm" /> Uploading...</> : 'Upload a document'}
      </button>
      {error && <p className={styles.formError} role="alert">{error}</p>}
    </section>
  );
}

export default function OrgCard({ org, onChange }) {
  const status = STATUS[org.status] || STATUS.pending;
  return (
    <article className={styles.card}>
      <header className={styles.orgHead}>
        <div className={styles.orgHeadText}>
          <h2 className={styles.cardTitle}>{org.name}</h2>
          <p className={styles.muted}>{org.type} &middot; {org.address}</p>
        </div>
        <span className={`${styles.statusBadge} ${styles[status.cls]}`}>{status.label}</span>
      </header>

      <div className={`${styles.banner} ${styles[`${status.cls}Banner`]}`} role="status">
        <strong>{status.label}.</strong> {status.text}
      </div>

      {org.services?.length > 0 && (
        <div className={styles.chips}>
          {org.services.map((s) => <span key={s} className={styles.chipStatic}>{s}</span>)}
        </div>
      )}

      {org.status !== 'rejected' && (
        <>
          <StaffSection org={org} onChange={onChange} />
          <DocumentsSection org={org} onChange={onChange} />
        </>
      )}
    </article>
  );
}
