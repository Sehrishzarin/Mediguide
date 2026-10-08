import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchNearbyOrganizations } from '../../services/api';
import { DEFAULT_LOCATION, getPosition, mapsDirectionsUrl, formatDistance } from '../../components/geo';
import styles from './Emergency.module.css';

const TIPS = [
  'Stay calm and tell the 1122 operator exactly where you are.',
  'Keep the phone line open and follow the operator\'s instructions.',
  'Do not move a person with a suspected head, neck or back injury unless they are in immediate danger.',
  'Apply firm, direct pressure to heavy bleeding with a clean cloth.',
  'Unlock the door and ask someone to wait outside to guide the ambulance.',
  'Keep their allergy and medication details ready for the responders.'
];

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

const ListOrNone = ({ items }) =>
  items && items.length > 0 ? items.join(', ') : <span className={styles.notSet}>Not set</span>;

function Emergency() {
  const { user } = useAuth();
  const contact = user?.medicalProfile?.emergencyContact;
  const profile = user?.medicalProfile || {};
  const hasContact = Boolean(contact?.phone);

  const [position, setPosition] = useState(null); // { lat, lng, isDefault }
  const [hospitals, setHospitals] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const [shareMsg, setShareMsg] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPosition()
      .then((p) => ({ ...p, isDefault: false }))
      .catch(() => ({ ...DEFAULT_LOCATION, isDefault: true }))
      .then(async (pos) => {
        if (cancelled) return;
        setPosition(pos);
        try {
          const res = await fetchNearbyOrganizations(pos.lat, pos.lng, 3);
          if (cancelled) return;
          setHospitals((res.data || []).slice(0, 3));
          setStatus('ready');
        } catch (err) {
          if (cancelled) return;
          setError(err.message);
          setStatus('error');
        }
      });
    return () => { cancelled = true; };
  }, [nonce]);

  const retry = () => { setStatus('loading'); setNonce((n) => n + 1); };

  const shareLocation = async () => {
    setSharing(true);
    setShareMsg('');
    try {
      const { lat, lng } = await getPosition();
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      const text = `I need help. My location: ${url}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'My location', text, url });
          setShareMsg('Location shared.');
        } catch (err) {
          if (err?.name !== 'AbortError') throw err;
        }
      } else {
        await navigator.clipboard.writeText(text);
        setShareMsg('Location link copied. Paste it into a message to send it.');
      }
    } catch {
      setShareMsg('Could not get or share your location. Check location permission and try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={styles.container}>
      <header>
        <h1 className={styles.title}>Emergency help</h1>
        <p className={styles.subtitle}>MediGuide cannot dispatch an ambulance. Call 1122 directly.</p>
      </header>

      <a href="tel:1122" className={styles.callBtn}>
        <span className={styles.callIcon} aria-hidden="true">☎</span>
        <span>
          <strong>Call 1122</strong>
          <small>Rescue / ambulance, free of charge</small>
        </span>
      </a>

      <div className={styles.twoCol}>
        {hasContact ? (
          <a href={telHref(contact.phone)} className={styles.secondaryBtn}>
            <strong>Call my emergency contact</strong>
            <span>{contact.name || 'Emergency contact'}{contact.relationship ? ` (${contact.relationship})` : ''} · {contact.phone}</span>
          </a>
        ) : (
          <Link to="/patient/profile" className={styles.secondaryBtn}>
            <strong>Add an emergency contact</strong>
            <span>No contact saved yet. Add one in your medical profile.</span>
          </Link>
        )}

        <button type="button" className={styles.secondaryBtn} onClick={shareLocation} disabled={sharing}>
          <strong>{sharing ? 'Getting location…' : 'Share my location'}</strong>
          <span>Send a map link to someone who can help</span>
        </button>
      </div>
      {shareMsg && <p className={styles.shareMsg} role="status">{shareMsg}</p>}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="hosp-h">
          <h2 id="hosp-h" className={styles.cardTitle}>Nearest hospitals</h2>
          {position?.isDefault && (
            <p className={styles.warn}>Using a default location (Islamabad). Enable location for accurate distances.</p>
          )}
          {status === 'loading' && (
            <div aria-busy="true" aria-label="Finding hospitals">
              {[0, 1, 2].map((i) => <div key={i} className={`skeleton-box ${styles.sk}`} />)}
            </div>
          )}
          {status === 'error' && (
            <div role="alert" className={styles.stateBox}>
              <p>{error || 'Could not load nearby hospitals.'}</p>
              <button type="button" className={styles.btnPrimary} onClick={retry}>Try again</button>
            </div>
          )}
          {status === 'ready' && hospitals.length === 0 && <p className={styles.notSet}>No facilities found nearby.</p>}
          {status === 'ready' && hospitals.map((h) => {
            const directions = mapsDirectionsUrl(h);
            return (
              <div key={h.id} className={styles.hospital}>
                <div className={styles.hospitalInfo}>
                  <strong>{h.name}</strong>
                  <span className={styles.hospitalMeta}>
                    {formatDistance(h.distanceKm)}{h.address ? ` · ${h.address}` : ''}
                  </span>
                </div>
                <div className={styles.hospitalActions}>
                  {h.phone && <a href={telHref(h.phone)} className={styles.btnOutline}>Call</a>}
                  {directions && <a href={directions} target="_blank" rel="noopener noreferrer" className={styles.btnOutline}>Directions</a>}
                </div>
              </div>
            );
          })}
        </section>

        <section className={styles.card} aria-labelledby="med-h">
          <h2 id="med-h" className={styles.cardTitle}>My medical info</h2>
          <p className={styles.hint}>Show this to first responders.</p>
          <dl className={styles.medList}>
            <div><dt>Name</dt><dd>{user?.name}</dd></div>
            <div><dt>Blood group</dt><dd>{profile.bloodGroup || <span className={styles.notSet}>Not set</span>}</dd></div>
            <div><dt>Allergies</dt><dd><ListOrNone items={profile.allergies} /></dd></div>
            <div><dt>Conditions</dt><dd><ListOrNone items={profile.preExistingConditions} /></dd></div>
            <div><dt>Medications</dt><dd><ListOrNone items={profile.currentMedications} /></dd></div>
          </dl>
          <Link to="/patient/profile" className={styles.inlineLink}>Edit medical profile &rarr;</Link>
        </section>
      </div>

      <section className={styles.card} aria-labelledby="tips-h">
        <h2 id="tips-h" className={styles.cardTitle}>While you wait for help</h2>
        <ul className={styles.tips}>
          {TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
    </div>
  );
}

export default Emergency;
