import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPendingOrganizations, reviewOrganization, openFile } from '../../services/api';
import Spinner from '../../components/Spinner';
import styles from './AdminDashboard.module.css';

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};
const formatSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} KB`);

function PendingCard({ org, onReview }) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [docError, setDocError] = useState('');

  const view = async (id) => {
    setViewingId(id);
    setDocError('');
    try { await openFile(id); } catch (err) { setDocError(err.message); } finally { setViewingId(null); }
  };

  const docs = org.documents || [];
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardHeadText}>
          <h2 className={styles.cardTitle}>{org.name}</h2>
          <p className={styles.sub}>{org.type} &middot; {org.address}</p>
        </div>
        <span className={styles.badge}>Awaiting review</span>
      </header>

      <dl className={styles.facts}>
        <div><dt>Owner</dt><dd>{org.owner?.name || 'Unknown'}{org.owner?.email && <span className={styles.subBlock}>{org.owner.email}</span>}</dd></div>
        <div><dt>Contact</dt><dd>{org.phone || 'No phone'}{org.email && <span className={styles.subBlock}>{org.email}</span>}</dd></div>
        <div><dt>Staff</dt><dd>{(org.staff || []).length} listed</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(org.createdAt)}</dd></div>
      </dl>

      {org.services?.length > 0 && (
        <div className={styles.chips}>{org.services.map((s) => <span key={s} className={styles.chip}>{s}</span>)}</div>
      )}

      <div className={styles.docs}>
        <h3 className={styles.docsTitle}>Verification documents ({docs.length})</h3>
        {docs.length === 0 ? (
          <p className={styles.warn}>No documents were uploaded. Consider rejecting or waiting.</p>
        ) : (
          <ul className={styles.docList}>
            {docs.map((d) => {
              const id = d.id || d._id;
              return (
                <li key={id} className={styles.docItem}>
                  <span className={styles.docName}>{d.filename} <span className={styles.docMeta}>{formatSize(d.size)}</span></span>
                  <button type="button" className={styles.btnLink} disabled={viewingId === id} onClick={() => view(id)}>
                    {viewingId === id ? <Spinner size="sm" /> : 'View'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {docError && <p className={styles.inlineError} role="alert">{docError}</p>}
      </div>

      <footer className={styles.actions}>
        {confirmReject ? (
          <>
            <span className={styles.confirmText}>Reject {org.name}?</span>
            <button type="button" className={styles.btnDanger} onClick={() => onReview(org, 'rejected')}>Yes, reject</button>
            <button type="button" className={styles.btnGhost} onClick={() => setConfirmReject(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className={styles.btnApprove} onClick={() => onReview(org, 'approved')}>Approve</button>
            <button type="button" className={styles.btnReject} onClick={() => setConfirmReject(true)}>Reject</button>
          </>
        )}
      </footer>
    </article>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState(null); // null while loading
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPendingOrganizations()
      .then((res) => { if (!cancelled) setOrgs(res.data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const refresh = () => {
    setLoadError('');
    setActionError('');
    setNotice('');
    setOrgs(null);
    setReloadKey((k) => k + 1);
  };

  // Optimistic: the card disappears immediately and comes back if the server refuses
  const review = async (org, status) => {
    setActionError('');
    setNotice('');
    const index = orgs.findIndex((o) => o.id === org.id);
    setOrgs((prev) => prev.filter((o) => o.id !== org.id));
    try {
      await reviewOrganization(org.id, status);
      setNotice(status === 'approved'
        ? `${org.name} was approved. Its staff are now bookable by patients.`
        : `${org.name} was rejected.`);
    } catch (err) {
      setOrgs((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, org);
        return next;
      });
      setActionError(`Could not update ${org.name}: ${err.message}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const loading = orgs === null && !loadError;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <img src="/logo.jpg" alt="" width="36" height="36" className={styles.logo} />
            <div>
              <span className={styles.brandName}>MediGuide</span>
              <span className={styles.brandSub}>Admin console</span>
            </div>
          </div>
          <div className={styles.userBox}>
            <span className={styles.userName}>{user?.name}</span>
            <button type="button" className={styles.btnLogout} onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.pageTitle}>Organizations awaiting approval</h1>
            <p className={styles.sub}>Check the documents, then approve or reject each facility.</p>
          </div>
          <button type="button" className={styles.btnGhost} onClick={refresh} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Refresh'}
          </button>
        </div>

        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {actionError && <p className={styles.inlineError} role="alert">{actionError}</p>}

        {loading && (
          <div className={styles.center} role="status" aria-label="Loading organizations"><Spinner size="lg" /></div>
        )}

        {loadError && (
          <div className={styles.errorCard} role="alert">
            <p>{loadError}</p>
            <button type="button" className={styles.btnApprove} onClick={refresh}>Try again</button>
          </div>
        )}

        {orgs !== null && orgs.length === 0 && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon} aria-hidden="true">&#10003;</div>
            <h2>No organizations waiting</h2>
            <p className={styles.sub}>New facility registrations will appear here for review.</p>
          </div>
        )}

        {orgs !== null && (
          <div className={styles.grid}>
            {orgs.map((org) => <PendingCard key={org.id} org={org} onReview={review} />)}
          </div>
        )}
      </main>
    </div>
  );
}
