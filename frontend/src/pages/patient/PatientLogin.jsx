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
      {/* Mobile-only branding header */}
      <div className={styles.mobileBranding}>
        <div className={styles.mobileLogo}>
          <div className={styles.mobileLogoIcon}>
            <svg className={styles.mobileLogoPulse} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </div>
          <span className={styles.mobileLogoText}>MediGuide</span>
        </div>
        <h1 className={styles.mobileHeading}>Welcome Back</h1>
        <p className={styles.mobileSubtext}>Sign in to continue your health journey</p>
      </div>

      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link to="/" className={`${styles.backLink} ${styles.desktopOnly}`}>
            &larr; Back to MediGuide Home
          </Link>
          <h1 className={`${styles.heading} ${styles.desktopOnly}`}>Sign In</h1>
          <p className={`${styles.subtext} ${styles.desktopOnly}`}>Enter your credentials to access MediGuide.</p>
        </div>

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

        <div className={`${styles.quickFillRow} ${styles.desktopOnly}`} style={{ marginTop: '1rem' }}>
          <span>Quick Demo Email:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button type="button" className={styles.btnQuickFill} onClick={() => fillDemo('user')}>Patient</button>
            <button type="button" className={styles.btnQuickFill} onClick={() => fillDemo('org')}>Hospital</button>
            <button type="button" className={styles.btnQuickFill} onClick={() => fillDemo('admin')}>Admin</button>
          </div>
        </div>

        <p className={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link to="/patient/signup" className={styles.footerLink}>
            Sign up as Patient
          </Link>
          <span className={styles.desktopOnly}>
            {' • '}
            <Link to="/org/onboard" className={styles.footerLink}>
              Register Hospital
            </Link>
          </span>
        </p>
      </div>
    </div>
  );
}

export default PatientLogin;
