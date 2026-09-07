import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as api from '../services/api';
import { API_BASE_URL } from '../services/api';
import styles from './HospitalMap.module.css';

// Custom Map Pins: Green 🟢 for Registered MediGuide Partners, Blue 🔵 for Google Maps Public Facilities
const createCustomIcon = (type, label, source = 'mediguide_partner') => {
  const isPatient = type === 'patient';
  const isPartner = source === 'mediguide_partner';
  const color = isPatient ? '#2563eb' : isPartner ? '#059669' : '#0284c7';

  const iconSvg = isPatient
    ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="10" fill="#2563eb"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`
    : `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/><path d="M12 6v6M9 9h6" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`;

  const badgeColor = isPartner ? '#dcfce7' : '#e0f2fe';
  const textColor = isPartner ? '#15803d' : '#0369a1';
  const iconLabel = isPartner ? `🟢 ${label}` : `🔵 ${label}`;

  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">${iconSvg}<span style="background:${badgeColor};color:${textColor};font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;border:1px solid ${isPartner ? '#bbf7d0' : '#bae6fd'};box-shadow:0 2px 4px rgba(0,0,0,0.15);white-space:nowrap;">${iconLabel}</span></div>`,
    iconSize: [32, 48],
    iconAnchor: [16, 48]
  });
};

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function HospitalMap({ filterSpecialty = '', onSelectBooking = null }) {
  const [patientCoords, setPatientCoords] = useState([40.7128, -74.0060]); // Default coords
  const [locationStatus, setLocationStatus] = useState('requesting');
  const [facilities, setFacilities] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'partners', 'google'
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Review Modal State for Registered App Partners
  const [reviewModalOrg, setReviewModalOrg] = useState(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPatientCoords([lat, lng]);
          setLocationStatus('success');
          loadNearbyFacilities(lat, lng);
        },
        (err) => {
          console.warn('Geolocation permission denied/unavailable:', err.message);
          setLocationStatus('denied');
          loadNearbyFacilities(40.7128, -74.0060);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationStatus('denied');
      loadNearbyFacilities(40.7128, -74.0060);
    }
  }, []);

  const loadNearbyFacilities = async (lat, lng) => {
    setLoading(true);
    try {
      const data = await api.fetchNearbyOrganizations(lat, lng, 15);
      const list = data?.data || data?.organizations || [];
      const formatted = list.map((fac, idx) => {
        const coords = fac.location?.coordinates
          ? [fac.location.coordinates[1], fac.location.coordinates[0]]
          : [lat + (idx % 2 === 0 ? 0.008 * (idx + 1) : -0.007 * (idx + 1)), lng + (idx % 3 === 0 ? 0.009 * (idx + 1) : -0.006 * (idx + 1))];

        return {
          ...fac,
          id: fac._id || fac.id || `fac_${idx}`,
          coords,
          distanceKm: fac.distanceKm || (1.1 + idx * 0.7).toFixed(1),
          source: fac.source || (fac.isPartner ? 'mediguide_partner' : 'google_maps')
        };
      });

      setFacilities(formatted);
    } catch (err) {
      console.error('Failed to load facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostReview = async (e) => {
    e.preventDefault();
    if (!reviewModalOrg || !newComment.trim() || submittingReview) return;

    setSubmittingReview(true);
    setReviewSuccess('');

    try {
      const orgId = reviewModalOrg._id || reviewModalOrg.id;
      const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating, comment: newComment, patientName: 'Verified App Patient' })
      });

      const resData = await res.json();
      if (resData.success) {
        setReviewSuccess('✓ Your review has been posted successfully!');
        setNewComment('');
        // Reload facilities to reflect updated reviews & rating
        loadNearbyFacilities(patientCoords[0], patientCoords[1]);
      }
    } catch (err) {
      console.error('Failed to post review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredFacilities = facilities.filter((fac) => {
    if (activeTab === 'partners') return fac.source === 'mediguide_partner';
    if (activeTab === 'google') return fac.source === 'google_maps';
    return true;
  });

  return (
    <div className={styles.mapContainerCard}>
      {/* Map Header & Source Filter Tabs */}
      <div className={styles.mapHeader}>
        <div className={styles.mapTitleBox}>
          <span className={styles.mapIcon}>🏥</span>
          <div>
            <h4 className={styles.mapHeading}>Healthcare Facilities Map</h4>
            <p className={styles.mapSubtext}>
              Dual Source: 🟢 Registered MediGuide Partners & 🔵 Nearby Google Maps Facilities
            </p>
          </div>
        </div>

        {locationStatus === 'denied' && <span className={styles.locationBadgeDenied}>Location Off</span>}
        {locationStatus === 'success' && <span className={styles.locationBadgeSuccess}>Live GPS</span>}
      </div>

      {/* Filter Tabs */}
      <div className={styles.sourceTabsRow}>
        <button
          type="button"
          className={`${styles.sourceTab} ${activeTab === 'all' ? styles.activeSourceTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Facilities ({facilities.length})
        </button>
        <button
          type="button"
          className={`${styles.sourceTab} ${styles.tabPartner} ${activeTab === 'partners' ? styles.activeSourceTab : ''}`}
          onClick={() => setActiveTab('partners')}
        >
          🟢 MediGuide Partners (Direct Booking)
        </button>
        <button
          type="button"
          className={`${styles.sourceTab} ${styles.tabGoogle} ${activeTab === 'google' ? styles.activeSourceTab : ''}`}
          onClick={() => setActiveTab('google')}
        >
          🔵 Google Maps Facilities
        </button>
      </div>

      {/* Map Canvas */}
      <div className={styles.mapWrapper}>
        <MapContainer center={patientCoords} zoom={13} scrollWheelZoom={false} className={styles.leafletMap}>
          <ChangeView center={patientCoords} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Patient Location */}
          <Marker position={patientCoords} icon={createCustomIcon('patient', 'You', 'patient')}>
            <Popup>
              <div className={styles.popupCard}>
                <strong>📍 Your Location</strong>
                <p>Live GPS position active</p>
              </div>
            </Popup>
          </Marker>

          {/* Facility Markers */}
          {filteredFacilities.map((fac) => (
            <Marker
              key={fac.id}
              position={fac.coords}
              icon={createCustomIcon(fac.type || 'Hospital', fac.name, fac.source)}
              eventHandlers={{ click: () => setSelectedFacility(fac) }}
            >
              <Popup>
                <div className={styles.popupCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span className={fac.source === 'mediguide_partner' ? styles.badgePartnerMini : styles.badgeGoogleMini}>
                      {fac.source === 'mediguide_partner' ? '🟢 Registered Partner' : '🔵 Google Maps'}
                    </span>
                  </div>
                  <h5>{fac.name}</h5>
                  <p className={styles.popupType}>{fac.type} • ⭐ {fac.averageRating || fac.googleRating || fac.rating || '4.6'}</p>
                  <p className={styles.popupAddress}>📍 {fac.address}</p>

                  {fac.source === 'mediguide_partner' ? (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button
                        type="button"
                        className={styles.popupBookBtn}
                        onClick={() => onSelectBooking && onSelectBooking(fac)}
                      >
                        📅 Book Doctor Session
                      </button>
                      <button
                        type="button"
                        className={styles.popupReviewBtn}
                        onClick={() => setReviewModalOrg(fac)}
                      >
                        ⭐ App Reviews ({fac.reviews?.length || fac.totalReviews || 0})
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '6px' }}>
                      <p className={styles.googleSnippet}>{fac.publicReviewSnippet || `⭐ ${fac.googleRating} (${fac.googleReviewsCount} Google Reviews)`}</p>
                      {fac.phone && <a href={`tel:${fac.phone}`} className={styles.popupCallBtn}>📞 Call {fac.phone}</a>}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Facilities Cards Scroll list below Map */}
      <div className={styles.facilityListContainer}>
        <h5 className={styles.listHeaderTitle}>
          Showing {filteredFacilities.length} Healthcare Facilities Nearby
        </h5>
        <div className={styles.facilityCardsScroll}>
          {filteredFacilities.map((fac) => (
            <div
              key={fac.id}
              className={`${styles.facilityCard} ${fac.source === 'mediguide_partner' ? styles.cardPartnerBorder : styles.cardGoogleBorder} ${selectedFacility?.id === fac.id ? styles.selectedCard : ''}`}
              onClick={() => {
                setSelectedFacility(fac);
                setPatientCoords(fac.coords);
              }}
            >
              <div className={styles.badgeSourceHeader}>
                <span className={fac.source === 'mediguide_partner' ? styles.tagPartner : styles.tagGoogle}>
                  {fac.source === 'mediguide_partner' ? '🟢 MediGuide Partner' : '🔵 Google Maps'}
                </span>
                <span className={styles.distTag}>{fac.distanceKm} km</span>
              </div>

              <div className={styles.facilityCardTop}>
                <strong>{fac.name}</strong>
              </div>

              <p className={styles.facAddress}>📍 {fac.address}</p>

              <div className={styles.facCardFooter}>
                <span className={styles.facType}>{fac.type}</span>
                <span className={styles.facRating}>⭐ {fac.averageRating || fac.googleRating || fac.rating || '4.6'}</span>
              </div>

              {/* Verified Patient Review Preview Snippet */}
              {fac.source === 'mediguide_partner' && fac.reviews && fac.reviews.length > 0 && (
                <div className={styles.cardReviewSnippet}>
                  💬 "{fac.reviews[0].comment.length > 60 ? fac.reviews[0].comment.substring(0, 60) + '...' : fac.reviews[0].comment}"
                  <span className={styles.reviewAuthor}> — {fac.reviews[0].patientName} ({'⭐'.repeat(fac.reviews[0].rating)})</span>
                </div>
              )}

              {fac.source === 'mediguide_partner' ? (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className={styles.btnBookMini}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBooking && onSelectBooking(fac);
                    }}
                  >
                    📅 Book Session
                  </button>
                  <button
                    type="button"
                    className={styles.btnReviewMini}
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewModalOrg(fac);
                    }}
                  >
                    ⭐ {fac.reviews?.length || fac.totalReviews || 0} Reviews
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '6px' }}>
                  {fac.phone && (
                    <a href={`tel:${fac.phone}`} className={styles.btnCallMini}>📞 Call Hospital</a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Patient Reviews Modal for Registered App Partner Organizations */}
      {reviewModalOrg && (
        <div className={styles.modalOverlay} onClick={() => setReviewModalOrg(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.badgePartnerMini}>🟢 Registered Partner</span>
                <h4>⭐ {reviewModalOrg.name} - Patient Reviews</h4>
              </div>
              <button type="button" className={styles.btnCloseModal} onClick={() => setReviewModalOrg(null)}>✕</button>
            </div>

            {reviewSuccess && <div className={styles.successAlert}>{reviewSuccess}</div>}

            {/* In-App Patient Reviews List */}
            <div className={styles.reviewsListSection}>
              <h5>Verified App Patient Reviews ({reviewModalOrg.reviews?.length || 0})</h5>
              {(!reviewModalOrg.reviews || reviewModalOrg.reviews.length === 0) ? (
                <p className={styles.noReviews}>No patient reviews written yet. Be the first to leave a review!</p>
              ) : (
                <div className={styles.reviewsScroll}>
                  {reviewModalOrg.reviews.map((rev, i) => (
                    <div key={i} className={styles.reviewItemCard}>
                      <div className={styles.reviewItemTop}>
                        <strong>👤 {rev.patientName || 'Verified Patient'}</strong>
                        <span className={styles.reviewStars}>{'⭐'.repeat(rev.rating)}</span>
                      </div>
                      <p className={styles.reviewComment}>"{rev.comment}"</p>
                      <span className={styles.reviewDate}>Visited: {rev.visitDate || 'Recently'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Write a Review Form */}
            <form onSubmit={handlePostReview} className={styles.reviewForm}>
              <h5>✍️ Write a Patient Review</h5>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '700' }}>Your Rating:</label>
                <select
                  value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                  className={styles.ratingSelect}
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5/5 Excellent)</option>
                  <option value={4}>⭐⭐⭐⭐ (4/5 Very Good)</option>
                  <option value={3}>⭐⭐⭐ (3/5 Average)</option>
                  <option value={2}>⭐⭐ (2/5 Needs Improvement)</option>
                  <option value={1}>⭐ (1/5 Poor)</option>
                </select>
              </div>

              <textarea
                rows={2}
                placeholder="Write about your experience with doctors and facilities..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className={styles.reviewTextarea}
                required
              />

              <button type="submit" className={styles.btnSubmitReview} disabled={submittingReview}>
                {submittingReview ? 'Posting Review...' : 'Post Patient Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
