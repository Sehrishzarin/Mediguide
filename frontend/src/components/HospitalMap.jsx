import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyOrganizations, addOrganizationReview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_LOCATION, getPosition, mapsDirectionsUrl, formatDistance } from './geo';
import styles from './HospitalMap.module.css';

// ---- Marker icons (divIcons, so Leaflet's default image icons are never needed) ----
const pin = (color, size) =>
  L.divIcon({
    className: styles.pinWrap,
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#fff" stroke-width="1.5"/><path d="M12 6v6M9 9h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });

const ICONS = {
  partner: pin('#0F9C8E', 32),
  partnerActive: pin('#0B7A6F', 44),
  public: pin('#2563EB', 32),
  publicActive: pin('#1D4ED8', 44),
  user: L.divIcon({
    className: styles.pinWrap,
    html: '<span class="' + styles.userDot + '"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  })
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'partner', label: 'MediGuide partners' },
  { key: 'public', label: 'Public facilities' }
];

const PAGE_SIZE = 5;

const coordsOf = (org) => {
  const [lng, lat] = org?.location?.coordinates || [];
  return typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;
};
const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

// Moves the map when the visible facilities or the selected one change
function MapController({ points, focus }) {
  const map = useMap();

  useEffect(() => {
    // Leaflet needs a size recalculation when the container was hidden/resized
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (points.length === 0) return;
    map.invalidateSize();
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 14 });
    }
  }, [map, points]);

  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [map, focus]);

  return null;
}

const Stars = ({ value, size = 16 }) => (
  <span className={styles.stars} aria-hidden="true" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= Math.round(value) ? styles.starOn : styles.starOff}>★</span>
    ))}
  </span>
);

function ReviewSection({ org, onUpdated }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) { setError('Please choose a star rating.'); return; }
    if (!comment.trim()) { setError('Please write a short comment.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await addOrganizationReview(org.id, rating, comment.trim());
      onUpdated(res.data);
      setDone(true);
      setComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.reviewsBox}>
      {org.reviews.length === 0 ? (
        <p className={styles.muted}>No reviews yet. Be the first to share your experience.</p>
      ) : (
        <ul className={styles.reviewList}>
          {org.reviews.map((r, i) => (
            <li key={`${r.patientName}-${r.visitDate}-${i}`} className={styles.reviewItem}>
              <div className={styles.reviewHead}>
                <strong>{r.patientName || 'Patient'}</strong>
                <Stars value={r.rating} size={13} />
              </div>
              <p>{r.comment}</p>
              {r.visitDate && <span className={styles.muted}>{r.visitDate}</span>}
            </li>
          ))}
        </ul>
      )}

      {done ? (
        <p className={styles.successMsg} role="status">Thanks! Your review was posted.</p>
      ) : (
        <form onSubmit={submit} className={styles.reviewForm}>
          <span className={styles.formLabel}>Rate your visit</span>
          <div className={styles.starPicker} role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className={`${styles.starBtn} ${n <= rating ? styles.starOn : styles.starOff}`}
                onClick={() => setRating(n)}
              >★</button>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share a few words about your experience"
            rows={3}
            maxLength={500}
          />
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}
          <button type="submit" className={styles.btnPrimary} disabled={busy}>
            {busy ? 'Posting…' : 'Post review'}
          </button>
        </form>
      )}
    </div>
  );
}

const FacilityCard = memo(function FacilityCard({ org, selected, onSelect, onBook, onUpdated, canReview }) {
  const [showReviews, setShowReviews] = useState(false);
  const ref = useRef(null);
  const directions = mapsDirectionsUrl(org);

  useEffect(() => {
    if (selected && ref.current) ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  const rating = org.isPartner
    ? (org.totalReviews > 0 ? { value: org.averageRating, count: org.totalReviews, label: 'reviews' } : null)
    : (org.publicRating > 0 ? { value: org.publicRating, count: org.publicReviewsCount, label: 'public ratings' } : null);

  return (
    <article
      ref={ref}
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      aria-current={selected ? 'true' : undefined}
    >
      <div
        role="button"
        tabIndex={0}
        className={styles.cardMain}
        onClick={() => onSelect(org.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(org.id); } }}
      >
        <div className={styles.cardTop}>
          <h4 className={styles.cardName}>{org.name}</h4>
          {typeof org.distanceKm === 'number' && <span className={styles.distance}>{formatDistance(org.distanceKm)}</span>}
        </div>
        <div className={styles.metaRow}>
          <span className={org.isPartner ? styles.badgePartner : styles.badgePublic}>
            {org.isPartner ? 'MediGuide partner' : 'Public facility'}
          </span>
          {org.type && <span className={styles.typeTag}>{org.type}</span>}
          {rating ? (
            <span className={styles.rating}>
              <Stars value={rating.value} size={13} /> {Number(rating.value).toFixed(1)}
              {rating.count > 0 && <span className={styles.muted}> ({rating.count} {rating.label})</span>}
            </span>
          ) : (
            org.isPartner && <span className={styles.muted}>No reviews yet</span>
          )}
        </div>
        {org.address && <p className={styles.address}>{org.address}</p>}
        {org.services?.length > 0 && (
          <div className={styles.services}>
            {org.services.slice(0, 4).map((s) => <span key={s} className={styles.serviceChip}>{s}</span>)}
            {org.services.length > 4 && <span className={styles.serviceChip}>+{org.services.length - 4}</span>}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {org.phone && <a href={telHref(org.phone)} className={styles.btnOutline}>Call</a>}
        {directions && <a href={directions} target="_blank" rel="noopener noreferrer" className={styles.btnOutline}>Directions</a>}
        {org.isPartner && org.allowAppBooking && (
          <button type="button" className={styles.btnPrimary} onClick={() => onBook?.(org)}>Book</button>
        )}
        {org.isPartner && (
          <button
            type="button"
            className={styles.btnGhost}
            aria-expanded={showReviews}
            onClick={() => setShowReviews((v) => !v)}
          >
            {showReviews ? 'Hide reviews' : 'Reviews'}
          </button>
        )}
      </div>

      {org.isPartner && showReviews && (
        canReview
          ? <ReviewSection org={org} onUpdated={onUpdated} />
          : <p className={styles.muted}>Sign in as a patient to read and post reviews.</p>
      )}
    </article>
  );
});

function Skeleton() {
  return (
    <div className={styles.skeletonWrap} aria-busy="true" aria-label="Loading nearby facilities">
      <div className={`skeleton-box ${styles.skMap}`} />
      {[0, 1, 2].map((i) => <div key={i} className={`skeleton-box ${styles.skCard}`} />)}
    </div>
  );
}

function HospitalMap({ onSelectBooking }) {
  const { user } = useAuth();
  const [loc, setLoc] = useState({ ...DEFAULT_LOCATION, isDefault: true });
  const [locating, setLocating] = useState(true);
  const [locNonce, setLocNonce] = useState(0);
  const [fetchNonce, setFetchNonce] = useState(0);
  const [orgs, setOrgs] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Device location (never blocks the first fetch)
  useEffect(() => {
    let cancelled = false;
    getPosition()
      .then((p) => { if (!cancelled) { setLoc({ ...p, isDefault: false }); setLocating(false); } })
      .catch(() => { if (!cancelled) { setLoc({ ...DEFAULT_LOCATION, isDefault: true }); setLocating(false); } });
    return () => { cancelled = true; };
  }, [locNonce]);

  // Facilities near the current origin; stale responses are ignored
  useEffect(() => {
    let cancelled = false;
    fetchNearbyOrganizations(loc.lat, loc.lng, 20)
      .then((res) => {
        if (cancelled) return;
        setOrgs(res.data || []);
        setStatus('ready');
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [loc.lat, loc.lng, fetchNonce]);

  const retryLocation = () => { setLocating(true); setLocNonce((n) => n + 1); };
  const retryFetch = () => { setStatus('loading'); setFetchNonce((n) => n + 1); };

  const changeFilter = (key) => { setFilter(key); setVisible(PAGE_SIZE); setSelectedId(null); };

  const filtered = useMemo(
    () => orgs.filter((o) => filter === 'all' || (filter === 'partner' ? o.isPartner : !o.isPartner)),
    [orgs, filter]
  );

  const points = useMemo(() => {
    const pts = filtered.map(coordsOf).filter(Boolean);
    const nearest = filtered[0]?.distanceKm;
    // Only include the user in the framing when they are reasonably close
    if (!loc.isDefault && typeof nearest === 'number' && nearest < 60) pts.push([loc.lat, loc.lng]);
    return pts;
  }, [filtered, loc]);

  const focus = useMemo(() => {
    const org = filtered.find((o) => o.id === selectedId);
    return org ? coordsOf(org) : null;
  }, [filtered, selectedId]);

  const handleSelect = useCallback((id) => setSelectedId(id), []);
  const handleUpdated = useCallback((updated) => {
    setOrgs((prev) => prev.map((o) => (o.id === updated.id ? { ...updated, distanceKm: o.distanceKm } : o)));
  }, []);

  const markers = useMemo(
    () => filtered.map((org) => {
      const pos = coordsOf(org);
      if (!pos) return null;
      const active = org.id === selectedId;
      const icon = org.isPartner ? (active ? ICONS.partnerActive : ICONS.partner) : (active ? ICONS.publicActive : ICONS.public);
      return (
        <Marker
          key={org.id}
          position={pos}
          icon={icon}
          title={org.name}
          zIndexOffset={active ? 1000 : 0}
          eventHandlers={{ click: () => setSelectedId(org.id) }}
        />
      );
    }),
    [filtered, selectedId]
  );

  const canReview = user?.role === 'user';

  if (status === 'loading') return <Skeleton />;

  return (
    <section className={styles.wrapper} aria-label="Nearby healthcare facilities">
      <header className={styles.header}>
        <h3 className={styles.title}>Nearby facilities</h3>
        <span className={styles.count}>{filtered.length} shown</span>
      </header>

      {locating && <div className={styles.infoBanner} role="status">Finding your location…</div>}
      {!locating && loc.isDefault && (
        <div className={styles.warnBanner} role="status">
          <span>Using a default location — enable location for accurate distances</span>
          <button type="button" className={styles.bannerBtn} onClick={retryLocation}>Retry</button>
        </div>
      )}

      <div className={styles.filters} role="group" aria-label="Filter facilities">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.pill} ${filter === f.key ? styles.pillActive : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => changeFilter(f.key)}
          >{f.label}</button>
        ))}
      </div>

      {status === 'error' ? (
        <div className={styles.stateBox} role="alert">
          <p>{error || 'Could not load nearby facilities.'}</p>
          <button type="button" className={styles.btnPrimary} onClick={retryFetch}>Try again</button>
        </div>
      ) : (
        <>
          <div className={styles.mapBox}>
            <MapContainer center={[loc.lat, loc.lng]} zoom={12} scrollWheelZoom={false} className={styles.map}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController points={points} focus={focus} />
              {!loc.isDefault && <Marker position={[loc.lat, loc.lng]} icon={ICONS.user} title="You are here" interactive={false} />}
              {markers}
            </MapContainer>
            <div className={styles.legend}>
              <span><i className={styles.dotPartner} /> MediGuide partner</span>
              <span><i className={styles.dotPublic} /> Public facility</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.stateBox}>
              <p>No facilities match this filter.</p>
              <button type="button" className={styles.btnOutline} onClick={() => changeFilter('all')}>Show all</button>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.slice(0, visible).map((org) => (
                <FacilityCard
                  key={org.id}
                  org={org}
                  selected={org.id === selectedId}
                  onSelect={handleSelect}
                  onBook={onSelectBooking}
                  onUpdated={handleUpdated}
                  canReview={canReview}
                />
              ))}
              {filtered.length > visible && (
                <button type="button" className={styles.btnOutline} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more ({filtered.length - visible})
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default HospitalMap;
