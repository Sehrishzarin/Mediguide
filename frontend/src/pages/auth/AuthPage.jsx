import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeForRole } from '../../context/AuthContext';
import styles from './AuthPage.module.css';

// Handy for hackathon judges; set VITE_SHOW_DEMO_LOGINS=false to hide in a real deployment
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'false';
const DEMO_ACCOUNTS = [
  { label: 'Patient', email: 'user@mediguide.com', password: 'userpassword123' },
  { label: 'Organization', email: 'org@mediguide.com', password: 'orgpassword123' },
  { label: 'Admin', email: 'admin@mediguide.com', password: 'adminpassword123' }
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function PasswordInput({ value, onChange, placeholder, autoComplete, id }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.passwordWrap}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={styles.input}
      />
      <button type="button" className={styles.showBtn} onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

// One screen for both login and signup (mode = 'login' | 'signup')
export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (isSignup && !name.trim()) return 'Please enter your name.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    if (isSignup) {
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (password !== confirm) return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = isSignup
        ? await register({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), role })
        : await login(email.trim(), password);
      const from = !isSignup && location.state?.from;
      navigate(from && user.role === 'user' ? from : homeForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authHeaderBox}>
          <Link to="/" className={styles.backHomeLink}>← Back to MediGuide Home</Link>
          <div className={styles.brandBadge}>
            <img src="/logo.png" alt="" width="22" height="22" style={{ borderRadius: 6 }} />
            <span className={styles.brandNameText}>MediGuide</span>
          </div>
          <h1 className={styles.mainHeading}>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
          <p className={styles.subHeading}>
            {isSignup ? 'Join MediGuide to take charge of your health journey.' : 'Sign in to your health triage & appointments'}
          </p>
        </div>

        <div className={styles.authCard}>
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {isSignup && (
              <div className={styles.roleTabs} role="tablist" aria-label="Account type">
                <button type="button" role="tab" aria-selected={role === 'user'}
                  className={`${styles.roleTab} ${role === 'user' ? styles.activeRole : ''}`} onClick={() => setRole('user')}>
                  I&apos;m a patient
                </button>
                <button type="button" role="tab" aria-selected={role === 'organization'}
                  className={`${styles.roleTab} ${role === 'organization' ? styles.activeRole : ''}`} onClick={() => setRole('organization')}>
                  Healthcare organization
                </button>
              </div>
            )}

            {isSignup && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">{role === 'organization' ? 'Contact person' : 'Full name'}</label>
                <input id="name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe" autoComplete="name" />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input id="email" type="email" inputMode="email" className={styles.input} value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>

            {isSignup && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="phone">Phone <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input id="phone" type="tel" inputMode="tel" className={styles.input} value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" autoComplete="tel" />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'} />
            </div>

            {isSignup && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm">Confirm password</label>
                <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password" autoComplete="new-password" />
              </div>
            )}

            {error && <p className={styles.errorMsg} role="alert">{error}</p>}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? (isSignup ? 'Creating account…' : 'Signing in…') : (isSignup ? 'Create account' : 'Sign in')}
            </button>
          </form>
        </div>

        {SHOW_DEMO && !isSignup && (
          <div className={styles.demoBox}>
            Demo accounts — tap to fill:
            <div className={styles.demoRow}>
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.label} type="button" className={styles.demoChip}
                  onClick={() => { setEmail(a.email); setPassword(a.password); setError(''); }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className={styles.footerText}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link to={isSignup ? '/login' : '/signup'} className={styles.footerLink}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </div>
    </div>
  );
}
