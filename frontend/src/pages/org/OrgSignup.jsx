import { useState } from 'react';
import * as api from '../../services/api';
import styles from './OrgForms.module.css';

function OrgSignup({ onNext }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const { user } = await api.signup(email, password, 'org');
      onNext({ user });
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Create your account</h2>
      <p className={styles.subtext}>Register to begin onboarding your organization.</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hospital@example.com" className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Confirm password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" className={styles.input} required />
        </div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        <button type="submit" disabled={loading} className={styles.btnPrimary}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

export default OrgSignup;
