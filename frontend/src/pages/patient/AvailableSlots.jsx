import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAvailableSlots, bookSlot } from '../../services/api';
import { slotToDate, formatSlotDate, formatSlotTime, formatSlotLong } from './slotTime';
import styles from './AvailableSlots.module.css';

const SPECIALTIES = ['Cardiologist', 'General Physician', 'Pediatrician', 'Dermatologist', 'Gastroenterologist', 'Orthopedist'];

const initials = (name = '') =>
  name.replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'DR';

function ConfirmSheet({ slot, busy, error, onConfirm, onClose }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className={styles.overlay} onClick={() => { if (!busy) onClose(); }}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className={styles.sheetTitle}>Confirm your booking</h2>
        <dl className={styles.detailList}>
          <div><dt>Doctor</dt><dd>{slot.doctor}</dd></div>
          <div><dt>Specialty</dt><dd>{slot.specialty}</dd></div>
          <div><dt>Facility</dt><dd>{slot.org}</dd></div>
          <div><dt>When</dt><dd>{formatSlotLong(slot.date, slot.time)}</dd></div>
        </dl>
        {error && <p className={styles.sheetError} role="alert">{error}</p>}
        <div className={styles.sheetActions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" ref={confirmRef} className={styles.btnPrimary} onClick={onConfirm} disabled={busy}>
            {busy ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailableSlots() {
  const { state: navState } = useLocation();

  const initialSpecialty = SPECIALTIES.find((s) => s.toLowerCase() === String(navState?.specialty || '').toLowerCase()) || '';
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [search, setSearch] = useState(navState?.orgName || '');
  const [debounced, setDebounced] = useState(navState?.orgName || '');
  const [result, setResult] = useState({ key: null, slots: [], error: '' });
  const [notice, setNotice] = useState('');
  const [nonce, setNonce] = useState(0);
  const requestKey = `${specialty}|${debounced}|${nonce}`;
  const [pickedDate, setPickedDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getAvailableSlots({ specialty, search: debounced })
      .then((res) => { if (!cancelled) { const now = new Date(); setResult({ key: requestKey, slots: (res.data || []).filter((x) => slotToDate(x.date, x.time) >= now), error: '' }); } })
      .catch((err) => { if (!cancelled) setResult({ key: requestKey, slots: [], error: err.message || 'Could not load sessions.' }); });
    return () => { cancelled = true; };
  }, [specialty, debounced, requestKey]);

  const { slots, error } = result;
  const status = result.key !== requestKey ? 'loading' : error ? 'error' : 'ready';

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const chooseSpecialty = (s) => { setSpecialty(s); setNotice(''); };
  const clearFilters = () => { setSpecialty(''); setSearch(''); setDebounced(''); };

  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))].sort(), [slots]);
  const activeDate = dates.includes(pickedDate) ? pickedDate : dates[0] || '';

  const groups = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      if (s.date !== activeDate) continue;
      const key = `${s.organizationId}|${s.doctor}`;
      if (!map.has(key)) map.set(key, { key, doctor: s.doctor, specialty: s.specialty, org: s.org, times: [] });
      map.get(key).times.push(s);
    }
    const list = [...map.values()];
    list.forEach((g) => g.times.sort((a, b) => a.time.localeCompare(b.time)));
    return list;
  }, [slots, activeDate]);

  const countByDate = useMemo(() => {
    const c = {};
    slots.forEach((s) => { c[s.date] = (c[s.date] || 0) + 1; });
    return c;
  }, [slots]);

  const closeSheet = useCallback(() => { setSelected(null); setBookError(''); }, []);

  const confirm = async () => {
    if (!selected) return;
    setBooking(true);
    setBookError('');
    try {
      await bookSlot(selected.id);
      setBooked(selected);
      setSelected(null);
    } catch (err) {
      if (err.status === 409) {
        setSelected(null);
        setNotice(err.message || 'Sorry, that session was just taken. Here are the latest options.');
        reload();
      } else {
        setBookError(err.message);
      }
    } finally {
      setBooking(false);
    }
  };

  if (booked) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard} role="status">
          <div className={styles.successIcon} aria-hidden="true">✓</div>
          <h1 className={styles.successTitle}>You're booked</h1>
          <p className={styles.successText}>
            {booked.doctor} ({booked.specialty}) at {booked.org}
          </p>
          <p className={styles.successWhen}>{formatSlotLong(booked.date, booked.time)}</p>
          <div className={styles.successActions}>
            <Link to="/patient/appointments" className={styles.btnPrimary}>View my appointments</Link>
            <Link to="/patient/home" className={styles.btnSecondary}>Back to home</Link>
            <button type="button" className={styles.btnLink} onClick={() => { setBooked(null); reload(); }}>Book another session</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Doctor Sessions</h1>
          <p className={styles.subtitle}>Open sessions from partner hospitals and clinics.</p>
        </div>
        <Link to="/patient/appointments" className={styles.btnSecondary}>My appointments</Link>
      </header>

      <div className={styles.searchWrap}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search doctor, specialty or hospital"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search sessions"
        />
      </div>

      <div className={styles.chips} role="group" aria-label="Filter by specialty">
        {['', ...SPECIALTIES].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`${styles.chip} ${specialty === s ? styles.chipActive : ''}`}
            aria-pressed={specialty === s}
            onClick={() => chooseSpecialty(s)}
          >{s || 'All'}</button>
        ))}
      </div>

      {notice && <div className={styles.notice} role="status">{notice}</div>}

      {status === 'loading' && (
        <div aria-busy="true" aria-label="Loading sessions">
          <div className={styles.skeletonRow}>
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`skeleton-box ${styles.skDate}`} />)}
          </div>
          {[0, 1].map((i) => <div key={i} className={`skeleton-box ${styles.skCard}`} />)}
        </div>
      )}

      {status === 'error' && (
        <div className={styles.stateBox} role="alert">
          <p>{error || 'Could not load sessions.'}</p>
          <button type="button" className={styles.btnPrimary} onClick={reload}>Try again</button>
        </div>
      )}

      {status === 'ready' && slots.length === 0 && (
        <div className={styles.stateBox}>
          <p>No open sessions match your search.</p>
          {(specialty || search) && <button type="button" className={styles.btnSecondary} onClick={clearFilters}>Clear filters</button>}
        </div>
      )}

      {status === 'ready' && slots.length > 0 && (
        <>
          <div className={styles.dateRow} role="tablist" aria-label="Choose a date">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === activeDate}
                className={`${styles.dateBtn} ${d === activeDate ? styles.dateActive : ''}`}
                onClick={() => setPickedDate(d)}
              >
                <span className={styles.dateDay}>{formatSlotDate(d, { weekday: 'short' })}</span>
                <span className={styles.dateNum}>{formatSlotDate(d, { day: 'numeric' })}</span>
                <span className={styles.dateMonth}>{formatSlotDate(d, { month: 'short' })}</span>
                <span className={styles.dateCount}>{countByDate[d]} open</span>
              </button>
            ))}
          </div>

          <div className={styles.doctorGrid}>
            {groups.map((g) => (
              <article key={g.key} className={styles.doctorCard}>
                <div className={styles.doctorHead}>
                  <div className={styles.avatar} aria-hidden="true">{initials(g.doctor)}</div>
                  <div className={styles.doctorInfo}>
                    <h3 className={styles.doctorName}>{g.doctor}</h3>
                    <p className={styles.doctorSpec}>{g.specialty}</p>
                    <p className={styles.doctorOrg}>{g.org}</p>
                  </div>
                </div>
                <div className={styles.times}>
                  {g.times.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={styles.timeBtn}
                      onClick={() => { setSelected(s); setBookError(''); }}
                      aria-label={`Book ${g.doctor} on ${formatSlotLong(s.date, s.time)}`}
                    >{formatSlotTime(s.date, s.time)}</button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {selected && (
        <ConfirmSheet slot={selected} busy={booking} error={bookError} onConfirm={confirm} onClose={closeSheet} />
      )}
    </div>
  );
}

export default AvailableSlots;
