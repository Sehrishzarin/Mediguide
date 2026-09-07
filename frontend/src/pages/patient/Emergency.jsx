import { useState } from 'react';
import * as api from '../../services/api';
import styles from './Emergency.module.css';

function Emergency() {
  const [ambulanceLoading, setAmbulanceLoading] = useState(false);
  const [eta, setEta] = useState(null);
  const [ambulanceError, setAmbulanceError] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contact, setContact] = useState(null);
  const [hotline, setHotline] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSaved, setContactSaved] = useState(false);

  const handleAmbulance = async () => {
    setAmbulanceLoading(true); setAmbulanceError('');
    try { const result = await api.requestAmbulance(); setEta(result.eta); }
    catch (err) { setAmbulanceError(err.message || 'Failed to request ambulance.'); }
    finally { setAmbulanceLoading(false); }
  };

  const handleGetContact = async () => {
    setContactLoading(true); setContactError('');
    try {
      const result = await api.getEmergencyContact();
      setHotline(result.hotline);
      if (result.contact) setContact(result.contact);
      else setShowContactForm(true);
    } catch (err) { setContactError(err.message || 'Failed to load emergency contact.'); }
    finally { setContactLoading(false); }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactNumber.trim()) return;
    setSavingContact(true); setContactError('');
    try { const { contact: saved } = await api.updateEmergencyContact(contactNumber.trim()); setContact(saved); setShowContactForm(false); setContactSaved(true); }
    catch (err) { setContactError(err.message || 'Failed to save contact.'); }
    finally { setSavingContact(false); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.emergencyHeader}>
        <div className={styles.headerCircle}>
          <svg className={styles.headerSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className={styles.headerTitle}>Emergency Services</h1>
        <p className={styles.headerSubtext}>Direct connection to Rescue 1122 & emergency responders</p>
      </div>

      {/* Rescue 1122 Direct Hotline Card */}
      <div style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.1)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#991B1B', marginBottom: '0.25rem' }}>
          🚨 Rescue 1122 Emergency Hotline
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#B91C1C', marginBottom: '1rem' }}>
          Instant direct call to Rescue 1122 emergency ambulance & medical response unit in Pakistan.
        </p>
        <a href="tel:1122" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', background: '#DC2626', color: '#ffffff', fontWeight: '800', fontSize: '1rem', padding: '0.875rem', borderRadius: '999px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)' }}>
          📞 Call Rescue 1122 Now
        </a>
      </div>

      <div className={styles.ambulanceCard}>
        <h2 className={styles.sectionHeading}>
          <svg className={styles.sectionHeadingSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          Ambulance
        </h2>
        <p className={styles.sectionDesc}>Request an ambulance to your current location.</p>
        <button onClick={handleAmbulance} disabled={ambulanceLoading || eta !== null} className={styles.btnDanger}>
          {ambulanceLoading ? (
            <>
              <svg className={styles.spinSvg} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Requesting...
            </>
          ) : eta !== null ? 'Ambulance Requested' : (
            <>
              <svg className={styles.btnSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              Request Ambulance
            </>
          )}
        </button>
        {ambulanceError && <p className={styles.errorText}>{ambulanceError}</p>}
      </div>

      {eta !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalSuccessCircle}>
              <svg className={styles.modalSuccessSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className={styles.modalTitle}>Ambulance Requested</h2>
            <p className={styles.modalSubtext}>Arriving in approximately</p>
            <p className={styles.modalEta}>~{eta} <span className={styles.modalEtaUnit}>mins</span></p>
            <p className={styles.modalNote}>Stay on the line and keep your location accessible. Help is on the way.</p>
            <button onClick={() => setEta(null)} className={styles.modalCloseBtn}>Close</button>
          </div>
        </div>
      )}

      <div className={styles.contactCard}>
        <h2 className={styles.sectionHeading}>
          <svg className={styles.sectionHeadingSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          Emergency Contact
        </h2>

        {contact && !showContactForm && (
          <div className={styles.savedContact}>
            <div className={styles.savedBadge}>
              <p className={styles.savedLabel}>Saved contact</p>
              <p className={styles.savedNumber}>{contact.number}</p>
            </div>
            <a href={`tel:${contact.number}`} className={styles.callBtn}>Call {contact.number}</a>
            {contactSaved && <p className={styles.savedMsg}>Contact saved successfully.</p>}
          </div>
        )}

        {!contact && !showContactForm && !contactLoading && (
          <button onClick={handleGetContact} className={styles.btnDangerOutline}>Contact Saved Emergency Contact</button>
        )}

        {contactLoading && (
          <div className={styles.loadingRow}>
            <svg style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading contact...
          </div>
        )}

        {showContactForm && (
          <div className={styles.contactForm}>
            <p className={styles.contactFormText}>No saved emergency contact found. Add one now:</p>
            <form onSubmit={handleSaveContact} className={styles.contactFormFields}>
              <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g. +1-555-0123" className={styles.input} autoFocus />
              <button type="submit" disabled={savingContact || !contactNumber.trim()} className={styles.btnDangerSm}>
                {savingContact ? 'Saving...' : 'Save & Call'}
              </button>
            </form>
          </div>
        )}

        {contactError && <p className={styles.contactError}>{contactError}</p>}

        {hotline && (
          <div className={styles.hotlineSection}>
            <p className={styles.hotlineLabel}>Or call the MediGuide 24/7 hotline:</p>
            <a href={`tel:${hotline.number}`} className={styles.hotlineLink}>{hotline.number}</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default Emergency;
