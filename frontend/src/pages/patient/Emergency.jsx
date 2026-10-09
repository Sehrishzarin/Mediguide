import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, PhoneCall, Share2, Navigation, Hospital, UserPlus, LocateFixed, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchNearbyOrganizations } from '../../services/api';
import { PageHeader, Card, List, ListItem, Alert, Button, SectionHeader, Skeleton, ErrorState, EmptyState } from '../../components/ui';
import { DEFAULT_LOCATION, getPosition, mapsDirectionsUrl, formatDistance } from '../../components/geo';
import { friendlyError } from './care/errors';
import styles from './Emergency.module.css';

const STEPS = [
  'Stay calm and tell the operator exactly where you are.',
  'Keep the line open and follow their instructions.',
  'Do not move someone with a possible head, neck or back injury unless they are in danger.',
  'Press firmly on heavy bleeding with a clean cloth.',
  'Unlock the door and ask someone to guide the ambulance in.'
];

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

const listOrNone = (items) => (items && items.length > 0 ? items.join(', ') : null);

function InfoRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || <span className={styles.notSet}>Not added</span>}</dd>
    </div>
  );
}

function Emergency() {
  const { user } = useAuth();
  const profile = user?.medicalProfile || {};
  const contact = profile.emergencyContact;
  const hasContact = Boolean(contact?.phone);

  const [state, setState] = useState({ status: 'loading', hospitals: [], isDefault: false, error: '' });
  const [nonce, setNonce] = useState(0);
  const [share, setShare] = useState({ busy: false, tone: '', text: '' });

  useEffect(() => {
    let cancelled = false;
    getPosition()
      .then((p) => ({ ...p, isDefault: false }))
      .catch(() => ({ ...DEFAULT_LOCATION, isDefault: true }))
      .then(async (pos) => {
        if (cancelled) return;
        try {
          const res = await fetchNearbyOrganizations(pos.lat, pos.lng, 3);
          if (!cancelled) setState({ status: 'ready', hospitals: (res.data || []).slice(0, 3), isDefault: pos.isDefault, error: '' });
        } catch (err) {
          if (!cancelled) setState({ status: 'error', hospitals: [], isDefault: pos.isDefault, error: friendlyError(err, "Couldn't load nearby hospitals.") });
        }
      });
    return () => { cancelled = true; };
  }, [nonce]);

  const retry = () => { setState((s) => ({ ...s, status: 'loading' })); setNonce((n) => n + 1); };

  const shareLocation = async () => {
    setShare({ busy: true, tone: '', text: '' });
    let text;
    let url;
    try {
      const { lat, lng } = await getPosition();
      url = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
      text = `I need help. My location: ${url}`;
    } catch {
      setShare({ busy: false, tone: 'danger', text: "Couldn't get your location. Check that location is turned on and allowed, then try again." });
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My location', text, url });
        setShare({ busy: false, tone: 'success', text: 'Location shared.' });
        return;
      }
      throw new Error('share-unavailable');
    } catch (err) {
      if (err?.name === 'AbortError') { setShare({ busy: false, tone: '', text: '' }); return; }
      try {
        await navigator.clipboard.writeText(text);
        setShare({ busy: false, tone: 'success', text: 'Location link copied. Paste it into a message to send it.' });
      } catch {
        setShare({ busy: false, tone: 'warning', text: `Copy this link and send it: ${url}` });
      }
    }
  };

  const { status, hospitals, isDefault, error } = state;

  return (
    <div className={styles.page}>
      <PageHeader title="Emergency" subtitle="MediGuide cannot send an ambulance. In an emergency, call 1122 now." />

      <a href="tel:1122" className={styles.callBtn}>
        <span className={styles.callIcon} aria-hidden="true"><Phone size={26} /></span>
        <span className={styles.callText}>
          <strong>Call 1122</strong>
          <small>Rescue and ambulance, free of charge</small>
        </span>
      </a>

      <div className={styles.actions}>
        {hasContact ? (
          <List>
            <ListItem
              href={telHref(contact.phone)}
              icon={PhoneCall}
              title={`Call ${contact.name || 'my emergency contact'}`}
              subtitle={`${contact.relationship ? `${contact.relationship} · ` : ''}${contact.phone}`}
            />
          </List>
        ) : (
          <Alert
            tone="warning"
            icon={UserPlus}
            title="No emergency contact"
            action={<Button variant="secondary" size="sm" to="/patient/profile">Add</Button>}
          >
            Add someone we can help you call quickly.
          </Alert>
        )}

        <List>
          <ListItem
            onClick={shareLocation}
            disabled={share.busy}
            icon={Share2}
            title={share.busy ? 'Getting your location…' : 'Share my location'}
            subtitle="Send a map link to someone who can help"
            chevron={false}
          />
        </List>
      </div>
      {share.text && (
        <Alert tone={share.tone || 'info'} icon={share.tone === 'success' ? CheckCircle2 : AlertCircle}>{share.text}</Alert>
      )}

      <div className={styles.grid}>
        <div className={styles.col}>
          <section aria-labelledby="hosp-h">
            <SectionHeader title={<span id="hosp-h">Nearest hospitals</span>} />
            {isDefault && status !== 'loading' && (
              <p className={styles.hint}><LocateFixed size={14} aria-hidden="true" /> Using a default location. Turn on location for accurate distances.</p>
            )}
            {status === 'loading' && (
              <List>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={styles.skRow} aria-hidden="true">
                    <Skeleton width={40} height={40} radius="var(--r-md)" />
                    <div className={styles.grow}><Skeleton width="55%" height={14} /><Skeleton width="35%" height={12} className={styles.mt2} /></div>
                  </div>
                ))}
              </List>
            )}
            {status === 'error' && <Card padding="none"><ErrorState compact message={error} onRetry={retry} /></Card>}
            {status === 'ready' && hospitals.length === 0 && (
              <Card padding="none"><EmptyState compact icon={Hospital} title="No hospitals found nearby" text="Call 1122 and they will direct you." /></Card>
            )}
            {status === 'ready' && hospitals.length > 0 && (
              <List>
                {hospitals.map((h) => {
                  const directions = mapsDirectionsUrl(h);
                  return (
                    <ListItem
                      key={h.id}
                      icon={Hospital}
                      iconTone="neutral"
                      title={h.name}
                      subtitle={[formatDistance(h.distanceKm), h.address].filter(Boolean).join(' · ')}
                      meta={
                        <span className={styles.rowActions}>
                          {h.phone && (
                            <Button variant="secondary" icon={Phone} href={telHref(h.phone)} className={styles.squareBtn} aria-label={`Call ${h.name}`} title="Call" />
                          )}
                          {directions && (
                            <Button
                              variant="secondary"
                              icon={Navigation}
                              href={directions}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.squareBtn}
                              aria-label={`Directions to ${h.name}`}
                              title="Directions"
                            />
                          )}
                        </span>
                      }
                    />
                  );
                })}
              </List>
            )}
          </section>

          <section aria-labelledby="wait-h">
            <SectionHeader title={<span id="wait-h">While you wait</span>} />
            <Card padding="md">
              <ol className={styles.steps}>
                {STEPS.map((t, i) => (
                  <li key={t}>
                    <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        </div>

        <section aria-labelledby="med-h" className={styles.col}>
          <SectionHeader
            title={<span id="med-h">Medical info for responders</span>}
            action={<Link to="/patient/profile" className={styles.textLink}>Edit</Link>}
          />
          <Card padding="md">
            <dl className={styles.medList}>
              <InfoRow label="Name" value={user?.name} />
              <InfoRow label="Blood group" value={profile.bloodGroup} />
              <InfoRow label="Allergies" value={listOrNone(profile.allergies)} />
              <InfoRow label="Conditions" value={listOrNone(profile.preExistingConditions)} />
              <InfoRow label="Medications" value={listOrNone(profile.currentMedications)} />
            </dl>
          </Card>
        </section>
      </div>
    </div>
  );
}

export default Emergency;
