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
    <div className={styles.layoutWrapper}>
      {/* ── Web Portal Left Sidebar Navigation (Desktop >= 768px) ── */}
      <aside className={styles.desktopSidebar}>
        <div className={styles.sidebarTop}>
          <Link to="/patient/home" className={styles.sidebarBrandLink}>
            <img src="/logo.jpg" alt="MediGuide Logo" className={styles.sidebarLogoImg} />
            <div className={styles.brandTextGroup}>
              <span className={styles.sidebarBrandTitle}>MediGuide</span>
              <span className={styles.sidebarBrandSub}>Portal Hub</span>
            </div>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          <Link to="/patient/home" className={`${styles.sidebarNavItem} ${isActive('/patient/home') ? styles.sidebarNavActive : ''}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>Dashboard</span>
          </Link>

          <Link to="/patient/triage?new=true" className={`${styles.sidebarNavItem} ${isActive('/patient/triage') ? styles.sidebarNavActive : ''}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <span>Consult</span>
          </Link>

          <Link to="/patient/slots" className={`${styles.sidebarNavItem} ${isActive('/patient/slots') ? styles.sidebarNavActive : ''}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span>Doctor Sessions</span>
          </Link>

          <Link to="/patient/profile" className={`${styles.sidebarNavItem} ${isActive('/patient/profile') ? styles.sidebarNavActive : ''}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span>Medical Profile</span>
          </Link>
        </nav>

        {/* Sidebar Bottom Utilities (Emergency, Profile Card & Logout) */}
        <div className={styles.sidebarFooter}>
          <Link to="/patient/emergency" className={styles.sidebarEmergencyBtn}>
            🚨 Emergency Care (1122)
          </Link>

          <div className={styles.sidebarUserCard} onClick={() => navigate('/patient/profile')}>
            <div className={styles.sidebarAvatarCircle}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className={styles.sidebarUserInfo}>
              <span className={styles.sidebarUserName}>{user?.name || 'Patient User'}</span>
              <span className={styles.sidebarUserEmail}>{user?.email || 'patient@mediguide.com'}</span>
            </div>
          </div>

          <button type="button" onClick={handleLogout} className={styles.sidebarLogoutBtn}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H8.25" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className={styles.mainContentWrapper}>
        {/* Mobile Header (Screens < 768px — No back button) */}
        <header className={styles.mobileHeader}>
          <Link to="/patient/home" className={styles.mobileBrandLink}>
            <img src="/logo.jpg" alt="MediGuide Logo" style={{ height: '32px', width: 'auto', borderRadius: '6px' }} />
            <span className={styles.mobileBrandName}>MediGuide</span>
          </Link>
        </header>

        {/* Main Body Screen Area */}
        <main className={styles.mainContainer}>
          <Outlet />
        </main>
      </div>

      {/* ── Fixed Bottom Mobile Tab Bar (Screens < 768px) ── */}
      <nav className={styles.bottomTabBar}>
        <div className={styles.tabInner}>
          <Link to="/patient/home" className={`${styles.tabItem} ${isActive('/patient/home') ? styles.activeTab : ''}`}>
            <svg width="22" height="22" fill={isActive('/patient/home') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className={styles.tabLabel}>Home</span>
          </Link>

          <Link to="/patient/triage?new=true" className={`${styles.tabItem} ${isActive('/patient/triage') ? styles.activeTab : ''}`}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <span className={styles.tabLabel}>Consult</span>
          </Link>

          <div className={styles.fabWrapper}>
            <Link to="/patient/triage?new=true" className={styles.fabCircle} title="New Consult">
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>
          </div>

          <Link to="/patient/slots" className={`${styles.tabItem} ${isActive('/patient/slots') ? styles.activeTab : ''}`}>
            <svg width="22" height="22" fill={isActive('/patient/slots') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span className={styles.tabLabel}>Sessions</span>
          </Link>

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

