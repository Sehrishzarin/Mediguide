import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireRole, RequireOnboarded, GuestOnlyGuard } from './components/RouteGuards';
import Spinner from './components/Spinner';
import { warmUpServer } from './services/api';
import Home from './pages/Home';
import AuthPage from './pages/auth/AuthPage';

// Heavier screens (map, chat, dashboards) load on demand to keep the first paint fast
const PatientLayout = lazy(() => import('./pages/patient/PatientLayout'));
const PatientHome = lazy(() => import('./pages/patient/PatientHome'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'));
const Onboarding = lazy(() => import('./pages/patient/Onboarding'));
const SymptomInput = lazy(() => import('./pages/patient/SymptomInput'));
const AvailableSlots = lazy(() => import('./pages/patient/AvailableSlots'));
const Appointments = lazy(() => import('./pages/patient/Appointments'));
const Emergency = lazy(() => import('./pages/patient/Emergency'));
const OrgDashboard = lazy(() => import('./pages/org/OrgDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
          <Route path="/" element={<Home />} />

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
                <Route path="triage" element={<SymptomInput />} />
                <Route path="history" element={<Navigate to="/patient/triage" replace />} />
                <Route path="slots" element={<AvailableSlots />} />
                <Route path="appointments" element={<Appointments />} />
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
