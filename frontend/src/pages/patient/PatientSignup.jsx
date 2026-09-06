import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { usePatient } from './PatientContext';
import styles from './AuthForm.module.css';

function PatientSignup() {
  const navigate = useNavigate();
  const { login } = usePatient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !name) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await api.signup(email, password, 'patient');
      login({ ...user, name });
      navigate('/patient/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link to="/" className={styles.backLink}>
            &larr; MediGuide Home
          </Link>
          <h1 className={styles.heading}>Create your account</h1>
          <p className={styles.subtext}>Join MediGuide to manage your health journey.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className={styles.input}
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link to="/patient/login" className={styles.footerLink}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default PatientSignup;
