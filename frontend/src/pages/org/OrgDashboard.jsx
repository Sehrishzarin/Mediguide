import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyOrganizations } from '../../services/api';
import { Button, Card, ErrorState, PageHeader, SectionHeader, Skeleton } from '../../components/ui';
import PortalShell from '../../components/portal/PortalShell';
import friendlyError from '../../utils/friendlyError';
import OrgCard from './OrgCard';
import OrgRegisterForm from './OrgRegisterForm';
import styles from './OrgDashboard.module.css';

function LoadingCards() {
  return (
    <div className={styles.stack} role="status" aria-label="Loading your facilities">
      {[0, 1].map((i) => (
        <Card key={i} padding="lg" className={styles.skeletonCard}>
          <Skeleton width="45%" height={20} />
          <Skeleton width="70%" height={14} />
          <Skeleton height={56} radius={12} />
          <Skeleton height={120} radius={12} />
        </Card>
      ))}
    </div>
  );
}

export default function OrgDashboard() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState(null); // null while loading
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyOrganizations()
      .then((res) => { if (!cancelled) setOrgs(res.data); })
      .catch((err) => { if (!cancelled) setLoadError(friendlyError(err, 'We could not load your facilities.')); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const retry = () => {
    setLoadError('');
    setOrgs(null);
    setReloadKey((k) => k + 1);
  };

  const replaceOrg = useCallback((updated) => {
    setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }, []);

  const onCreated = (created) => {
    setOrgs((prev) => [{ staff: [], documents: [], services: [], ...created }, ...(prev || [])]);
    setShowForm(false);
  };

  const loading = orgs === null && !loadError;
  const noOrgs = orgs !== null && orgs.length === 0;
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'there';

  return (
    <PortalShell portalName="Organization portal">
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="Register your facility, then add your doctors. Once an administrator approves it, patients can book your staff on MediGuide."
      />

      {loading && <LoadingCards />}

      {loadError && (
        <Card>
          <ErrorState message={loadError} onRetry={retry} />
        </Card>
      )}

      {orgs !== null && (
        <div className={styles.stack}>
          {(noOrgs || showForm) ? (
            <OrgRegisterForm
              defaultEmail={user?.email}
              onCreated={onCreated}
              onCancel={noOrgs ? null : () => setShowForm(false)}
              first={noOrgs}
            />
          ) : (
            <SectionHeader
              title={`Your facilities (${orgs.length})`}
              action={<Button variant="secondary" size="sm" icon={Plus} onClick={() => setShowForm(true)}>Add facility</Button>}
              className={styles.sectionHeader}
            />
          )}

          {orgs.map((org) => <OrgCard key={org.id} org={org} onChange={replaceOrg} />)}
        </div>
      )}
    </PortalShell>
  );
}
