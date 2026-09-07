import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import OrgOnboarding from './pages/org/OrgOnboarding';
import AdminDashboard from './pages/admin/AdminDashboard';
import { AuthProvider } from './context/AuthContext';
import { PatientProvider } from './pages/patient/PatientContext';
import PatientSignup from './pages/patient/PatientSignup';
import PatientLogin from './pages/patient/PatientLogin';
import PatientLayout from './pages/patient/PatientLayout';
import PatientHome from './pages/patient/PatientHome';
import PatientProfile from './pages/patient/PatientProfile';
import SymptomInput from './pages/patient/SymptomInput';
import TriageResult from './pages/patient/TriageResult';
import AvailableSlots from './pages/patient/AvailableSlots';
import Emergency from './pages/patient/Emergency';
import NotFound from './pages/NotFound';
import { PatientProtectedGuard, GuestOnlyGuard } from './components/RouteGuards';

function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Home />} />

          {/* Guest Only Routes (Blocked for logged-in users) */}
          <Route element={<GuestOnlyGuard />}>
            <Route path="/patient/signup" element={<PatientSignup />} />
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/login" element={<Navigate to="/patient/login" replace />} />
            <Route path="/org/login" element={<Navigate to="/patient/login" replace />} />
          </Route>

          {/* Protected Routes (Blocked for logged-out users) */}
          <Route element={<PatientProtectedGuard />}>
            <Route path="/org/onboard" element={<OrgOnboarding />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/patient" element={<PatientLayout />}>
              <Route path="home" element={<PatientHome />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="triage" element={<SymptomInput />} />
              <Route path="history" element={<SymptomInput />} />
              <Route path="triage/result" element={<TriageResult />} />
              <Route path="slots" element={<AvailableSlots />} />
              <Route path="emergency" element={<Emergency />} />
            </Route>
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PatientProvider>
    </AuthProvider>
  );
}

export default App;
