import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyAppointments, cancelAppointment } from '../../services/api';
import { slotToDate, formatSlotDate, formatSlotTime } from './slotTime';
import styles from './Appointments.module.css';

function AppointmentCard({ appt, past, confirming, busy, onAskCancel, onDismiss, onCancel }) {
  return (
    <article className={`${styles.card} ${past ? styles.cardPast : ''}`}>
      <div className={styles.dateBox} aria-hidden="true">
        <span>{formatSlotDate(appt.date, { month: 'short' })}</span>
        <strong>{formatSlotDate(appt.date, { day: 'numeric' })}</strong>
      </div>
      <div className={styles.body}>
        <h3 className={styles.doctor}>{appt.doctor}</h3>
        <p className={styles.spec}>{appt.specialty}</p>
        <p className={styles.meta}>{appt.org}</p>
        <p className={styles.when}>
          {formatSlotDate(appt.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatSlotTime(appt.date, appt.time)}
        </p>
        {!past && (
          confirming ? (
            <div className={styles.confirmRow} role="alertdialog" aria-label="Confirm cancellation">
              <span>Cancel this appointment?</span>
              <button type="button" className={styles.btnDanger} onClick={() => onCancel(appt.id)} disabled={busy}>
                {busy ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button type="button" className={styles.btnGhost} onClick={onDismiss} disabled={busy}>Keep it</button>
            </div>
          ) : (
            <button type="button" className={styles.btnGhostDanger} onClick={() => onAskCancel(appt.id)}>Cancel appointment</button>
          )
        )}
      </div>
    </article>
  );
}

function Appointments() {
  const [appts, setAppts] = useState([]);
  const [now, setNow] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const [confirmingId, setConfirmingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMyAppointments()
      .then((res) => {
        if (cancelled) return;
        setAppts(res.data || []);
        setNow(new Date());
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [nonce]);

  const reload = useCallback(() => { setStatus('loading'); setNonce((n) => n + 1); }, []);

  const { upcoming, past } = useMemo(() => {
    const withTime = appts.map((a) => ({ a, t: slotToDate(a.date, a.time) }));
    return {
      upcoming: withTime.filter((x) => !now || x.t >= now).sort((x, y) => x.t - y.t).map((x) => x.a),
      past: withTime.filter((x) => now && x.t < now).sort((x, y) => y.t - x.t).map((x) => x.a)
    };
  }, [appts, now]);

  const cancel = async (id) => {
    setBusyId(id);
    setActionError('');
    try {
      await cancelAppointment(id);
      setAppts((prev) => prev.filter((a) => a.id !== id));
      setConfirmingId(null);
      setMessage('Appointment cancelled.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My Appointments</h1>
          <p className={styles.subtitle}>Your booked doctor sessions.</p>
        </div>
        <Link to="/patient/slots" className={styles.btnPrimary}>Book a session</Link>
      </header>

      {message && <div className={styles.message} role="status">{message}</div>}
      {actionError && <div className={styles.errorBox} role="alert">{actionError}</div>}

      {status === 'loading' && (
        <div aria-busy="true" aria-label="Loading appointments">
          {[0, 1].map((i) => <div key={i} className={`skeleton-box ${styles.skCard}`} />)}
        </div>
      )}

      {status === 'error' && (
        <div className={styles.stateBox} role="alert">
          <p>{error || 'Could not load your appointments.'}</p>
          <button type="button" className={styles.btnPrimary} onClick={reload}>Try again</button>
        </div>
      )}

      {status === 'ready' && appts.length === 0 && (
        <div className={styles.stateBox}>
          <p className={styles.emptyTitle}>No appointments yet</p>
          <p>Book a session with a doctor from our partner hospitals.</p>
          <Link to="/patient/slots" className={styles.btnPrimary}>Find a doctor session</Link>
        </div>
      )}

      {status === 'ready' && appts.length > 0 && (
        <>
          <section aria-labelledby="upcoming-h">
            <h2 id="upcoming-h" className={styles.sectionTitle}>Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className={styles.muted}>Nothing upcoming. <Link to="/patient/slots" className={styles.inlineLink}>Book a session</Link></p>
            ) : (
              <div className={styles.list}>
                {upcoming.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    confirming={confirmingId === a.id}
                    busy={busyId === a.id}
                    onAskCancel={(id) => { setConfirmingId(id); setMessage(''); setActionError(''); }}
                    onDismiss={() => setConfirmingId(null)}
                    onCancel={cancel}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past-h">
              <h2 id="past-h" className={styles.sectionTitle}>Past ({past.length})</h2>
              <div className={styles.list}>
                {past.map((a) => <AppointmentCard key={a.id} appt={a} past />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Appointments;
