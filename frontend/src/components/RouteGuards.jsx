import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homeForRole } from '../context/AuthContext';
import Spinner from './Spinner';

function FullScreenLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size="lg" />
    </div>
  );
}

// Requires a signed-in user with one of the given roles
export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}

// Patients must finish onboarding (saved on their account) before using the app
export function RequireOnboarded() {
  const { user } = useAuth();
  const location = useLocation();
  if (user && !user.onboardingCompleted && location.pathname !== '/patient/onboarding') {
    return <Navigate to="/patient/onboarding" replace />;
  }
  return <Outlet />;
}

// Login / signup: signed-in users are sent to their home instead
export function GuestOnlyGuard() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}
