// Profile → Journal settings: cycle tracking opt-in/out, sharing with Nura, and the
// native-only daily reminder. Saved immediately (not part of the profile save bar).
import { useState } from 'react';
import { Droplet, Bell, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import friendlyError from '../../../utils/friendlyError';
import { Alert, Button, ErrorState, Field, Input, Skeleton, Switch } from '../../../components/ui';
import { useCycle, setCycleSettings } from './journalStore';
import { reminderSupported, loadReminder, saveReminder } from './reminder';
import styles from '../PatientProfile.module.css';
import s from './Journal.module.css';

function CycleSettings() {
  const { user } = useAuth();
  const cycle = useCycle(user);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const update = async (kind, payload) => {
    setBusy(kind);
    setError('');
    try {
      await setCycleSettings(payload);
    } catch (err) {
      setError(friendlyError(err, "We couldn't update cycle tracking. Please try again."));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className={styles.block}>
      <div className={styles.blockHead}>
        <span className={styles.blockIcon} aria-hidden="true"><Droplet size={18} /></span>
        <div>
          <h3 className={styles.blockTitle}>Cycle tracking</h3>
          <p className={styles.blockText}>Log periods in your journal and see predictions.</p>
        </div>
      </div>
      {cycle.status === 'loading' && <Skeleton height={56} radius="var(--r-md)" />}
      {cycle.status === 'error' && <ErrorState compact message={cycle.error} onRetry={cycle.retry} />}
      {cycle.status === 'ready' && (
        <div className={s.stackSm}>
          <Switch
            label="Track periods"
            description={cycle.data.paused ? 'Paused while your pregnancy plan is active.' : 'Adds a period row to your daily log and a Cycle tab.'}
            checked={cycle.data.enabled}
            disabled={Boolean(busy)}
            onChange={(v) => update('enabled', { enabled: v })}
          />
          {cycle.data.enabled && (
            <Switch
              label="Share cycle info with Nura"
              description="Nura can consider your cycle when you describe symptoms."
              checked={cycle.data.shareWithNura}
              disabled={Boolean(busy)}
              onChange={(v) => update('share', { shareWithNura: v })}
            />
          )}
          {cycle.data.source === 'choice' && (
            <div>
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => update('reset', { enabled: null })} loading={busy === 'reset'} disabled={Boolean(busy)}>
                Reset to default
              </Button>
            </div>
          )}
        </div>
      )}
      {error && <Alert tone="danger" title={error} />}
    </div>
  );
}

function ReminderSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => loadReminder(user?.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const apply = async (next) => {
    setBusy(true);
    setMessage('');
    const res = await saveReminder(user.id, next);
    if (res.ok) setSettings(next);
    else setMessage(res.message);
    setBusy(false);
  };

  return (
    <div className={styles.block}>
      <div className={styles.blockHead}>
        <span className={styles.blockIcon} aria-hidden="true"><Bell size={18} /></span>
        <div>
          <h3 className={styles.blockTitle}>Daily reminder</h3>
          <p className={styles.blockText}>A gentle nudge to log your day on this phone.</p>
        </div>
      </div>
      <div className={s.stackSm}>
        <Switch
          label="Daily journal reminder"
          checked={settings.enabled}
          disabled={busy}
          onChange={(v) => apply({ ...settings, enabled: v })}
        />
        {settings.enabled && (
          <Field label="Reminder time" htmlFor="journal-reminder-time">
            <Input
              id="journal-reminder-time"
              type="time"
              value={settings.time}
              disabled={busy}
              className={s.timeInput}
              onChange={(e) => { if (e.target.value) apply({ ...settings, time: e.target.value }); }}
            />
          </Field>
        )}
        {message && <Alert tone="warning" title={message} />}
      </div>
    </div>
  );
}

export default function JournalSettings() {
  return (
    <div>
      <CycleSettings />
      {reminderSupported() && <ReminderSettings />}
    </div>
  );
}
