import { useState, useEffect, useRef } from 'react';
import { usePatient } from './PatientContext';
import Spinner from '../../components/Spinner';
import ErrorToast from '../../components/ErrorToast';
import * as api from '../../services/api';
import styles from './PatientProfile.module.css';

function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const addTag = () => { const val = input.trim(); if (val && !tags.includes(val)) onChange([...tags, val]); setInput(''); };
  const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));

  return (
    <div className={styles.tagContainer}>
      <div className={styles.tagList}>
        {tags.map((tag, idx) => (
          <span key={idx} className={styles.tag}>
            {tag}
            <button type="button" onClick={() => removeTag(idx)} className={styles.tagRemove}>
              <svg className={styles.tagRemoveSvg} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <input
        type="text" value={input} onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } if (e.key === 'Backspace' && !input && tags.length) removeTag(tags.length - 1); }}
        onBlur={addTag} placeholder={tags.length === 0 ? placeholder : 'Add more...'} className={styles.tagInput}
      />
    </div>
  );
}

function PatientProfile() {
  const { user } = usePatient();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [medications, setMedications] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [notes, setNotes] = useState('');
  const [reports, setReports] = useState([]);
  const [info, setInfo] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { profile, reports: reps } = await api.getProfile();
        setInfo(profile); setMedications(profile.ongoingMedications || []);
        setConditions(profile.pastConditions || []); setNotes(profile.overallNotes || ''); setReports(reps || []);
      } catch (err) { setToast(err.message || 'Failed to load profile.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { const { profile } = await api.updateProfile({ ongoingMedications: medications, pastConditions: conditions, overallNotes: notes }); setInfo(profile); setToast(''); }
    catch (err) { setToast(err.message || 'Failed to save profile.'); }
    finally { setSaving(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const { report } = await api.uploadTestReport(file); setReports((prev) => [...prev, report]); }
    catch (err) { setToast(err.message || 'Upload failed.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <Spinner size="lg" />
        <p className={styles.loadingText}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {toast && <ErrorToast message={toast} onClose={() => setToast('')} />}
      <h1 className={styles.heading}>My Profile</h1>

      <div className={styles.card}>
        <div className={styles.profileRow}>
          <div className={styles.avatarWrap}>
            <svg className={styles.avatarSvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div>
            <p className={styles.profileName}>{user?.name || info.name || 'Guest'}</p>
            <p className={styles.profileEmail}>{user?.email || info.email}</p>
          </div>
        </div>
        <div className={styles.infoGrid}>
          {[{ label: 'Phone', value: info.phone }, { label: 'Date of birth', value: info.dob }, { label: 'Blood type', value: info.bloodType }, { label: 'Address', value: info.address }].map((row) => (
            <div key={row.label}>
              <span className={styles.infoLabel}>{row.label}</span>
              <span className={styles.infoValue}>{row.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Medical Information</h2>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Ongoing Medications</label>
          <TagInput tags={medications} onChange={setMedications} placeholder="e.g. Metformin 500mg" />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Past Conditions</label>
          <TagInput tags={conditions} onChange={setConditions} placeholder="e.g. Appendicitis (2019)" />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Overall Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Allergies, preferences, or anything the doctor should know..." className={styles.textarea} />
        </div>
        <button onClick={handleSave} disabled={saving} className={styles.primaryBtn}>
          {saving && <Spinner size="sm" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.reportHeader}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Test Reports</h2>
          <label className={styles.uploadLabel}>
            <svg className={styles.uploadSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload'}
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleUpload} className={styles.hiddenInput} disabled={uploading} />
          </label>
        </div>
        {reports.length === 0 ? (
          <p className={styles.emptyReports}>No reports uploaded yet.</p>
        ) : (
          <ul className={styles.reportList}>
            {reports.map((report) => (
              <li key={report.id} className={styles.reportItem}>
                <div className={styles.reportInfo}>
                  <svg className={styles.reportFileSvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <div>
                    <p className={styles.reportFilename}>{report.filename}</p>
                    <p className={styles.reportDate}>{report.uploadedAt ? new Date(report.uploadedAt).toLocaleDateString() : ''}</p>
                  </div>
                </div>
                <button onClick={() => setToast(`Preview of "${report.filename}" — not implemented in demo`)} className={styles.reportViewBtn}>View</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PatientProfile;
