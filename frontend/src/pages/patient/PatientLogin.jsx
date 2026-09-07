import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { usePatient } from './PatientContext';
import styles from './AuthForm.module.css';

function PatientLogin() {
  const navigate = useNavigate();
  const { login } = usePatient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillDemo = (role) => {
    setError('');
    if (role === 'admin') {
      setEmail('admin@mediguide.com');
    } else if (role === 'org') {
      setEmail('hospital@mediguide.com');
    } else {
      setEmail('user@mediguide.com');
    }
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { user, token } = await api.login(email, password);
      
      // Store user and token
      login({ ...user, token });

      // Existing login user: Mark onboarded true so onboarding modal never pops up on login
      localStorage.setItem('mediguide_onboarded', 'true');
      localStorage.removeItem('mediguide_just_signed_up');
      
      // Route automatically based on user's role
      const role = user.role;
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'organization') {
        navigate('/org/onboard', { replace: true });
      } else {
        navigate('/patient/home', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        {/* Top Header Text Section (Always Above Form) */}
        <div className={styles.authHeaderBox}>
          <Link to="/" className={styles.backHomeLink}>
            ← Back to MediGuide Home
          </Link>

          <div className={styles.brandBadge}>
            <div className={styles.brandIconCircle}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </div>
            <span className={styles.brandNameText}>MediGuide</span>
          </div>

          <h1 className={styles.mainHeading}>Welcome Back</h1>
          <p className={styles.subHeading}>Sign in to access your health triage & appointments</p>
        </div>

        {/* Login Form Card (Directly Below Text) */}
        <div className={styles.authCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={styles.input}
                required
              />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Authenticating...' : 'Log In'}
            </button>
          </form>

          <p className={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link to="/patient/signup" className={styles.footerLink}>
              Sign up as Patient
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PatientLogin;
