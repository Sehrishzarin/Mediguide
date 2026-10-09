import { useEffect, useCallback, useRef } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from '../../context/AuthContext';
import styles from './PatientLayout.module.css';

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  home: 'm2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  consult: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z',
  sessions: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  appointments: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  profile: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  logout: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H8.25',
  plus: 'M12 4.5v15m7.5-7.5h-15',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z'
};

const SIDEBAR_ITEMS = [
  { to: '/patient/home', label: 'Dashboard', icon: 'home' },
  { to: '/patient/triage?new=true', label: 'Consult', icon: 'consult' },
  { to: '/patient/slots', label: 'Doctor Sessions', icon: 'sessions' },
  { to: '/patient/appointments', label: 'My Appointments', icon: 'appointments' },
  { to: '/patient/profile', label: 'Profile & Settings', icon: 'profile' }
];

const TAB_LEFT = [
  { to: '/patient/home', label: 'Home', icon: 'home' },
  { to: '/patient/triage?new=true', label: 'Consult', icon: 'consult' }
];
const TAB_RIGHT = [
  { to: '/patient/slots', label: 'Sessions', icon: 'sessions' },
  { to: '/patient/profile', label: 'Profile', icon: 'profile' }
];

function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const headerRef = useRef(null);
  const tabBarRef = useRef(null);

  // Publish the real rendered heights of the mobile top bar and tab bar as CSS variables
  // (--app-header-h / --app-tabbar-h). Full-height screens such as the chat use them, so
  // safe areas, notches and large system fonts never make content slide underneath.
  useEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      const header = headerRef.current;
      const tabBar = tabBarRef.current;
      root.style.setProperty('--app-header-h', `${header ? header.offsetHeight : 0}px`);
      root.style.setProperty('--app-tabbar-h', `${tabBar ? tabBar.offsetHeight : 0}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (headerRef.current) observer.observe(headerRef.current);
    if (tabBarRef.current) observer.observe(tabBarRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--app-header-h');
      root.style.removeProperty('--app-tabbar-h');
    };
  }, []);

  // Hardware back button on native Android/iOS
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let listener;
    let removed = false;
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (pathname === '/patient/home' || !canGoBack) CapApp.exitApp();
      else navigate(-1);
    }).then((handle) => {
      if (removed) handle.remove();
      else listener = handle;
    });
    return () => {
      removed = true;
      if (listener) listener.remove();
    };
  }, [pathname, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';
  const inEmergency = pathname.startsWith('/patient/emergency');

  return (
    <div className={styles.layoutWrapper}>
      <aside className={styles.desktopSidebar} aria-label="Main navigation">
        <Link to="/patient/home" className={styles.sidebarBrandLink}>
          <img src="/logo.jpg" alt="" className={styles.sidebarLogoImg} />
          <div className={styles.brandTextGroup}>
            <span className={styles.sidebarBrandTitle}>MediGuide</span>
            <span className={styles.sidebarBrandSub}>Patient Portal</span>
          </div>
        </Link>

        <nav className={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `${styles.sidebarNavItem} ${isActive ? styles.sidebarNavActive : ''}`}
            >
              <Icon d={ICONS[item.icon]} size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link to="/patient/emergency" className={`${styles.sidebarEmergencyBtn} ${inEmergency ? styles.emergencyActive : ''}`}>
            <Icon d={ICONS.alert} size={18} />
            Emergency (1122)
          </Link>

          <Link to="/patient/profile" className={styles.sidebarUserCard}>
            <div className={styles.sidebarAvatarCircle}>{initial}</div>
            <div className={styles.sidebarUserInfo}>
              <span className={styles.sidebarUserName}>{user?.name}</span>
              <span className={styles.sidebarUserEmail}>{user?.email}</span>
            </div>
          </Link>

          <button type="button" onClick={handleLogout} className={styles.sidebarLogoutBtn}>
            <Icon d={ICONS.logout} size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <div className={styles.mainContentWrapper}>
        <header ref={headerRef} className={styles.mobileHeader}>
          <Link to="/patient/home" className={styles.mobileBrandLink}>
            <img src="/logo.jpg" alt="" className={styles.mobileLogo} />
            <span className={styles.mobileBrandName}>MediGuide</span>
          </Link>
          <div className={styles.mobileHeaderActions}>
            <Link to="/patient/emergency" className={styles.mobileSos} aria-label="Emergency help">
              <Icon d={ICONS.alert} size={18} />
              <span>SOS</span>
            </Link>
            <button type="button" onClick={handleLogout} className={styles.mobileIconBtn} aria-label="Log out">
              <Icon d={ICONS.logout} size={20} />
            </button>
          </div>
        </header>

        <main className={styles.mainContainer}>
          <Outlet />
        </main>
      </div>

      <nav ref={tabBarRef} className={styles.bottomTabBar} aria-label="Primary">
        <div className={styles.tabInner}>
          {TAB_LEFT.map((t) => (
            <NavLink key={t.label} to={t.to} className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.activeTab : ''}`}>
              <Icon d={ICONS[t.icon]} />
              <span className={styles.tabLabel}>{t.label}</span>
            </NavLink>
          ))}
          <div className={styles.fabWrapper}>
            <Link to="/patient/triage?new=true" className={styles.fabCircle} aria-label="New AI consultation">
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.plus} />
              </svg>
            </Link>
          </div>
          {TAB_RIGHT.map((t) => (
            <NavLink key={t.label} to={t.to} className={({ isActive }) => `${styles.tabItem} ${isActive ? styles.activeTab : ''}`}>
              <Icon d={ICONS[t.icon]} />
              <span className={styles.tabLabel}>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default PatientLayout;
