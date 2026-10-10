import { useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Home, CalendarHeart, NotebookPen, UserRound, Siren } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/ui';
import Nura from '../../components/nura/Nura';
import { useMonitoring, startMonitoringPolling, setMonitoringNavigator } from './monitoring/monitoringStore';
import MonitoringBanner from './monitoring/MonitoringBanner';
import { onNotificationKind } from './monitoring/notifications';
import { syncJournalReminder } from './journal/reminder';
import { localIso } from './journal/dates';
import styles from './PatientLayout.module.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

// The five primary destinations, shared by the mobile tab bar and the desktop sidebar.
// `match` decides the active state (and aria-current) so nested routes such as care/* and nura/:id stay highlighted.
const NAV = [
  { to: '/patient/home', label: 'Home', icon: Home, match: (p) => p.startsWith('/patient/home') },
  { to: '/patient/nura', label: 'Nura', icon: 'nura', match: (p) => p.startsWith('/patient/nura') },
  { to: '/patient/care/book', label: 'Care', icon: CalendarHeart, match: (p) => p.startsWith('/patient/care') },
  { to: '/patient/journal/calendar', label: 'Journal', icon: NotebookPen, match: (p) => p.startsWith('/patient/journal') },
  { to: '/patient/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/patient/profile') }
];

function NavIcon({ icon: Icon, active, size }) {
  if (Icon === 'nura') {
    return (
      <span className={cx(styles.nuraIcon, active && styles.nuraIconActive)} aria-hidden="true">
        <Nura size={size + 2} still />
      </span>
    );
  }
  return <Icon size={size} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />;
}

function PatientLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const headerRef = useRef(null);
  const tabBarRef = useRef(null);
  const userId = user?.id;
  const monitoring = useMonitoring(userId);

  // Nura Check-In: one shared poll of the monitoring state while signed in
  useEffect(() => {
    if (!userId) return undefined;
    return startMonitoringPolling(userId);
  }, [userId]);
  // Lets notification action buttons (I'm OK / Worse / Need help) open the right screen
  useEffect(() => setMonitoringNavigator((to) => navigate(to)), [navigate]);
  // Daily journal reminder (native): apply this user's setting on this device; a tap opens today's log
  useEffect(() => { if (userId) syncJournalReminder(userId); }, [userId]);
  useEffect(() => onNotificationKind('journal', () => navigate(`/patient/journal/log/${localIso()}`)), [navigate]);
  // Care plan reminders open the plan they belong to
  useEffect(() => onNotificationKind('plan-milestone', (event) => {
    const planId = event?.notification?.extra?.planId;
    navigate(planId ? `/patient/journal/plans/${planId}` : '/patient/journal/plans');
  }), [navigate]);

  // Publish the real rendered heights of the mobile top bar and tab bar as CSS variables
  // (--app-header-h / --app-tabbar-h). Full-height screens such as the Nura chat use them, so
  // safe areas, notches and large system fonts never make content slide underneath.
  // On desktop both bars are display:none, so they measure 0.
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

  const inEmergency = pathname.startsWith('/patient/emergency');
  const showBanner = !pathname.startsWith('/patient/monitoring');
  const name = user?.name || 'Your profile';

  return (
    <div className={styles.layoutWrapper}>
      {/* ── Desktop sidebar ── */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        <Link to="/patient/home" className={styles.brand}>
          <img src="/logo.jpg" alt="" className={styles.brandLogo} />
          <span className={styles.brandName}>MediGuide</span>
        </Link>

        <nav className={styles.sideNav} aria-label="Primary">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cx(styles.sideItem, active && styles.sideItemActive)}
                aria-current={active ? 'page' : undefined}
              >
                <NavIcon icon={item.icon} active={active} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sideFooter}>
          <Link
            to="/patient/emergency"
            className={cx(styles.sideEmergency, inEmergency && styles.sideEmergencyActive)}
            aria-current={inEmergency ? 'page' : undefined}
          >
            <Siren size={20} aria-hidden="true" />
            <span>Emergency</span>
          </Link>

          <Link to="/patient/profile" className={styles.userRow} aria-label={`Profile: ${name}`}>
            <Avatar name={user?.name || ''} size={36} />
            <span className={styles.userText}>
              <span className={styles.userName}>{name}</span>
              {user?.email && <span className={styles.userEmail}>{user.email}</span>}
            </span>
          </Link>
        </div>
      </aside>

      <div className={styles.main}>
        {/* ── Mobile top app bar ── */}
        <header ref={headerRef} className={styles.topBarWrap}>
          <div className={styles.topBar}>
            <Link to="/patient/home" className={styles.brand}>
              <img src="/logo.jpg" alt="" className={styles.brandLogoSm} />
              <span className={styles.brandName}>MediGuide</span>
            </Link>
            <Link
              to="/patient/emergency"
              className={cx(styles.sos, inEmergency && styles.sosActive)}
              aria-label="SOS: emergency help"
            >
              <Siren size={18} aria-hidden="true" />
              <span>SOS</span>
            </Link>
          </div>
          {/* Inside the measured header on mobile, so full-height screens leave room for it */}
          {showBanner && <MonitoringBanner monitoring={monitoring.data} />}
        </header>

        {showBanner && <MonitoringBanner monitoring={monitoring.data} className={styles.desktopBanner} />}

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav ref={tabBarRef} className={styles.tabBar} aria-label="Primary">
        <div className={styles.tabInner}>
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cx(styles.tab, active && styles.tabActive)}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.tabIcon}>
                  <NavIcon icon={item.icon} active={active} size={22} />
                </span>
                <span className={styles.tabLabel}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default PatientLayout;
