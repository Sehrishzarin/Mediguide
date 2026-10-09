import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Eye, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as api from '../../../services/api';
import { Alert, Button, EmptyState, ErrorState, List, Skeleton } from '../../../components/ui';
import friendlyError from '../../../utils/friendlyError';
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
      .catch((e) => { if (!cancelled) setLoadError(friendlyError(e, 'We could not load your reports.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retry = () => { setLoading(true); setLoadError(''); setReloadKey((k) => k + 1); };
  const pick = () => inputRef.current?.click();

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
      setMessage({ type: 'error', text: friendlyError(err, 'The upload did not go through. Please try again.') });
    } finally {
      setUploading(false);
    }
  };

  const view = async (f) => {
    setBusyId(f.id);
    setMessage({ type: '', text: '' });
    try {
      await api.openFile(f.id, f.filename);
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'We could not open this report.') });
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
      setMessage({ type: 'error', text: friendlyError(err, 'We could not delete this report.') });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.reportsTop}>
        <span className={styles.reportsCount}>{loading || loadError ? '' : `${files.length} of ${MAX_FILES} used`}</span>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={onPick} tabIndex={-1} aria-hidden="true" />
        {!loadError && !(files.length === 0 && !loading) && (
          <Button variant="secondary" icon={Upload} onClick={pick} loading={uploading} disabled={loading}>
            {uploading ? 'Uploading' : 'Upload report'}
          </Button>
        )}
      </div>

      <div aria-live="polite">
        {message.text && (
          <Alert tone={message.type === 'error' ? 'danger' : 'success'} icon={message.type === 'error' ? AlertCircle : CheckCircle2}>
            {message.text}
          </Alert>
        )}
      </div>

      {loading && (
        <div className={styles.skeletonList} aria-label="Loading reports" role="status">
          {[0, 1].map((i) => (
            <div key={i} className={styles.skeletonRow}>
              <Skeleton width={40} height={40} radius={12} />
              <div className={styles.skeletonText}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="35%" height={12} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && loadError && <ErrorState compact message={loadError} onRetry={retry} />}

      {!loading && !loadError && files.length === 0 && (
        <EmptyState
          compact
          icon={FileText}
          title="No reports yet"
          text="Upload lab results or prescriptions so you can find them quickly."
          action={<Button size="sm" icon={Upload} onClick={pick} loading={uploading}>Upload your first report</Button>}
        />
      )}

      {!loading && !loadError && files.length > 0 && (
        <List>
          {files.map((f) => {
            const isPdf = f.mimeType === 'application/pdf';
            const Icon = isPdf ? FileText : ImageIcon;
            const busy = busyId === f.id;
            return (
              <div key={f.id} className={styles.fileRow}>
                <span className={styles.fileIcon} aria-hidden="true"><Icon size={20} /></span>
                <div className={styles.fileInfo}>
                  <p className={styles.fileName}>{f.filename}</p>
                  <p className={styles.fileMeta}>{isPdf ? 'PDF' : 'Image'} · {formatBytes(f.size)} · {fmtDate(f.uploadedAt)}</p>
                </div>
                {confirmId === f.id ? (
                  <div className={styles.fileActions}>
                    <span className={styles.confirmText}>Delete?</span>
                    <Button variant="danger" size="sm" onClick={() => remove(f.id)} loading={busy}>Delete</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)} disabled={busy}>Keep</Button>
                  </div>
                ) : (
                  <div className={styles.fileActions}>
                    <Button variant="ghost" size="sm" icon={Eye} onClick={() => view(f)} loading={busy} aria-label={`View ${f.filename}`}><span className={styles.hideXs}>View</span></Button>
                    <Button variant="ghost" size="sm" icon={Trash2} className={styles.deleteBtn} onClick={() => setConfirmId(f.id)} aria-label={`Delete ${f.filename}`}>
                      <span className={styles.hideXs}>Delete</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </List>
      )}
    </div>
  );
}
