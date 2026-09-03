import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../services/api';
import ErrorToast from '../../components/ErrorToast';
import styles from './AdminDashboard.module.css';

const ADMIN_PASSWORD = 'admin123';

function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) { setAuthenticated(true); setAuthError(''); }
    else { setAuthError('Incorrect password.'); }
  };

  const fetchOrgs = async () => {
    setLoading(true); setError('');
    try {
      const { organizations } = await api.getPendingOrganizations();
      setOrgs(organizations);
    } catch (err) { setError(err.message || 'Failed to load organizations.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (authenticated) fetchOrgs(); }, [authenticated]);

  const handleAction = async (orgId, action) => {
    setActionInProgress(orgId); setError('');
    try {
      if (action === 'approve') await api.approveOrganization(orgId);
      else await api.rejectOrganization(orgId);
      await fetchOrgs();
    } catch (err) { setError(err.message || `Failed to ${action} organization.`); }
    finally { setActionInProgress(null); }
  };

  if (!authenticated) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <Link to="/" className={styles.backLink}>&larr; MediGuide Home</Link>
          </div>
          <h1 className={styles.loginTitle}>Admin Access</h1>
          <p className={styles.loginSubtext}>Enter the admin password to continue.</p>
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div>
              <label className={styles.fieldLabel}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" className={styles.input} autoFocus />
            </div>
            {authError && <p className={styles.errorMsg}>{authError}</p>}
            <button type="submit" className={styles.loginBtn}>Unlock Dashboard</button>
          </form>
          <p className={styles.demoHint}>Demo password: <code className={styles.demoCode}>admin123</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.dashboardWrapper}>
        <div className={styles.dashHeader}>
          <div>
            <Link to="/" className={styles.backLink}>&larr; MediGuide Home</Link>
            <h1 className={styles.dashHeading}>Admin Dashboard</h1>
            <p className={styles.dashSubtext}>Review and manage pending organization registrations.</p>
          </div>
          <button onClick={fetchOrgs} disabled={loading} className={styles.refreshBtn}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && <ErrorToast message={error} onClose={() => setError('')} />}

        {loading && orgs.length === 0 && (
          <div className={styles.stateCard}>
            <p className={styles.loadingText}>Loading pending organizations...</p>
          </div>
        )}

        {!loading && orgs.length === 0 && (
          <div className={styles.stateCard}>
            <svg className={styles.stateSvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className={styles.stateTitle}>All caught up!</p>
            <p className={styles.stateDesc}>No pending organizations to review.</p>
          </div>
        )}

        <div className={styles.orgList}>
          {orgs.map((org) => {
            const isBusy = actionInProgress === org.id;
            return (
              <div key={org.id} className={styles.orgCard}>
                <div className={styles.orgTop}>
                  <div>
                    <h2 className={styles.orgName}>{org.name}</h2>
                    <span className={styles.orgBadge}>{org.type}</span>
                  </div>
                  <span className={styles.orgDate}>
                    {org.submittedAt ? new Date(org.submittedAt).toLocaleDateString() : ''}
                  </span>
                </div>
                {org.address && <p className={styles.orgAddress}>{org.address}</p>}
                <div className={styles.docsSection}>
                  <p className={styles.docsLabel}>Documents ({org.documents?.length || 0})</p>
                  {org.documents && org.documents.length > 0 ? (
                    <ul className={styles.docList}>
                      {org.documents.map((doc) => (
                        <li key={doc.id} className={styles.docItem}>
                          <svg className={styles.docSvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                          <span className={styles.docName}>{doc.filename}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className={styles.noDocs}>No documents uploaded.</p>}
                </div>
                <div className={styles.actionRow}>
                  <button onClick={() => handleAction(org.id, 'approve')} disabled={isBusy} className={styles.approveBtn}>
                    {isBusy ? 'Processing...' : 'Approve'}
                  </button>
                  <button onClick={() => handleAction(org.id, 'reject')} disabled={isBusy} className={styles.rejectBtn}>
                    {isBusy ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
