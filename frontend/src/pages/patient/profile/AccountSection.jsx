import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Spinner from '../../../components/Spinner';
import { TextField } from './FormKit';
import styles from '../PatientProfile.module.css';

function ChangePassword() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setOk(false);
    if (!current) return setError('Enter your current password.');
    if (next.length < 8) return setError('New password must be at least 8 characters.');
    if (next !== confirm) return setError('New password and confirmation do not match.');
    if (next === current) return setError('New password must be different from the current one.');
    setBusy(true);
    setError('');
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      setOk(true);
    } catch (err) {
      setError(err.message || 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.subCard} noValidate>
      <h3 className={styles.subTitle}>Change password</h3>
      <input type="text" name="username" autoComplete="username" className={styles.hiddenInput} tabIndex={-1} aria-hidden="true" readOnly />
      <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={setCurrent} />
      <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={setNext} hint="At least 8 characters." />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      <div aria-live="polite">
        {error && <p className={styles.inlineError} role="alert">{error}</p>}
        {ok && <p className={styles.inlineOk} role="status">Password updated.</p>}
      </div>
      <button type="submit" className={styles.secondaryBtn} disabled={busy}>
        {busy ? <><Spinner size="sm" /> Updating…</> : 'Update password'}
      </button>
    </form>
  );
}

function DeleteAccount() {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return setError('Type your password to confirm.');
    setBusy(true);
    setError('');
    try {
      await deleteAccount(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not delete your account.');
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.subCard} ${styles.danger}`}>
      <h3 className={`${styles.subTitle} ${styles.dangerTitle}`}>Delete account</h3>
      <p className={styles.dangerText}>
        This permanently removes your profile, medical details and uploaded reports, and releases any sessions you booked. It cannot be undone.
      </p>
      {!open ? (
        <button type="button" className={styles.dangerOutline} onClick={() => setOpen(true)}>Delete my account…</button>
      ) : (
        <form onSubmit={submit} className={styles.stack} noValidate>
          <input type="text" name="username" autoComplete="username" className={styles.hiddenInput} tabIndex={-1} aria-hidden="true" readOnly />
          <TextField label="Type your password to confirm" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
          <div aria-live="polite">{error && <p className={styles.inlineError} role="alert">{error}</p>}</div>
          <div className={styles.rowBtns}>
            <button type="button" className={styles.secondaryBtn} onClick={() => { setOpen(false); setPassword(''); setError(''); }} disabled={busy}>Cancel</button>
            <button type="submit" className={styles.dangerSolid} disabled={busy}>
              {busy ? <><Spinner size="sm" /> Deleting…</> : 'Delete permanently'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AccountSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.stack}>
      <div className={styles.subCard}>
        <h3 className={styles.subTitle}>Sign out</h3>
        <p className={styles.mutedText}>Sign out of MediGuide on this device.</p>
        <button type="button" className={styles.secondaryBtn} onClick={signOut}>Log out</button>
      </div>
      <ChangePassword />
      <DeleteAccount />
    </div>
  );
}
