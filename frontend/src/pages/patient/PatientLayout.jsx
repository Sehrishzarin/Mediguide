import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { usePatient } from './PatientContext';
import { useAuth } from '../../context/AuthContext';
import styles from './PatientLayout.module.css';

function PatientLayout() {
  const { user, logout: patientLogout } = usePatient();
  const { logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isWeb = Capacitor.getPlatform() === 'web' || !Capacitor.isNativePlatform();

  // Hardware Back Button listener on Native Android/iOS
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener;
    const setupBackListener = async () => {
      listener = await App.addListener('backButton', ({ canGoBack }) => {
        if (location.pathname === '/patient/home' || !canGoBack) {
          App.exitApp();
        } else {
          navigate(-1);
        }
      });
    };
    setupBackListener();

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    patientLogout();
    if (authLogout) authLogout();
    localStorage.removeItem('token');
    localStorage.removeItem('mediguide_patient');
    localStorage.removeItem('mediguide_user');
    sessionStorage.clear();
    navigate('/patient/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className={styles.layout}>
      {/* Slim Top Navigation Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isWeb && location.pathname !== '/patient/home' && (
              <button
                type="button"
                className={styles.backBtnHeader}
                onClick={() => navigate(-1)}
                title="Go back"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>Back</span>
              </button>
            )}

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

      {/* Main Body Screen Area */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Fixed Bottom Mobile Navigation Tab Bar with Central Floating Action Button (FAB) */}
      <nav className={styles.bottomTabBar}>
        <div className={styles.tabInner}>
          {/* 1. Home Tab */}
          <Link to="/patient/home" className={`${styles.tabItem} ${isActive('/patient/home') ? styles.activeTab : ''}`}>
            <svg width="22" height="22" fill={isActive('/patient/home') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className={styles.tabLabel}>Home</span>
          </Link>

          {/* 2. AI Consult Tab */}
          <Link to="/patient/triage" className={`${styles.tabItem} ${isActive('/patient/triage') ? styles.activeTab : ''}`}>
            <svg width="22" height="22" fill={isActive('/patient/triage') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.598.598 0 0 1-.745-.644.598.598 0 0 1 .057-.168A5.946 5.946 0 0 0 6 17.553C3.606 16.037 2.25 13.916 2.25 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            <span className={styles.tabLabel}>Consult</span>
          </Link>

          {/* 3. Floating Action Button (FAB) for Start New Consultation */}
          <div className={styles.fabWrapper}>
            <Link to="/patient/triage" className={styles.fabCircle} title="Start New Consultation">
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>
          </div>

          {/* 4. Appointments / Sessions Tab */}
          <Link to="/patient/slots" className={`${styles.tabItem} ${isActive('/patient/slots') ? styles.activeTab : ''}`}>
            <svg width="22" height="22" fill={isActive('/patient/slots') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span className={styles.tabLabel}>Sessions</span>
          </Link>

          {/* 5. Profile Tab */}
          <Link to="/patient/profile" className={`${styles.tabItem} ${isActive('/patient/profile') ? styles.activeTab : ''}`}>
            <svg width="22" height="22" fill={isActive('/patient/profile') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span className={styles.tabLabel}>Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default PatientLayout;

