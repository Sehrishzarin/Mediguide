import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyOrganizations } from '../../services/api';
import Spinner from '../../components/Spinner';
import OrgCard from './OrgCard';
import OrgRegisterForm from './OrgRegisterForm';
import styles from './OrgDashboard.module.css';

export default function OrgDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState(null); // null while loading
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyOrganizations()
      .then((res) => { if (!cancelled) setOrgs(res.data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const loading = orgs === null && !loadError;
  const noOrgs = orgs !== null && orgs.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <img src="/logo.jpg" alt="" width="36" height="36" className={styles.logo} />
            <div>
              <span className={styles.brandName}>MediGuide</span>
              <span className={styles.brandSub}>Organization portal</span>
            </div>
          </div>
          <div className={styles.userBox}>
            <span className={styles.userName}>{user?.name}</span>
            <button type="button" className={styles.btnLogout} onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <h1 className={styles.pageTitle}>Welcome, {user?.name || 'there'}</h1>
          <p className={styles.muted}>
            Register your facility, then add your doctors. Once an administrator approves your facility, your staff become
            bookable by patients on MediGuide.
          </p>
        </section>

        {loading && (
          <div className={styles.center} role="status" aria-label="Loading your facilities">
            <Spinner size="lg" />
          </div>
        )}

        {loadError && (
          <div className={styles.errorCard} role="alert">
            <p>{loadError}</p>
            <button type="button" className={styles.btnPrimary} onClick={retry}>Try again</button>
          </div>
        )}

        {orgs !== null && (
          <>
            {(noOrgs || showForm) ? (
              <OrgRegisterForm
                defaultEmail={user?.email}
                onCreated={onCreated}
                onCancel={noOrgs ? null : () => setShowForm(false)}
              />
            ) : (
              <div className={styles.toolbar}>
                <h2 className={styles.sectionHeading}>Your facilities</h2>
                <button type="button" className={styles.btnOutline} onClick={() => setShowForm(true)}>+ Add another facility</button>
              </div>
            )}

            {orgs.map((org) => <OrgCard key={org.id} org={org} onChange={replaceOrg} />)}
          </>
        )}
      </main>
    </div>
  );
}
