import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import styles from './AvailableSlots.module.css';

const SPECIALTY_MAP = { 'Dermatologist': 'dermatology', 'General Physician': 'general', 'Gastroenterologist': 'gastroenterology', 'Orthopedist': 'orthopedics', 'Cardiologist': 'cardiology', 'Emergency': null };

function normalizeFilter(raw) {
  if (!raw) return null;
  if (SPECIALTY_MAP[raw] !== undefined) return SPECIALTY_MAP[raw];
  return raw.toLowerCase();
}

function AvailableSlots() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const rawFilter = state?.specialty || null;
  const filterKey = normalizeFilter(rawFilter);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [booked, setBooked] = useState(null);

  const fetchSlots = async () => {
    setLoading(true); setError('');
    try { const { slots: results } = await api.getAvailableSlots(filterKey); setSlots(results); }
    catch (err) { setError(err.message || 'Failed to load available sessions.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSlots(); }, [filterKey]);

  const handleConfirm = async (slot) => {
    setConfirming(slot.id); setError('');
    try { const { booking } = await api.confirmBooking(slot.id); setBooked({ ...booking, org: slot.org }); }
    catch (err) { setError(err.message || 'Could not confirm session booking.'); await fetchSlots(); }
    finally { setConfirming(null); }
  };

  if (booked) {
    return (
      <div className={styles.bookedScreen}>
        <div className={styles.successCircle}>
          <svg className={styles.successSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className={styles.bookedHeading}>Doctor Session Confirmed</h1>
        <p className={styles.bookedText}>
          Doctor session booked with <span className={styles.bookedBold}>{booked.doctor}</span> at{' '}
          <span className={styles.bookedBold}>{booked.org}</span>, <span className={styles.bookedBold}>{booked.time}</span>.
        </p>
        <div className={styles.bookedCard}>
          {[{ l: 'Doctor', v: booked.doctor }, { l: 'Specialty', v: booked.specialty }, { l: 'Location', v: booked.org }, { l: 'Date', v: booked.date }, { l: 'Time', v: booked.time }].map((r) => (
            <div key={r.l} className={styles.bookedRow}>
              <span className={styles.bookedLabel}>{r.l}</span>
              <span className={styles.bookedValue} style={r.l === 'Specialty' ? { textTransform: 'capitalize' } : {}}>{r.v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/patient/home')} className={styles.backBtn}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.headerTitle}>
          {filterKey ? <>Available <span className={styles.capitalize}>{filterKey}</span> Sessions</> : 'Available Doctor Sessions'}
        </h1>
        <p className={styles.headerDesc}>
          {filterKey ? 'Showing sessions filtered by doctor specialty. Clear filter to see all.' : 'Select an available session to book your doctor appointment.'}
        </p>
      </div>

      <div className={styles.filterBar}>
        {filterKey && (
          <button onClick={() => navigate('/patient/slots')} className={styles.filterChip}>
            <span className={styles.capitalize}>{filterKey}</span>
            <svg className={styles.filterChipSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <span className={styles.slotCount}>{loading ? 'Loading...' : `${slots.length} session${slots.length !== 1 ? 's' : ''} available`}</span>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading && slots.length === 0 && (
        <div className={styles.skeleton}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonBar} />
              <div className={styles.skeletonBarShort} />
              <div className={styles.skeletonBarShorter} />
            </div>
          ))}
        </div>
      )}

      {!loading && slots.length === 0 && (
        <div className={styles.emptyCard}>
          <svg className={styles.emptySvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className={styles.emptyTitle}>No sessions available</p>
          <p className={styles.emptyDesc}>{filterKey ? 'Try removing the filter or check back later.' : 'Check back later for new openings.'}</p>
        </div>
      )}

      <div className={styles.slotList}>
        {slots.map((slot) => {
          const isConfirming = confirming === slot.id;
          return (
            <div key={slot.id} className={styles.slotCard}>
              <div className={styles.slotTop}>
                <div>
                  <p className={styles.slotDoctor}>{slot.doctor}</p>
                  <span className={styles.slotBadge}>{slot.specialty}</span>
                </div>
                <div>
                  <p className={styles.slotTime}>{slot.time}</p>
                  <p className={styles.slotDate}>{slot.date}</p>
                </div>
              </div>
              <div className={styles.slotLocation}>
                <svg className={styles.slotLocationSvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                {slot.org}
              </div>
              <button onClick={() => handleConfirm(slot)} disabled={isConfirming || confirming !== null} className={styles.bookBtn}>
                {isConfirming ? 'Confirming...' : 'Book Doctor Session'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AvailableSlots;
