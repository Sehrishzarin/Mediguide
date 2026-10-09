import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarPlus, CalendarX2, Building2 } from 'lucide-react';
import { getMyAppointments, cancelAppointment } from '../../../services/api';
import { Card, Button, Badge, Alert, EmptyState, ErrorState, Skeleton, SectionHeader } from '../../../components/ui';
import { slotToDate, formatSlotDate, formatSlotTime } from './slotTime';
import { friendlyError } from './errors';
import styles from './Care.module.css';

function AppointmentRow({ appt, past, confirming, busy, onAskCancel, onDismiss, onCancel }) {
  return (
    <div className={`${styles.apptRow} ${past ? styles.apptRowPast : ''}`}>
      <div className={styles.apptMain}>
        <span className={styles.dateTile} aria-hidden="true">
          <span>{formatSlotDate(appt.date, { month: 'short' })}</span>
          <strong>{formatSlotDate(appt.date, { day: 'numeric' })}</strong>
        </span>
        <div className={styles.grow}>
          <h3 className={styles.apptDoctor}>{appt.doctor}</h3>
          <p className={styles.apptMeta}>{appt.specialty}</p>
          <p className={styles.doctorOrg}><Building2 size={14} aria-hidden="true" />{appt.org}</p>
          <p className={styles.apptWhen}>
            {formatSlotDate(appt.date, { weekday: 'long', day: 'numeric', month: 'long' })} at {formatSlotTime(appt.date, appt.time)}
          </p>
        </div>
      </div>

      {!past && (
        confirming ? (
          <div className={styles.confirmRow} role="group" aria-label="Confirm cancellation">
            <span className={styles.confirmText}>Cancel this appointment?</span>
            <div className={styles.confirmActions}>
              <Button variant="ghost" size="sm" onClick={onDismiss} disabled={busy}>Keep it</Button>
              <Button variant="danger" size="sm" onClick={() => onCancel(appt.id)} loading={busy}>Yes, cancel</Button>
            </div>
          </div>
        ) : (
          <div className={styles.apptActions}>
            <Button variant="dangerSoft" size="sm" onClick={() => onAskCancel(appt.id)}>Cancel appointment</Button>
          </div>
        )
      )}
    </div>
  );
}

function AppointmentsTab() {
  const [state, setState] = useState({ status: 'loading', appts: [], now: null, error: '' });
  const [nonce, setNonce] = useState(0);
  const [confirmingId, setConfirmingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMyAppointments()
      .then((res) => { if (!cancelled) setState({ status: 'ready', appts: res.data || [], now: new Date(), error: '' }); })
      .catch((err) => { if (!cancelled) setState({ status: 'error', appts: [], now: null, error: friendlyError(err, "Couldn't load your appointments.") }); });
    return () => { cancelled = true; };
  }, [nonce]);

  const reload = useCallback(() => { setState((s) => ({ ...s, status: 'loading' })); setNonce((n) => n + 1); }, []);

  const { status, appts, now, error } = state;

  const { upcoming, past } = useMemo(() => {
    const withTime = appts.map((a) => ({ a, t: slotToDate(a.date, a.time) }));
    return {
      upcoming: withTime.filter((x) => now && x.t >= now).sort((x, y) => x.t - y.t).map((x) => x.a),
      past: withTime.filter((x) => now && x.t < now).sort((x, y) => y.t - x.t).map((x) => x.a)
    };
  }, [appts, now]);

  const cancel = async (id) => {
    setBusyId(id);
    setActionError('');
    try {
      await cancelAppointment(id);
      setState((s) => ({ ...s, appts: s.appts.filter((a) => a.id !== id) }));
      setConfirmingId(null);
      setMessage('Appointment cancelled.');
    } catch (err) {
      setActionError(friendlyError(err, "Couldn't cancel this appointment. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className={styles.stack} aria-busy="true" aria-label="Loading appointments">
        <Skeleton width={120} height={16} />
        <Card padding="none">
          {[0, 1].map((i) => (
            <div key={i} className={styles.apptRow}>
              <div className={styles.apptMain}>
                <Skeleton width={44} height={44} radius="var(--r-md)" />
                <div className={styles.grow}><Skeleton width="45%" height={14} /><Skeleton width="70%" height={12} className={styles.mt2} /></div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return <Card padding="none"><ErrorState message={error} onRetry={reload} /></Card>;
  }

  return (
    <div className={styles.sections}>
      {message && <Alert tone="success">{message}</Alert>}
      {actionError && <Alert tone="danger">{actionError}</Alert>}

      {appts.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={CalendarPlus}
            title="No appointments yet"
            text="Book a session with a doctor from one of our partner hospitals."
            action={<Button to="/patient/care/book" icon={CalendarPlus}>Book a doctor</Button>}
          />
        </Card>
      ) : (
        <>
          <section aria-labelledby="upcoming-h">
            <SectionHeader
              title={<span id="upcoming-h">Upcoming</span>}
              action={upcoming.length > 0 ? <Badge tone="brand">{upcoming.length}</Badge> : null}
            />
            {upcoming.length === 0 ? (
              <Card padding="none">
                <EmptyState
                  compact
                  icon={CalendarX2}
                  title="Nothing upcoming"
                  action={<Button to="/patient/care/book" variant="secondary" size="sm">Book a doctor</Button>}
                />
              </Card>
            ) : (
              <Card padding="none" className={styles.rowList}>
                {upcoming.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    appt={a}
                    confirming={confirmingId === a.id}
                    busy={busyId === a.id}
                    onAskCancel={(id) => { setConfirmingId(id); setMessage(''); setActionError(''); }}
                    onDismiss={() => setConfirmingId(null)}
                    onCancel={cancel}
                  />
                ))}
              </Card>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past-h">
              <SectionHeader title={<span id="past-h">Past</span>} />
              <Card padding="none" className={styles.rowList}>
                {past.map((a) => <AppointmentRow key={a.id} appt={a} past />)}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default AppointmentsTab;
