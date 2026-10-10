import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, MessageCircle, CalendarCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth, homeForRole } from '../../context/AuthContext';
import { Button, Field, Input, PasswordInput, Segmented, Alert, Logo } from '../../components/ui';
import Nura from '../../components/nura/Nura';
import friendlyError from '../../utils/friendlyError';
import styles from './AuthPage.module.css';

// Handy for hackathon judges; set VITE_SHOW_DEMO_LOGINS=false to hide in a real deployment
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'false';
const DEMO_ACCOUNTS = [
  { label: 'Patient', email: 'user@mediguide.com', password: 'userpassword123' },
  { label: 'Organization', email: 'org@mediguide.com', password: 'orgpassword123' },
  { label: 'Admin', email: 'admin@mediguide.com', password: 'adminpassword123' }
];

// The native app has no landing page, so there is nothing to go "back" to
const IS_NATIVE = Capacitor.isNativePlatform();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[\d\s+\-()]{7,20}$/;

const ROLE_OPTIONS = [
  { value: 'user', label: 'Patient' },
  { value: 'organization', label: 'Healthcare organization' }
];

const BENEFITS = [
  { icon: MessageCircle, text: 'Describe symptoms to Nura and get clear next steps' },
  { icon: CalendarCheck, text: 'Book sessions with verified doctors near you' },
  { icon: ShieldCheck, text: 'Your medical profile stays private and in your control' }
];

function validate({ isSignup, name, email, phone, password, confirm }) {
  const e = {};
  if (isSignup && !name.trim()) e.name = 'Please enter your name.';
  if (!email.trim()) e.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(email.trim())) e.email = 'That email address does not look right.';
  if (isSignup && phone.trim() && !PHONE_RE.test(phone.trim())) e.phone = 'Enter a valid phone number.';
  if (!password) e.password = isSignup ? 'Please choose a password.' : 'Please enter your password.';
  else if (isSignup && password.length < 8) e.password = 'Use at least 8 characters.';
  if (isSignup && password && confirm !== password) e.confirm = 'Passwords do not match.';
  return e;
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
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState('');      // which field has focus (Nura reacts to it)
  const [hovering, setHovering] = useState(false);

  const errors = validate({ isSignup, name, email, phone, password, confirm });
  const err = (key) => (submitted ? errors[key] : undefined);
  const isOrg = isSignup && role === 'organization';

  // Nura reacts to the form: looks at the field you're typing in, closes her eyes for passwords,
  // thinks while signing in and looks worried after an error
  const secret = focus === 'password' || focus === 'confirm';
  let nuraMood = 'idle';
  let nuraSays = isSignup ? "Hi! Let's get you set up." : 'Hi, welcome back!';
  if (loading) { nuraMood = 'thinking'; nuraSays = isSignup ? 'Setting things up…' : 'Checking…'; }
  else if (serverError) { nuraMood = 'concerned'; nuraSays = "Hmm, let's try that again."; }
  else if (secret) { nuraMood = 'shy'; nuraSays = "I won't peek!"; }
  else if (focus) { nuraSays = focus === 'email' ? 'Take your time.' : 'Got it, go ahead.'; }
  else if (hovering) { nuraMood = 'happy'; nuraSays = 'That tickles!'; }
  const fieldIndex = ['name', 'email', 'phone', 'password', 'confirm'].indexOf(focus);
  // Desktop: the form is to Nura's right. Mobile: it's below her.
  const gazeSide = focus && !secret ? { x: 1, y: -0.3 + Math.max(0, fieldIndex) * 0.2 } : 'pointer';
  const gazeDown = focus && !secret ? { x: 0.2, y: 1 } : 'pointer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    const first = Object.keys(errors)[0];
    if (first) {
      document.getElementById(`auth-${first}`)?.focus();
      return;
    }
    setLoading(true);
    try {
      const user = isSignup
        ? await register({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), role })
        : await login(email.trim(), password);
      const from = !isSignup && location.state?.from;
      navigate(from && user.role === 'user' ? from : homeForRole(user.role), { replace: true });
    } catch (ex) {
      setServerError(friendlyError(ex, isSignup ? 'We could not create your account. Please try again.' : 'We could not sign you in. Please try again.'));
      setLoading(false);
    }
  };

  const fillDemo = (a) => {
    setEmail(a.email);
    setPassword(a.password);
    setServerError('');
    setSubmitted(false);
  };

  const editing = (setter) => (e) => { setter(e.target.value); if (serverError) setServerError(''); };

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel} aria-hidden="true">
        <Logo size={36} />
        <div className={styles.brandCenter}>
          <div className={styles.nuraStage}>
            <span
              className={styles.nuraHalo}
              onPointerEnter={() => setHovering(true)}
              onPointerLeave={() => setHovering(false)}
            >
              <Nura size={168} mood={nuraMood} gaze={gazeSide} />
            </span>
            <span key={nuraSays} className={styles.bubble}>{nuraSays}</span>
          </div>
          <p className={styles.promise}>Care, guided by <em className={styles.serif}>Nura</em></p>
          <ul className={styles.benefits}>
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className={styles.benefitIcon}><Icon size={18} /></span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.brandFoot}>General guidance only. In an emergency, call your local emergency number.</p>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formWrap}>
          <div className={styles.topRow}>
            <span className={styles.mobileLogo}><Logo size={32} /></span>
            {!IS_NATIVE && (
              <Link to="/" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" />
                Home
              </Link>
            )}
          </div>

          <header className={styles.head}>
            <span className={styles.mobileNura} aria-hidden="true">
              <Nura size={56} mood={nuraMood} gaze={gazeDown} />
              <span key={nuraSays} className={styles.mobileBubble}>{nuraSays}</span>
            </span>
            <h1 className={styles.title}>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className={styles.subtitle}>
              {isSignup
                ? (isOrg ? 'List your facility and let patients book your doctors.' : 'Get guidance from Nura and book care in minutes.')
                : 'Sign in to continue to MediGuide.'}
            </p>
          </header>

          <div className={styles.card}>
            <form
              onSubmit={handleSubmit}
              className={styles.form}
              noValidate
              onFocusCapture={(e) => setFocus((e.target.id || '').replace('auth-', ''))}
              onBlurCapture={() => setFocus('')}
            >
              {isSignup && (
                <div className={styles.roleGroup}>
                  <span className={styles.groupLabel} id="auth-role-label">I am signing up as</span>
                  <Segmented label="Account type" options={ROLE_OPTIONS} value={role} onChange={setRole} />
                </div>
              )}

              {isSignup && (
                <Field label={isOrg ? 'Contact person' : 'Full name'} htmlFor="auth-name" error={err('name')}>
                  <Input id="auth-name" value={name} onChange={editing(setName)} placeholder="Jane Doe" autoComplete="name" maxLength={80} invalid={Boolean(err('name'))} />
                </Field>
              )}

              <Field label={isOrg ? 'Work email' : 'Email'} htmlFor="auth-email" error={err('email')}>
                <Input id="auth-email" type="email" inputMode="email" value={email} onChange={editing(setEmail)} placeholder="you@example.com" autoComplete="email" invalid={Boolean(err('email'))} />
              </Field>

              {isSignup && (
                <Field label="Phone" optional htmlFor="auth-phone" error={err('phone')}>
                  <Input id="auth-phone" type="tel" inputMode="tel" value={phone} onChange={editing(setPhone)} placeholder="+92 300 1234567" autoComplete="tel" invalid={Boolean(err('phone'))} />
                </Field>
              )}

              <Field label="Password" htmlFor="auth-password" error={err('password')} hint={isSignup ? 'At least 8 characters.' : undefined}>
                <PasswordInput
                  id="auth-password"
                  value={password}
                  onChange={editing(setPassword)}
                  placeholder={isSignup ? 'Create a password' : 'Your password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  invalid={Boolean(err('password'))}
                />
              </Field>

              {isSignup && (
                <Field label="Confirm password" htmlFor="auth-confirm" error={err('confirm')}>
                  <PasswordInput id="auth-confirm" value={confirm} onChange={editing(setConfirm)} placeholder="Repeat your password" autoComplete="new-password" invalid={Boolean(err('confirm'))} />
                </Field>
              )}

              <div aria-live="assertive">
                {serverError && <Alert tone="danger" icon={AlertCircle}>{serverError}</Alert>}
              </div>

              <Button type="submit" size="lg" block loading={loading} className={styles.submit}>
                {loading ? (isSignup ? 'Creating account' : 'Signing in') : (isSignup ? 'Create account' : 'Sign in')}
              </Button>
            </form>

            {SHOW_DEMO && !isSignup && (
              <div className={styles.demo}>
                <span className={styles.demoLabel}>Demo accounts</span>
                <div className={styles.demoRow}>
                  {DEMO_ACCOUNTS.map((a) => (
                    <button key={a.label} type="button" className={styles.demoChip} onClick={() => fillDemo(a)} aria-label={`Fill in the ${a.label.toLowerCase()} demo account`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className={styles.switch}>
            {isSignup ? 'Already have an account?' : 'New to MediGuide?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'} className={styles.switchLink}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </Link>
          </p>

          {isSignup && (
            <p className={styles.legal}>
              MediGuide gives general guidance and does not replace a doctor.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
