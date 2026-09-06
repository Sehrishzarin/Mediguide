import { Navigate, Outlet } from 'react-router-dom';
import { usePatient } from '../pages/patient/PatientContext';
import { useAuth } from '../context/AuthContext';

// Protected Route Guard for Patient Screens (/patient/*)
export function PatientProtectedGuard() {
  const { user: patientUser } = usePatient();
  const { user: authUser, token } = useAuth();

  const storedPatient = (() => {
    try {
      return JSON.parse(localStorage.getItem('mediguide_patient'));
    } catch {
      return null;
    }
  })();

  const storedToken = localStorage.getItem('token');

  const isAuthenticated = Boolean(patientUser || authUser || storedPatient || (token && storedToken));

  if (!isAuthenticated) {
    return <Navigate to="/patient/login" replace />;
  }

  return <Outlet />;
}

// Guest-Only Route Guard (For Login / Signup screens)
export function GuestOnlyGuard() {
  const { user: patientUser } = usePatient();
  const { user: authUser } = useAuth();

  const storedPatient = (() => {
    try {
      return JSON.parse(localStorage.getItem('mediguide_patient'));
    } catch {
      return null;
    }
  })();

  const storedToken = localStorage.getItem('token');

  const isLoggedIn = Boolean(patientUser || authUser || storedPatient || storedToken);

  if (isLoggedIn) {
    const role = authUser?.role || patientUser?.role || 'user';
    if (role === 'organization') {
      return <Navigate to="/org/onboard" replace />;
    }
    return <Navigate to="/patient/home" replace />;
  }

  return <Outlet />;
}
