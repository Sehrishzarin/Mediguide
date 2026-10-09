import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireRole, RequireOnboarded, GuestOnlyGuard, RootRoute } from './components/RouteGuards';
import Spinner from './components/Spinner';
import { warmUpServer } from './services/api';
import Home from './pages/Home';
import AuthPage from './pages/auth/AuthPage';

// Heavier screens (map, chat, dashboards) load on demand to keep the first paint fast
const PatientLayout = lazy(() => import('./pages/patient/PatientLayout'));
const PatientHome = lazy(() => import('./pages/patient/PatientHome'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'));
const Onboarding = lazy(() => import('./pages/patient/Onboarding'));
const NuraChat = lazy(() => import('./pages/patient/nura/NuraChat'));
const CareHub = lazy(() => import('./pages/patient/care/CareHub'));
const Emergency = lazy(() => import('./pages/patient/Emergency'));
const OrgDashboard = lazy(() => import('./pages/org/OrgDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Redirect that keeps router state (e.g. { specialty } passed by Nura or the map)
function LegacyRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={to} replace state={location.state} />;
}

const PageLoader = () => (
  <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
    <Spinner size="lg" />
  </div>
);

function App() {
  // Wake a sleeping free-tier server while the user is still reading the landing page
  useEffect(() => { warmUpServer(); }, []);

  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRoute landing={<Home />} />} />

          <Route element={<GuestOnlyGuard />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
          </Route>

          {/* Legacy URLs */}
          <Route path="/patient/login" element={<Navigate to="/login" replace />} />
          <Route path="/patient/signup" element={<Navigate to="/signup" replace />} />
          <Route path="/org/login" element={<Navigate to="/login" replace />} />
          <Route path="/org/onboard" element={<Navigate to="/org" replace />} />

          {/* Patients */}
          <Route element={<RequireRole roles={['user']} />}>
            <Route element={<RequireOnboarded />}>
              <Route path="/patient/onboarding" element={<Onboarding />} />
              <Route path="/patient" element={<PatientLayout />}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<PatientHome />} />
                <Route path="profile" element={<PatientProfile />} />
                {/* Nura: conversation list + chat (chatId = stored conversation id or "new") */}
                <Route path="nura" element={<NuraChat />} />
                <Route path="nura/:chatId" element={<NuraChat />} />
                {/* Care hub: book a doctor, my appointments, nearby facilities */}
                <Route path="care" element={<Navigate to="/patient/care/book" replace />} />
                <Route path="care/:tab" element={<CareHub />} />
                {/* Legacy paths */}
                <Route path="triage" element={<Navigate to="/patient/nura/new" replace />} />
                <Route path="history" element={<Navigate to="/patient/nura" replace />} />
                <Route path="slots" element={<LegacyRedirect to="/patient/care/book" />} />
                <Route path="appointments" element={<Navigate to="/patient/care/appointments" replace />} />
                <Route path="emergency" element={<Emergency />} />
              </Route>
            </Route>
          </Route>

          {/* Organizations */}
          <Route element={<RequireRole roles={['organization']} />}>
            <Route path="/org" element={<OrgDashboard />} />
          </Route>

          {/* Admin */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
