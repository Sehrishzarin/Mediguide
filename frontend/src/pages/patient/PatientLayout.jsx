import { Link, Outlet, useNavigate } from 'react-router-dom';
import { usePatient } from './PatientContext';
import { useAuth } from '../../context/AuthContext';
import styles from './PatientLayout.module.css';

function PatientLayout() {
  const { user, logout: patientLogout } = usePatient();
  const { logout: authLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    patientLogout();
    if (authLogout) authLogout();
    localStorage.removeItem('token');
    localStorage.removeItem('mediguide_patient');
    localStorage.removeItem('mediguide_user');
    sessionStorage.clear();
    navigate('/patient/login', { replace: true });
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className={styles.backBtnHeader}
              onClick={() => navigate(-1)}
              title="Go back"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span>Back</span>
            </button>

            <Link to="/patient/home" className={styles.brandLink}>
              <svg className={styles.brandIcon} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
              <span className={styles.brandName}>MediGuide</span>
            </Link>
          </div>

          <div className={styles.headerActions}>
            <Link to="/patient/profile" className={styles.profileLink} title="Profile">
              <div className={styles.avatar}>
                <svg className={styles.avatarIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              {user?.name && <span className={styles.userName}>{user.name}</span>}
            </Link>
            <button onClick={handleLogout} className={styles.logoutBtn} title="Log out">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default PatientLayout;
