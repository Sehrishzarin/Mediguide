import { useState, useEffect } from 'react';
import { Clock, MapPin, Stethoscope, FileText, Eye, Check, X, RotateCw, CheckCircle2, AlertCircle, AlertTriangle, Inbox } from 'lucide-react';
import { getPendingOrganizations, reviewOrganization, openFile } from '../../services/api';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, List, PageHeader, Skeleton } from '../../components/ui';
import PortalShell from '../../components/portal/PortalShell';
import friendlyError from '../../utils/friendlyError';
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

  const view = async (id, filename) => {
    setViewingId(id);
    setDocError('');
    try { await openFile(id, filename); } catch (err) { setDocError(friendlyError(err, 'We could not open this document.')); } finally { setViewingId(null); }
  };

  const docs = org.documents || [];
  return (
    <Card as="article" padding="none" className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardHeadText}>
          <h2 className={styles.cardTitle}>{org.name}</h2>
          <p className={styles.meta}>
            <span className={styles.metaItem}><Stethoscope size={14} aria-hidden="true" />{org.type}</span>
            <span className={styles.metaItem}><MapPin size={14} aria-hidden="true" />{org.address}</span>
            {Array.isArray(org.location?.coordinates) && (
              // Let the reviewer check the pin matches the address before approving
              <a
                className={styles.metaItem}
                href={`https://www.google.com/maps/search/?api=1&query=${org.location.coordinates[1]},${org.location.coordinates[0]}`}
                target="_blank"
                rel="noreferrer"
              >
                View location on map
              </a>
            )}
          </p>
        </div>
        <Badge tone="warning" icon={Clock}>Pending</Badge>
      </header>

      <div className={styles.cardBody}>
        <dl className={styles.facts}>
          <div>
            <dt>Owner</dt>
            <dd>{org.owner?.name || 'Unknown'}{org.owner?.email && <span className={styles.subBlock}>{org.owner.email}</span>}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>{org.phone || 'No phone'}{org.email && <span className={styles.subBlock}>{org.email}</span>}</dd>
          </div>
          <div><dt>Staff</dt><dd>{(org.staff || []).length} listed</dd></div>
          <div><dt>Submitted</dt><dd>{formatDate(org.createdAt) || 'Unknown'}</dd></div>
        </dl>

        {org.services?.length > 0 && (
          <div className={styles.services} aria-label="Services">
            {org.services.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
          </div>
        )}

        <section className={styles.docs} aria-label="Verification documents">
          <h3 className={styles.docsTitle}>Verification documents <Badge>{docs.length}</Badge></h3>
          {docs.length === 0 ? (
            <Alert tone="warning" icon={AlertTriangle}>No documents were uploaded. Consider waiting or rejecting.</Alert>
          ) : (
            <List>
              {docs.map((d) => {
                const id = d.id || d._id;
                return (
                  <div key={id} className={styles.docRow}>
                    <span className={styles.docIcon} aria-hidden="true"><FileText size={18} /></span>
                    <span className={styles.docText}>
                      <span className={styles.docName}>{d.filename}</span>
                      <span className={styles.docMeta}>{formatSize(d.size)}</span>
                    </span>
                    <Button variant="ghost" size="sm" icon={Eye} loading={viewingId === id} onClick={() => view(id, d.filename)} aria-label={`View ${d.filename}`} className={styles.viewBtn}>
                      View
                    </Button>
                  </div>
                );
              })}
            </List>
          )}
          {docError && <Alert tone="danger" icon={AlertCircle}>{docError}</Alert>}
        </section>
      </div>

      <footer className={styles.actions}>
        {confirmReject ? (
          <>
            <span className={styles.confirmText}>Reject {org.name}?</span>
            <div className={styles.actionBtns}>
              <Button variant="secondary" onClick={() => setConfirmReject(false)}>Cancel</Button>
              <Button variant="danger" icon={X} onClick={() => onReview(org, 'rejected')}>Yes, reject</Button>
            </div>
          </>
        ) : (
          <div className={styles.actionBtns}>
            <Button variant="secondary" icon={X} onClick={() => setConfirmReject(true)}>Reject</Button>
            <Button icon={Check} onClick={() => onReview(org, 'approved')}>Approve</Button>
          </div>
        )}
      </footer>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className={styles.grid} role="status" aria-label="Loading organizations">
      {[0, 1].map((i) => (
        <Card key={i} padding="lg" className={styles.skeletonCard}>
          <Skeleton width="55%" height={20} />
          <Skeleton width="75%" height={14} />
          <Skeleton height={72} radius={12} />
          <Skeleton height={48} radius={12} />
        </Card>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [orgs, setOrgs] = useState(null); // null while loading
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPendingOrganizations()
      .then((res) => { if (!cancelled) setOrgs(res.data); })
      .catch((err) => { if (!cancelled) setLoadError(friendlyError(err, 'We could not load the review queue.')); });
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
      setActionError(`We could not update ${org.name}. ${friendlyError(err, 'Please try again.')}`);
    }
  };

  const loading = orgs === null && !loadError;

  return (
    <PortalShell portalName="Admin console">
      <PageHeader
        title="Facility review"
        subtitle="Check each facility's documents, then approve or reject it."
        actions={<Button variant="secondary" size="sm" icon={RotateCw} onClick={refresh} disabled={loading} className={styles.refresh}>Refresh</Button>}
      />

      <div className={styles.messages} aria-live="polite">
        {notice && <Alert tone="success" icon={CheckCircle2}>{notice}</Alert>}
        {actionError && <Alert tone="danger" icon={AlertCircle}>{actionError}</Alert>}
      </div>

      {orgs !== null && orgs.length > 0 && (
        <p className={styles.count}>{orgs.length} {orgs.length === 1 ? 'facility' : 'facilities'} waiting for review</p>
      )}

      {loading && <LoadingCards />}

      {loadError && (
        <Card><ErrorState message={loadError} onRetry={refresh} /></Card>
      )}

      {orgs !== null && orgs.length === 0 && (
        <Card>
          <EmptyState icon={Inbox} title="All caught up" text="New facility registrations will appear here for review." />
        </Card>
      )}

      {orgs !== null && orgs.length > 0 && (
        <div className={styles.grid}>
          {orgs.map((org) => <PendingCard key={org.id} org={org} onReview={review} />)}
        </div>
      )}
    </PortalShell>
  );
}
