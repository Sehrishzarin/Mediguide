import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePatient } from './PatientContext';
import * as api from '../../services/api';
import styles from './AvailableSlots.module.css';

const SPECIALTY_MAP = {
  'Dermatologist': 'dermatology',
  'General Physician': 'general',
  'Gastroenterologist': 'gastroenterology',
  'Orthopedist': 'orthopedics',
  'Cardiologist': 'cardiology',
  'Emergency': null
};

const CATEGORY_ITEMS = [
  { key: 'all', label: 'All', icon: '🏅', bg: '#f0fdfa', color: '#0d9488' },
  { key: 'cardiology', label: 'Cardiology', icon: '❤️', bg: '#fef2f2', color: '#ef4444' },
  { key: 'medicine', label: 'Medicine', icon: '💊', bg: '#f0f9ff', color: '#0284c7' },
  { key: 'general', label: 'General', icon: '🩺', bg: '#fdf2f8', color: '#ec4899' }
];

const DATE_SCHEDULES = [
  { day: '7', name: 'Sun' },
  { day: '8', name: 'Mon' },
  { day: '9', name: 'Tue' },
  { day: '10', name: 'Wed' },
  { day: '11', name: 'Thu' },
];

const VISIT_HOURS = [
  '11:00AM', '12:00PM', '01:00PM', '02:00PM', '03:00PM', '04:00PM', '05:00PM', '06:00PM'
];

function normalizeFilter(raw) {
  if (!raw) return null;
  if (SPECIALTY_MAP[raw] !== undefined) return SPECIALTY_MAP[raw];
  return raw.toLowerCase();
}

function getInitials(name = '') {
  return name.replace(/^Dr\.\s*/i, '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DR';
}

function AvailableSlots() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = usePatient();

  const rawFilter = state?.specialty || null;
  const filterKey = normalizeFilter(rawFilter);

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(filterKey || 'all');
  const [favorites, setFavorites] = useState({});

  // Appointment Modal State
  const [selectedDoctorSlot, setSelectedDoctorSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('9');
  const [selectedTime, setSelectedTime] = useState('12:00PM');
  const [confirming, setConfirming] = useState(null);
  const [booked, setBooked] = useState(null);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const targetCategory = activeCategory === 'all' ? null : activeCategory;
      const { slots: results } = await api.getAvailableSlots(targetCategory);
      setSlots(results || []);
    } catch (err) {
      setError(err.message || 'Failed to load available doctor sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [activeCategory]);

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenBookingModal = (slot) => {
    setSelectedDoctorSlot(slot);
    if (slot.time) setSelectedTime(slot.time);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctorSlot) return;
    setConfirming(selectedDoctorSlot.id);
    setError('');
    try {
      const { booking } = await api.confirmBooking(selectedDoctorSlot.id);
      setBooked({
        ...booking,
        org: selectedDoctorSlot.org,
        date: `Aug ${selectedDate}, 2026`,
        time: selectedTime
      });
      setSelectedDoctorSlot(null);
    } catch (err) {
      setError(err.message || 'Could not confirm session booking.');
      await fetchSlots();
    } finally {
      setConfirming(null);
    }
  };

  // Filter slots by search query
  const filteredSlots = slots.filter((slot) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      slot.doctor?.toLowerCase().includes(q) ||
      slot.specialty?.toLowerCase().includes(q) ||
      slot.org?.toLowerCase().includes(q)
    );
  });

  if (booked) {
    return (
      <div className={styles.bookedScreen}>
        <div className={styles.successCircle}>
          <svg className={styles.successSvg} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className={styles.bookedHeading}>Appointment Confirmed!</h1>
        <p className={styles.bookedText}>
          Your session with <span className={styles.bookedBold}>{booked.doctor}</span> is locked in.
        </p>
        <div className={styles.bookedCard}>
          {[{ l: 'Doctor', v: booked.doctor }, { l: 'Specialty', v: booked.specialty }, { l: 'Clinic / Hospital', v: booked.org }, { l: 'Scheduled Date', v: booked.date }, { l: 'Visit Hour', v: booked.time }].map((r) => (
            <div key={r.l} className={styles.bookedRow}>
              <span className={styles.bookedLabel}>{r.l}</span>
              <span className={styles.bookedValue} style={r.l === 'Specialty' ? { textTransform: 'capitalize' } : {}}>{r.v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/patient/home')} className={styles.backBtn}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ── Teal Gradient Hero Header Panel ── */}
      <div className={styles.heroPanel}>
        <div className={styles.heroHeaderRow}>
          <div className={styles.menuIconCircle} onClick={() => navigate('/patient/home')}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </div>
          <div className={styles.userAvatarCircle} onClick={() => navigate('/patient/profile')}>
            <span>{(user?.name || 'User').charAt(0).toUpperCase()}</span>
          </div>
        </div>

        <h1 className={styles.heroTitle}>Let&apos;s find your top doctor!</h1>

        {/* Search Bar */}
        <div className={styles.searchBarBox}>
          <svg className={styles.searchIconSvg} fill="none" stroke="#94A3B8" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search health issue or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Categories Section ── */}
      <div className={styles.categoriesSection}>
        <h2 className={styles.sectionHeading}>Categories</h2>
        <div className={styles.categoriesRow}>
          {CATEGORY_ITEMS.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`${styles.categoryCard} ${activeCategory === cat.key ? styles.activeCategoryCard : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <div className={styles.categoryIconCircle} style={{ background: cat.bg, color: cat.color }}>
                <span>{cat.icon}</span>
              </div>
              <span className={styles.categoryLabel}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Top Doctor List Section ── */}
      <div className={styles.doctorListSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h2 className={styles.sectionHeading}>Top Doctors</h2>
          <span className={styles.slotCountText}>
            {loading ? 'Loading...' : `${filteredSlots.length} available`}
          </span>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {loading && (
          <div className={styles.skeleton}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {!loading && filteredSlots.length === 0 && (
          <div className={styles.emptyCard}>
            <p className={styles.emptyTitle}>No doctors found</p>
            <p className={styles.emptyDesc}>Try selecting &quot;All&quot; categories or adjusting your search term.</p>
          </div>
        )}

        <div className={styles.doctorListGrid}>
          {filteredSlots.map((slot, idx) => {
            const rating = (4.8 + (idx % 3) * 0.1).toFixed(1);
            const isFav = favorites[slot.id];

            return (
              <div key={slot.id} className={styles.doctorCard}>
                {/* Doctor Avatar with Green Online Dot */}
                <div className={styles.doctorAvatarWrapper}>
                  <div className={styles.doctorAvatarCircle}>
                    <span>{getInitials(slot.doctor)}</span>
                  </div>
                  <span className={styles.onlineBadge} />
                  <div className={styles.ratingBadge}>
                    <span>⭐ {rating}</span>
                  </div>
                </div>

                {/* Doctor Info */}
                <div className={styles.doctorBody}>
                  <h3 className={styles.doctorName}>{slot.doctor}</h3>
                  <p className={styles.doctorSpecialty}>
                    {slot.specialty || 'Specialist Physician'} • {slot.org}
                  </p>

                  {/* Actions Row: Appointment Button + Chat Icon + Heart Icon */}
                  <div className={styles.doctorActionsRow}>
                    <button
                      type="button"
                      className={styles.btnAppointmentPill}
                      onClick={() => handleOpenBookingModal(slot)}
                    >
                      Appointment
                    </button>

                    <button
                      type="button"
                      className={styles.iconCircleBtn}
                      onClick={() => navigate('/patient/triage')}
                      title="AI Chat Triage"
                    >
                      💬
                    </button>

                    <button
                      type="button"
                      className={`${styles.iconCircleBtn} ${isFav ? styles.favActive : ''}`}
                      onClick={(e) => toggleFavorite(e, slot.id)}
                      title="Favorite Doctor"
                    >
                      {isFav ? '❤️' : '🤍'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DOCTOR APPOINTMENT BOOKING MODAL (Mockup 2 Design) ── */}
      {selectedDoctorSlot && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDoctorSlot(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* Top Modal Header */}
            <div className={styles.modalTopHeader}>
              <button type="button" className={styles.modalBackBtn} onClick={() => setSelectedDoctorSlot(null)}>
                ←
              </button>
              <h3 className={styles.modalHeadingTitle}>Appointment</h3>
              <div style={{ width: 28 }} />
            </div>

            {/* Doctor Info Hero */}
            <div className={styles.modalDoctorHero}>
              <div className={styles.modalAvatarWrapper}>
                <div className={styles.modalAvatarCircle}>
                  <span>{getInitials(selectedDoctorSlot.doctor)}</span>
                </div>
                <span className={styles.onlineBadge} />
              </div>
              <h2 className={styles.modalDoctorName}>{selectedDoctorSlot.doctor}</h2>
              <p className={styles.modalDoctorSub}>💖 {selectedDoctorSlot.specialty} Specialist</p>

              {/* Teal Stats Box */}
              <div className={styles.tealStatPanel}>
                <div className={styles.statWhitePill}>
                  <strong className={styles.statPillNumber}>350+</strong>
                  <span className={styles.statPillLabel}>Patients</span>
                </div>
                <div className={styles.statWhitePill}>
                  <strong className={styles.statPillNumber} style={{ color: '#10B981' }}>15+</strong>
                  <span className={styles.statPillLabel}>Exp. years</span>
                </div>
                <div className={styles.statWhitePill}>
                  <strong className={styles.statPillNumber} style={{ color: '#F43F5E' }}>284+</strong>
                  <span className={styles.statPillLabel}>Reviews</span>
                </div>
              </div>
            </div>

            {/* About Doctor Section */}
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>About Doctor</h4>
              <p className={styles.modalSectionDesc}>
                {selectedDoctorSlot.doctor} is a top specialist physician at {selectedDoctorSlot.org}. Available for private consultation, medical triage, and in-person appointments.
              </p>
            </div>

            {/* Schedules Date Selector */}
            <div className={styles.modalSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 className={styles.modalSectionTitle}>Schedules</h4>
                <span style={{ fontSize: '0.8125rem', color: '#0F9C8E', fontWeight: '700' }}>August &gt;</span>
              </div>
              <div className={styles.datesGrid}>
                {DATE_SCHEDULES.map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    className={`${styles.dateChip} ${selectedDate === d.day ? styles.activeDateChip : ''}`}
                    onClick={() => setSelectedDate(d.day)}
                  >
                    <strong className={styles.dateNum}>{d.day}</strong>
                    <span className={styles.dateDay}>{d.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visit Hour Time Selector */}
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>Visit Hour</h4>
              <div className={styles.timeGrid}>
                {VISIT_HOURS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.timeChip} ${selectedTime === t ? styles.activeTimeChip : ''}`}
                    onClick={() => setSelectedTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Book Appointment Full Button */}
            <button
              type="button"
              className={styles.modalBookBtn}
              onClick={handleConfirmBooking}
              disabled={confirming !== null}
            >
              {confirming ? 'Confirming Appointment...' : 'Book Appointment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvailableSlots;

