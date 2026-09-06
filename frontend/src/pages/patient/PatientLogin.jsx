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
      setPassword('adminpassword123');
    } else if (role === 'org') {
      setEmail('hospital@mediguide.com');
      setPassword('orgpassword123');
    } else {
      setEmail('user@mediguide.com');
      setPassword('userpassword123');
    }
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
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link to="/" className={styles.backLink}>
            &larr; Back to MediGuide Home
          </Link>
          <h1 className={styles.heading}>Sign In</h1>
          <p className={styles.subtext}>Enter your credentials to access MediGuide.</p>
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

        <div className={styles.quickFillRow} style={{ marginTop: '1rem' }}>
          <span>Quick Demo Fill:</span>
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
          {' • '}
          <Link to="/org/onboard" className={styles.footerLink}>
            Register Hospital
          </Link>
        </p>
      </div>
    </div>
  );
}

export default PatientLogin;
