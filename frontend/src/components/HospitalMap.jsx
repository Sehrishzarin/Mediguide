import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, Navigation, CalendarPlus, ChevronDown, Star, MapPin, LocateFixed, Building2 } from 'lucide-react';
import { fetchNearbyOrganizations, addOrganizationReview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Alert, Segmented, EmptyState, ErrorState, Skeleton, Field, Textarea } from './ui';
import { DEFAULT_LOCATION, getPosition, mapsDirectionsUrl, formatDistance } from './geo';
import styles from './HospitalMap.module.css';

// ---- Marker icons (divIcons, coloured with design tokens via inline style) ----
const pin = (colorVar, size) =>
  L.divIcon({
    className: styles.pinWrap,
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" style="fill:var(${colorVar});stroke:var(--surface);stroke-width:1.5"/><path d="M12 6v6M9 9h6" style="stroke:var(--surface);stroke-width:2.2;stroke-linecap:round"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });

const ICONS = {
  partner: pin('--brand', 32),
  partnerActive: pin('--brand-hover', 44),
  public: pin('--info', 32),
  publicActive: pin('--info', 44),
  user: L.divIcon({
    className: styles.pinWrap,
    html: '<span class="' + styles.userDot + '"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  })
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'partner', label: 'Partners' },
  { value: 'public', label: 'Public' }
];

const PAGE_SIZE = 5;

const coordsOf = (org) => {
  const [lng, lat] = org?.location?.coordinates || [];
  return typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;
};
const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

const friendly = (err, fallback) => {
  const msg = err?.message || '';
  if (!err?.status && msg && !/request failed/i.test(msg)) return msg; // network copy from api.js is already friendly
  if (err?.status === 400 && msg && !/request failed/i.test(msg)) return msg;
  if (err?.status === 401) return 'Your session has expired. Please sign in again.';
  return fallback;
};

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

const Stars = ({ value, size = 14 }) => (
  <span className={styles.stars} aria-hidden="true">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={size} className={n <= Math.round(value) ? styles.starOn : styles.starOff} />
    ))}
  </span>
);

function ReviewSection({ org, onUpdated }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const fieldId = `review-${org.id}`;

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
      setError(friendly(err, "Couldn't post your review. Please try again."));
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
                <span className={styles.reviewRating}>
                  <Stars value={r.rating} size={12} />
                  <span className="sr-only">{r.rating} out of 5</span>
                </span>
              </div>
              <p className={styles.reviewText}>{r.comment}</p>
              {r.visitDate && <span className={styles.muted}>{r.visitDate}</span>}
            </li>
          ))}
        </ul>
      )}

      {done ? (
        <Alert tone="success">Thanks, your review was posted.</Alert>
      ) : (
        <form onSubmit={submit} className={styles.reviewForm}>
          <span className={styles.formLabel} id={`${fieldId}-rating`}>Rate your visit</span>
          <div className={styles.starPicker} role="radiogroup" aria-labelledby={`${fieldId}-rating`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className={styles.starBtn}
                onClick={() => setRating(n)}
              >
                <Star size={24} className={n <= rating ? styles.starOn : styles.starOff} aria-hidden="true" />
              </button>
            ))}
          </div>
          <Field label="Your comment" htmlFor={fieldId} error={error}>
            <Textarea
              id={fieldId}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share a few words about your experience"
              rows={3}
              maxLength={500}
            />
          </Field>
          <div>
            <Button type="submit" size="sm" loading={busy}>Post review</Button>
          </div>
        </form>
      )}
    </div>
  );
}

const FacilityCard = memo(function FacilityCard({ org, selected, onSelect, onBook, onUpdated, canReview }) {
  const [showReviews, setShowReviews] = useState(false);
  const ref = useRef(null);
  const directions = mapsDirectionsUrl(org);
  const reviewsId = `reviews-${org.id}`;

  useEffect(() => {
    if (selected && ref.current) ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  const rating = org.isPartner
    ? (org.totalReviews > 0 ? { value: org.averageRating, count: org.totalReviews, label: org.totalReviews === 1 ? 'review' : 'reviews' } : null)
    : (org.publicRating > 0 ? { value: org.publicRating, count: org.publicReviewsCount, label: org.publicReviewsCount === 1 ? 'rating' : 'ratings' } : null);

  return (
    <Card
      as="article"
      padding="none"
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      aria-current={selected ? 'true' : undefined}
    >
      <div ref={ref}>
        <button type="button" className={styles.cardMain} onClick={() => onSelect(org.id)} aria-label={`Show ${org.name} on the map`}>
          <span className={styles.cardTop}>
            <span className={`${styles.facilityIcon} ${org.isPartner ? '' : styles.facilityIconPublic}`} aria-hidden="true">
              <Building2 size={20} />
            </span>
            <span className={styles.cardText}>
              <span className={styles.cardName}>{org.name}</span>
              <span className={styles.metaRow}>
                <Badge tone={org.isPartner ? 'brand' : 'info'}>{org.isPartner ? 'MediGuide partner' : 'Public facility'}</Badge>
                {org.type && <span className={styles.typeTag}>{org.type}</span>}
              </span>
            </span>
            {typeof org.distanceKm === 'number' && <span className={styles.distance}>{formatDistance(org.distanceKm)}</span>}
          </span>
          <span className={styles.metaRow}>
            {rating ? (
              <span className={styles.rating}>
                <Star size={14} className={styles.starOn} aria-hidden="true" />
                <strong>{Number(rating.value).toFixed(1)}</strong>
                {rating.count > 0 && <span className={styles.muted}>({rating.count} {rating.label})</span>}
              </span>
            ) : (
              org.isPartner && <span className={styles.muted}>No reviews yet</span>
            )}
            {org.address && <span className={styles.address}><MapPin size={14} aria-hidden="true" />{org.address}</span>}
          </span>
          {org.services?.length > 0 && (
            <span className={styles.services}>
              {org.services.slice(0, 4).map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
              {org.services.length > 4 && <Badge tone="neutral">+{org.services.length - 4}</Badge>}
            </span>
          )}
        </button>

        <div className={styles.actions}>
          {org.phone && <Button variant="secondary" size="sm" icon={Phone} href={telHref(org.phone)}>Call</Button>}
          {directions && (
            <Button variant="secondary" size="sm" icon={Navigation} href={directions} target="_blank" rel="noopener noreferrer">
              Directions
            </Button>
          )}
          {org.isPartner && org.allowAppBooking && (
            <Button size="sm" icon={CalendarPlus} onClick={() => onBook?.(org)}>Book</Button>
          )}
          {org.isPartner && (
            <Button
              variant="ghost"
              size="sm"
              iconRight={ChevronDown}
              className={`${styles.reviewToggle} ${showReviews ? styles.reviewToggleOpen : ''}`}
              aria-expanded={showReviews}
              aria-controls={reviewsId}
              onClick={() => setShowReviews((v) => !v)}
            >
              Reviews
            </Button>
          )}
        </div>

        {org.isPartner && showReviews && (
          <div id={reviewsId} className={styles.reviewsWrap}>
            {canReview
              ? <ReviewSection org={org} onUpdated={onUpdated} />
              : <p className={styles.muted}>Sign in as a patient to read and post reviews.</p>}
          </div>
        )}
      </div>
    </Card>
  );
});

function LoadingState() {
  return (
    <div className={styles.wrapper} aria-busy="true" aria-label="Loading nearby facilities">
      <Skeleton height={44} radius="var(--r-md)" />
      <Skeleton height={300} radius="var(--r-lg)" className={styles.skMap} />
      {[0, 1, 2].map((i) => <Skeleton key={i} height={112} radius="var(--r-lg)" />)}
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
        setError(friendly(err, "Couldn't load nearby facilities."));
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

  if (status === 'loading') return <LoadingState />;

  return (
    <section className={styles.wrapper} aria-label="Nearby healthcare facilities">
      {locating && (
        <Alert tone="info" icon={LocateFixed}>Finding your location…</Alert>
      )}
      {!locating && loc.isDefault && (
        <Alert
          tone="warning"
          icon={LocateFixed}
          title="Using a default location"
          action={<Button variant="secondary" size="sm" onClick={retryLocation}>Retry</Button>}
        >
          Turn on location for accurate distances.
        </Alert>
      )}

      {status === 'error' ? (
        <Card padding="none"><ErrorState message={error} onRetry={retryFetch} /></Card>
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
            <div className={styles.legend} aria-hidden="true">
              <span><i className={styles.dotPartner} /> Partner</span>
              <span><i className={styles.dotPublic} /> Public</span>
            </div>
          </div>

          <div className={styles.toolbar}>
            <Segmented label="Filter facilities" options={FILTERS} value={filter} onChange={changeFilter} className={styles.filter} />
            <span className={styles.count} aria-live="polite">{filtered.length} {filtered.length === 1 ? 'facility' : 'facilities'}</span>
          </div>

          {filtered.length === 0 ? (
            <Card padding="none">
              <EmptyState
                compact
                icon={MapPin}
                title={orgs.length === 0 ? 'No facilities found nearby' : 'No facilities match this filter'}
                action={orgs.length > 0 ? <Button variant="secondary" size="sm" onClick={() => changeFilter('all')}>Show all</Button> : null}
              />
            </Card>
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
                <Button variant="secondary" block onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more ({filtered.length - visible})
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default HospitalMap;
