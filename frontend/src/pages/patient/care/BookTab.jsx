import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, CalendarSearch, CheckCircle2, Stethoscope, Building2, CalendarDays, X } from 'lucide-react';
import { getAvailableSlots, bookSlot } from '../../../services/api';
import { Card, Button, Chip, ChipRow, Input, Alert, EmptyState, ErrorState, Skeleton, Avatar, IconButton } from '../../../components/ui';
import ConfirmSheet from './ConfirmSheet';
import { slotToDate, formatSlotDate, formatSlotTime, formatSlotLong } from './slotTime';
import { friendlyError } from './errors';
import styles from './Care.module.css';

const SPECIALTIES = ['Cardiologist', 'General Physician', 'Pediatrician', 'Dermatologist', 'Gastroenterologist', 'Orthopedist'];

const doctorDisplayName = (name = '') => name.replace(/^Dr\.?\s*/i, '');

// Matches "dermatologist", "Dermatology" etc. against the chip list
const matchSpecialty = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  return SPECIALTIES.find((s) => s.toLowerCase() === v)
    || SPECIALTIES.find((s) => v.startsWith(s.toLowerCase().slice(0, 6)))
    || '';
};

function LoadingSessions() {
  return (
    <div className={styles.stack} aria-busy="true" aria-label="Loading sessions">
      <div className={styles.dateStrip}>
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} width={64} height={72} radius="var(--r-md)" />)}
      </div>
      {[0, 1].map((i) => (
        <Card key={i} padding="md" className={styles.stack}>
          <div className={styles.doctorHead}>
            <Skeleton width={44} height={44} radius="50%" />
            <div className={styles.grow}><Skeleton width="50%" height={14} /><Skeleton width="70%" height={12} className={styles.mt2} /></div>
          </div>
          <div className={styles.timeRow}>
            {[0, 1, 2].map((j) => <Skeleton key={j} width={80} height={36} radius="var(--r-full)" />)}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SlotDetails({ slot }) {
  return (
    <dl className={styles.details}>
      <div><dt><Stethoscope size={16} aria-hidden="true" /> Doctor</dt><dd>{slot.doctor}<span className={styles.detailSub}>{slot.specialty}</span></dd></div>
      <div><dt><Building2 size={16} aria-hidden="true" /> Facility</dt><dd>{slot.org}</dd></div>
      <div><dt><CalendarDays size={16} aria-hidden="true" /> When</dt><dd>{formatSlotLong(slot.date, slot.time)}</dd></div>
    </dl>
  );
}

function BookTab() {
  const { state: navState } = useLocation();

  const [specialty, setSpecialty] = useState(() => matchSpecialty(navState?.specialty));
  const [search, setSearch] = useState(() => navState?.orgName || '');
  const [debounced, setDebounced] = useState(() => (navState?.orgName || '').trim());
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null, slots: [], error: '' });
  const [notice, setNotice] = useState('');
  const [pickedDate, setPickedDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [booked, setBooked] = useState(null);

  const requestKey = `${specialty}|${debounced}|${nonce}`;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getAvailableSlots({ specialty, search: debounced })
      .then((res) => {
        if (cancelled) return;
        const now = new Date();
        const upcoming = (res.data || []).filter((x) => slotToDate(x.date, x.time) >= now);
        setResult({ key: requestKey, slots: upcoming, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, slots: [], error: friendlyError(err, "Couldn't load doctor sessions.") });
      });
    return () => { cancelled = true; };
  }, [specialty, debounced, requestKey]);

  const { slots, error } = result;
  const status = result.key !== requestKey ? 'loading' : error ? 'error' : 'ready';

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const clearFilters = () => { setSpecialty(''); setSearch(''); setDebounced(''); setNotice(''); };

  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))].sort(), [slots]);
  const activeDate = dates.includes(pickedDate) ? pickedDate : dates[0] || '';

  const countByDate = useMemo(() => {
    const c = {};
    slots.forEach((s) => { c[s.date] = (c[s.date] || 0) + 1; });
    return c;
  }, [slots]);

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
        setNotice('Sorry, that session was just taken. Here are the latest available times.');
        reload();
      } else {
        setBookError(friendlyError(err, "Couldn't book this session. Please try again."));
      }
    } finally {
      setBooking(false);
    }
  };

  if (booked) {
    return (
      <Card padding="lg" className={styles.success} role="status">
        <span className={styles.successIcon}><CheckCircle2 size={28} aria-hidden="true" /></span>
        <h2 className={styles.successTitle}>You're booked</h2>
        <p className={styles.successText}>We've added this appointment to your list.</p>
        <SlotDetails slot={booked} />
        <div className={styles.successActions}>
          <Button to="/patient/care/appointments" block>View my appointments</Button>
          <Button variant="secondary" block onClick={() => { setBooked(null); reload(); }}>Book another</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search doctor, specialty or hospital"
          aria-label="Search doctor sessions"
          className={styles.searchInput}
        />
        {search && (
          <IconButton icon={X} label="Clear search" size="sm" className={styles.searchClear} onClick={() => { setSearch(''); setDebounced(''); }} />
        )}
      </div>

      <div role="group" aria-label="Filter by specialty">
        <ChipRow>
          {['', ...SPECIALTIES].map((s) => (
            <Chip key={s || 'all'} selected={specialty === s} onClick={() => { setSpecialty(s); setNotice(''); }}>
              {s || 'All'}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {notice && <Alert tone="warning">{notice}</Alert>}

      {status === 'loading' && <LoadingSessions />}

      {status === 'error' && (
        <Card padding="none"><ErrorState message={error} onRetry={reload} /></Card>
      )}

      {status === 'ready' && slots.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon={CalendarSearch}
            title="No open sessions found"
            text={specialty || search ? 'Try another specialty or clear your search.' : 'Partner hospitals have no open sessions right now. Please check back soon.'}
            action={(specialty || search) ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
          />
        </Card>
      )}

      {status === 'ready' && slots.length > 0 && (
        <>
          <div className={styles.dateStrip} role="tablist" aria-label="Choose a date">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === activeDate}
                aria-label={`${formatSlotDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}, ${countByDate[d]} open`}
                className={`${styles.dateBtn} ${d === activeDate ? styles.dateBtnActive : ''}`}
                onClick={() => setPickedDate(d)}
              >
                <span className={styles.dateDay}>{formatSlotDate(d, { weekday: 'short' })}</span>
                <span className={styles.dateNum}>{formatSlotDate(d, { day: 'numeric' })}</span>
                <span className={styles.dateMonth}>{formatSlotDate(d, { month: 'short' })}</span>
              </button>
            ))}
          </div>

          <p className={styles.resultMeta}>
            {groups.length} {groups.length === 1 ? 'doctor' : 'doctors'} available on {formatSlotDate(activeDate, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>

          <div className={styles.doctorGrid}>
            {groups.map((g) => (
              <Card key={g.key} as="article" padding="md" className={styles.doctorCard}>
                <div className={styles.doctorHead}>
                  <Avatar name={doctorDisplayName(g.doctor)} size={44} />
                  <div className={styles.grow}>
                    <h3 className={styles.doctorName}>{g.doctor}</h3>
                    <p className={styles.doctorMeta}>{g.specialty}</p>
                    <p className={styles.doctorOrg}><Building2 size={14} aria-hidden="true" />{g.org}</p>
                  </div>
                </div>
                <div className={styles.timeRow} role="group" aria-label={`Available times for ${g.doctor}`}>
                  {g.times.map((s) => (
                    <Chip
                      key={s.id}
                      selected={false}
                      aria-pressed={undefined}
                      onClick={() => { setSelected(s); setBookError(''); }}
                      aria-label={`Book ${g.doctor}, ${formatSlotLong(s.date, s.time)}`}
                    >
                      {formatSlotTime(s.date, s.time)}
                    </Chip>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {selected && (
        <ConfirmSheet
          title="Confirm your booking"
          busy={booking}
          onClose={closeSheet}
          actions={
            <>
              <Button variant="secondary" onClick={closeSheet} disabled={booking}>Cancel</Button>
              <Button onClick={confirm} loading={booking} data-autofocus>Confirm booking</Button>
            </>
          }
        >
          <SlotDetails slot={selected} />
          {bookError && <Alert tone="danger" className={styles.mt3}>{bookError}</Alert>}
        </ConfirmSheet>
      )}
    </div>
  );
}

export default BookTab;
