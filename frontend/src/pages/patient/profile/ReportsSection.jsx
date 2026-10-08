import { useEffect, useRef, useState } from 'react';
import * as api from '../../../services/api';
import Spinner from '../../../components/Spinner';
import { REPORT_MAX_BYTES, REPORT_TYPES, formatBytes } from './profileModel';
import styles from '../PatientProfile.module.css';

const MAX_FILES = 25;

const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ReportsSection() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.listFiles('report')
      .then((res) => { if (!cancelled) { setFiles(res.data || []); setLoadError(''); } })
      .catch((e) => { if (!cancelled) setLoadError(e.message || 'Could not load your reports.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retry = () => { setLoading(true); setLoadError(''); setReloadKey((k) => k + 1); };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!REPORT_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only PDF, PNG, JPG or WEBP files can be uploaded.' });
      return;
    }
    if (file.size > REPORT_MAX_BYTES) {
      setMessage({ type: 'error', text: `That file is ${formatBytes(file.size)}. The limit is 2 MB. Try a smaller scan or photo.` });
      return;
    }
    if (files.length >= MAX_FILES) {
      setMessage({ type: 'error', text: `You can store up to ${MAX_FILES} reports. Delete one to add another.` });
      return;
    }
    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await api.uploadFile(file, { kind: 'report' });
      setFiles((f) => [res.data, ...f]);
      setMessage({ type: 'ok', text: `${file.name} uploaded.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const view = async (id) => {
    setBusyId(id);
    setMessage({ type: '', text: '' });
    try {
      await api.openFile(id);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not open this report.' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    setMessage({ type: '', text: '' });
    try {
      await api.deleteFile(id);
      setFiles((f) => f.filter((x) => x.id !== id));
      setConfirmId(null);
      setMessage({ type: 'ok', text: 'Report deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not delete this report.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.reportsTop}>
        <span className={styles.reportsCount}>{loading ? ' ' : `${files.length} of ${MAX_FILES} used`}</span>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className={styles.hiddenInput} onChange={onPick} tabIndex={-1} aria-hidden="true" />
        <button type="button" className={styles.secondaryBtn} onClick={() => inputRef.current?.click()} disabled={uploading || loading}>
          {uploading ? <><Spinner size="sm" /> Uploading…</> : 'Upload report'}
        </button>
      </div>

      <div aria-live="polite">
        {message.text && <p className={message.type === 'error' ? styles.inlineError : styles.inlineOk} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      </div>

      {loading && <div className={styles.centerState}><Spinner size="md" /><span>Loading reports…</span></div>}

      {!loading && loadError && (
        <div className={styles.inlineError} role="alert">
          {loadError} <button type="button" className={styles.textBtn} onClick={retry}>Try again</button>
        </div>
      )}

      {!loading && !loadError && files.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No reports yet</p>
          <p className={styles.emptyText}>Upload lab results or prescriptions so you can find them quickly.</p>
        </div>
      )}

      {!loading && files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((f) => (
            <li key={f.id} className={styles.fileItem}>
              <div className={styles.fileIcon} aria-hidden="true">{f.mimeType === 'application/pdf' ? 'PDF' : 'IMG'}</div>
              <div className={styles.fileInfo}>
                <p className={styles.fileName}>{f.filename}</p>
                <p className={styles.fileMeta}>{formatBytes(f.size)} · {fmtDate(f.uploadedAt)}</p>
              </div>
              {confirmId === f.id ? (
                <div className={styles.fileActions}>
                  <span className={styles.confirmText}>Delete?</span>
                  <button type="button" className={styles.dangerSmall} onClick={() => remove(f.id)} disabled={busyId === f.id}>
                    {busyId === f.id ? <Spinner size="sm" /> : 'Delete'}
                  </button>
                  <button type="button" className={styles.ghostSmall} onClick={() => setConfirmId(null)} disabled={busyId === f.id}>Cancel</button>
                </div>
              ) : (
                <div className={styles.fileActions}>
                  <button type="button" className={styles.ghostSmall} onClick={() => view(f.id)} disabled={busyId === f.id}>
                    {busyId === f.id ? <Spinner size="sm" /> : 'View'}
                  </button>
                  <button type="button" className={styles.ghostSmallDanger} onClick={() => setConfirmId(f.id)} aria-label={`Delete ${f.filename}`}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
