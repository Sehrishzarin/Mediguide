import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, KeyRound, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Alert, Button, Field, PasswordInput } from '../../../components/ui';
import friendlyError from '../../../utils/friendlyError';
import styles from '../PatientProfile.module.css';

function PasswordField({ label, value, onChange, autoComplete, hint }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <PasswordInput id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
    </Field>
  );
}

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
    if (next.length < 8) return setError('Your new password needs at least 8 characters.');
    if (next !== confirm) return setError('The new passwords do not match.');
    if (next === current) return setError('Choose a password that is different from your current one.');
    setBusy(true);
    setError('');
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      setOk(true);
    } catch (err) {
      setError(friendlyError(err, 'We could not change your password. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.block} noValidate>
      <div className={styles.blockHead}>
        <span className={styles.blockIcon} aria-hidden="true"><KeyRound size={18} /></span>
        <div>
          <h3 className={styles.blockTitle}>Change password</h3>
          <p className={styles.blockText}>Use at least 8 characters.</p>
        </div>
      </div>
      <input type="text" name="username" autoComplete="username" className="sr-only" tabIndex={-1} aria-hidden="true" readOnly />
      <div className={styles.stackSm}>
        <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={setCurrent} />
        <PasswordField label="New password" autoComplete="new-password" value={next} onChange={setNext} />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      </div>
      <div aria-live="polite">
        {error && <Alert tone="danger" icon={AlertCircle}>{error}</Alert>}
        {ok && <Alert tone="success" icon={CheckCircle2}>Password updated.</Alert>}
      </div>
      <div>
        <Button type="submit" variant="secondary" loading={busy}>{busy ? 'Updating' : 'Update password'}</Button>
      </div>
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
      setError(friendlyError(err, 'We could not delete your account. Please try again.'));
      setBusy(false);
    }
  };

  const cancel = () => { setOpen(false); setPassword(''); setError(''); };

  return (
    <div className={`${styles.block} ${styles.dangerZone}`}>
      <div className={styles.blockHead}>
        <span className={`${styles.blockIcon} ${styles.blockIconDanger}`} aria-hidden="true"><Trash2 size={18} /></span>
        <div>
          <h3 className={styles.blockTitle}>Delete account</h3>
          <p className={styles.blockText}>
            Permanently removes your profile, medical details and uploaded reports, and releases any sessions you booked. This cannot be undone.
          </p>
        </div>
      </div>
      {!open ? (
        <div>
          <Button variant="dangerSoft" onClick={() => setOpen(true)}>Delete my account</Button>
        </div>
      ) : (
        <form onSubmit={submit} className={styles.stackSm} noValidate>
          <input type="text" name="username" autoComplete="username" className="sr-only" tabIndex={-1} aria-hidden="true" readOnly />
          <PasswordField label="Type your password to confirm" autoComplete="current-password" value={password} onChange={setPassword} />
          <div aria-live="polite">{error && <Alert tone="danger" icon={AlertCircle}>{error}</Alert>}</div>
          <div className={styles.rowBtns}>
            <Button variant="secondary" onClick={cancel} disabled={busy}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busy}>{busy ? 'Deleting' : 'Delete permanently'}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AccountSection({ onLogout }) {
  const { user } = useAuth();
  return (
    <div className={styles.stack}>
      <div className={styles.block}>
        <div className={styles.blockHead}>
          <span className={styles.blockIcon} aria-hidden="true"><LogOut size={18} /></span>
          <div>
            <h3 className={styles.blockTitle}>Log out</h3>
            <p className={styles.blockText}>You are signed in as {user?.email}.</p>
          </div>
        </div>
        <div>
          <Button variant="secondary" icon={LogOut} onClick={onLogout}>Log out</Button>
        </div>
      </div>
      <ChangePassword />
      <DeleteAccount />
    </div>
  );
}
