import { useState, useEffect, useRef } from 'react';
import { usePatient } from './PatientContext';
import Spinner from '../../components/Spinner';
import ErrorToast from '../../components/ErrorToast';
import * as api from '../../services/api';
import styles from './PatientProfile.module.css';

function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput('');
  };
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
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : 'Add more...'}
        className={styles.tagInput}
      />
    </div>
  );
}

function PatientProfile() {
  const { user, login } = usePatient();
  const fileRef = useRef(null);
  const editFileRef = useRef(null);
  const editingIdRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toast, setToast] = useState('');
  const [reportActionId, setReportActionId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Personal Info Fields (Editable)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');

  // Medical Profile Fields (Editable)
  const [bloodType, setBloodType] = useState('');
  const [gender, setGender] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState('N/A');
  const [medications, setMedications] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [notes, setNotes] = useState('');
  const [emergencyContact, setEmergencyContact] = useState({ name: '', relationship: '', phone: '' });

  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);

  const initials = (name || user?.name || 'PU')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const emailDisplay = user?.email || 'patient@mediguide.com';

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        let currentData = user;

        if (token) {
          try {
            const meRes = await api.getCurrentUserProfile(token);
            if (meRes.success && meRes.data) {
              currentData = meRes.data;
            }
          } catch (e) {
            console.warn('API get me fallback:', e);
          }
        }

        const med = currentData?.medicalProfile || {};
        setName(currentData?.name || '');
        setPhone(currentData?.phone || '');
        setAddress(currentData?.address || '');
        setDob(med.dateOfBirth || currentData?.dob || '');
        setBloodType(med.bloodGroup || currentData?.bloodType || '');
        setGender(med.gender || '');
        setPregnancyStatus(med.pregnancyStatus || 'N/A');
        setMedications(med.currentMedications?.map(m => typeof m === 'string' ? m : m.name) || currentData?.ongoingMedications || []);
        setConditions(med.preExistingConditions || currentData?.pastConditions || []);
        setAllergies(med.allergies || []);
        setNotes(currentData?.overallNotes || '');
        setEmergencyContact(med.emergencyContact || { name: '', relationship: '', phone: '' });

        const { reports: reps } = await api.getProfile();
        setReports(reps || []);
      } catch (err) {
        setToast(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setToast('');

    const token = localStorage.getItem('token');

    const formattedMedications = medications.map(m => typeof m === 'string' ? { name: m, dosage: '', frequency: '' } : m);

    const updatePayload = {
      name,
      phone,
      address,
      medicalProfile: {
        bloodGroup: bloodType,
        gender,
        pregnancyStatus,
        dateOfBirth: dob,
        allergies,
        preExistingConditions: conditions,
        currentMedications: formattedMedications,
        emergencyContact
      },
      ongoingMedications: medications,
      pastConditions: conditions,
      overallNotes: notes
    };

    try {
      if (token) {
        await api.updateUserProfile(token, updatePayload);
      }
      await api.updateProfile(updatePayload);

      // Update patient context
      const updatedUser = {
        ...user,
        name,
        phone,
        address,
        medicalProfile: updatePayload.medicalProfile
      };
      login(updatedUser);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setToast(err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { report } = await api.uploadTestReport(file);
      setReports((prev) => [...prev, report]);
    } catch (err) {
      setToast(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteReport = async (reportId) => {
    setReportActionId(reportId);
    try {
      await api.deleteTestReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setConfirmDeleteId(null);
    } catch (err) {
      setToast(err.message || 'Failed to delete report.');
    } finally {
      setReportActionId(null);
    }
  };

  const handleEditReport = async (reportId, file) => {
    setReportActionId(reportId);
    try {
      const { report: updated } = await api.renameTestReport(reportId, file);
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
    } catch (err) {
      setToast(err.message || 'Failed to update report.');
    } finally {
      setReportActionId(null);
      if (editFileRef.current) editFileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <Spinner size="lg" />
        <p className={styles.loadingText}>Loading your medical profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {toast && <ErrorToast message={toast} onClose={() => setToast('')} />}
      {saveSuccess && (
        <div className={styles.saveBanner}>
          ✓ Profile and medical records updated successfully!
        </div>
      )}

      {/* Profile Header Banner */}
      <div className={styles.profileBanner}>
        <div className={styles.bannerAvatar}>
          <span className={styles.bannerInitials}>{initials}</span>
        </div>
        <div className={styles.bannerInfo}>
          <h1 className={styles.bannerName}>{name || user?.name || 'Patient User'}</h1>
          <p className={styles.bannerEmail}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            {emailDisplay} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>(Account Email)</span>
          </p>
        </div>
        <button
          type="button"
          className={styles.bannerEditBtn}
          onClick={() => document.querySelector('[data-name-input]')?.focus()}
          aria-label="Edit profile"
        >
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>

      {/* ── Personal Info Card ── */}
      <div className={`${styles.card} ${styles.accentTeal}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIconWrap} ${styles.iconWrapTeal}`}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 className={styles.cardTitle}>Personal Info</h2>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className={styles.input} data-name-input />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-0199" className={styles.input} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={styles.input} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Blood Group</label>
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={styles.input}>
              <option value="">Select Blood Group</option>
              <option value="A+">A Positive (A+)</option>
              <option value="A-">A Negative (A-)</option>
              <option value="B+">B Positive (B+)</option>
              <option value="B-">B Negative (B-)</option>
              <option value="AB+">AB Positive (AB+)</option>
              <option value="AB-">AB Negative (AB-)</option>
              <option value="O+">O Positive (O+)</option>
              <option value="O-">O Negative (O-)</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={styles.input}>
              <option value="">Select Gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className={styles.fieldGroup} style={{ marginTop: '12px' }}>
          <label className={styles.fieldLabel}>Pregnancy / Nursing Status</label>
          <select value={pregnancyStatus} onChange={(e) => setPregnancyStatus(e.target.value)} className={styles.input}>
            <option value="N/A">Not Applicable / N/A</option>
            <option value="Not Pregnant">Not Pregnant</option>
            <option value="Pregnant (1st Trimester)">Pregnant (1st Trimester)</option>
            <option value="Pregnant (2nd Trimester)">Pregnant (2nd Trimester)</option>
            <option value="Pregnant (3rd Trimester)">Pregnant (3rd Trimester)</option>
            <option value="Breastfeeding">Breastfeeding / Nursing</option>
          </select>
        </div>

        <div className={styles.fieldGroup} style={{ marginTop: '12px' }}>
          <label className={styles.fieldLabel}>Home Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" className={styles.input} />
        </div>

        <div className={styles.fieldGroup} style={{ marginTop: '12px' }}>
          <label className={styles.fieldLabel}>Emergency Contact</label>
          <div className={styles.emergencyGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <input type="text" placeholder="Name" value={emergencyContact.name || ''} onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })} className={styles.input} />
            <input type="text" placeholder="Relationship" value={emergencyContact.relationship || ''} onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })} className={styles.input} />
            <input type="tel" placeholder="Phone" value={emergencyContact.phone || ''} onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })} className={styles.input} />
          </div>
        </div>
      </div>

      {/* ── Ongoing Medication Card ── */}
      <div className={`${styles.card} ${styles.accentEmerald}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIconWrap} ${styles.iconWrapEmerald}`}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <h2 className={styles.cardTitle}>Ongoing Medication</h2>
        </div>
        <TagInput tags={medications} onChange={setMedications} placeholder="e.g. Metformin 500mg, Lisinopril 10mg" />
      </div>

      {/* ── Past Conditions Card ── */}
      <div className={`${styles.card} ${styles.accentAmber}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIconWrap} ${styles.iconWrapAmber}`}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h2 className={styles.cardTitle}>Past Conditions</h2>
        </div>
        <TagInput tags={conditions} onChange={setConditions} placeholder="e.g. Asthma, Diabetes, Past Appendectomy" />

        <div className={styles.fieldGroup} style={{ marginTop: '1rem' }}>
          <label className={styles.fieldLabel}>Known Allergies & Drug Sensitivities</label>
          <TagInput tags={allergies} onChange={setAllergies} placeholder="e.g. Penicillin, Peanuts, Latex" />
        </div>
      </div>

      {/* ── Notes Card ── */}
      <div className={`${styles.card} ${styles.accentViolet} ${styles.fullWidth}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIconWrap} ${styles.iconWrapViolet}`}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </div>
          <h2 className={styles.cardTitle}>Notes</h2>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Overall Health Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional medical notes for AI triage evaluation..." className={styles.textarea} />
        </div>
        <button onClick={handleSave} disabled={saving} className={styles.primaryBtn}>
          {saving && <Spinner size="sm" />}
          {saving ? 'Saving Profile...' : 'Save Profile & Health History'}
        </button>
      </div>

      {/* ── Test Reports Card ── */}
      <div className={`${styles.card} ${styles.accentSky} ${styles.fullWidth}`}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIconWrap} ${styles.iconWrapSky}`}>
            <svg className={styles.cardIcon} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h2 className={styles.cardTitle}>Test Reports</h2>
        </div>

        <label className={styles.uploadZone}>
          <svg className={styles.uploadZoneIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span className={styles.uploadZoneText}>{uploading ? 'Uploading...' : 'Click to upload a report'}</span>
          <span className={styles.uploadZoneHint}>PDF, PNG, JPG, DOC up to 10MB</span>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleUpload} className={styles.hiddenInput} disabled={uploading} />
          <input ref={editFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className={styles.hiddenInput} onChange={(e) => { const f = e.target.files?.[0]; if (f && editingIdRef.current) handleEditReport(editingIdRef.current, f); }} />
        </label>

        {reports.length === 0 ? (
          <p className={styles.emptyReports}>No medical reports uploaded yet.</p>
        ) : (
          <ul className={styles.reportList}>
            {reports.map((report) => (
              <li key={report.id} className={styles.reportItem}>
                <div className={styles.reportInfo}>
                  <svg className={styles.reportFileIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <div>
                    <p className={styles.reportFilename}>{report.filename}</p>
                    <p className={styles.reportDate}>{report.uploadedAt ? new Date(report.uploadedAt).toLocaleDateString() : ''}</p>
                  </div>
                </div>
                <div className={styles.reportActions}>
                  {reportActionId === report.id ? (
                    <Spinner size="sm" />
                  ) : confirmDeleteId === report.id ? (
                    <div className={styles.confirmDelete}>
                      <span className={styles.confirmText}>Delete?</span>
                      <button type="button" className={styles.confirmYes} onClick={() => handleDeleteReport(report.id)}>Yes</button>
                      <button type="button" className={styles.confirmNo} onClick={() => setConfirmDeleteId(null)}>No</button>
                    </div>
                  ) : (
                    <>
                      <button type="button" className={styles.reportViewBtn} onClick={() => setToast(`Preview of "${report.filename}" loaded`)}>View</button>
                      <button type="button" className={styles.reportEditBtn} aria-label="Replace file" onClick={() => { editingIdRef.current = report.id; setReportActionId(report.id); editFileRef.current?.click(); }}>Edit</button>
                      <button type="button" className={styles.reportDeleteBtn} aria-label="Delete report" onClick={() => setConfirmDeleteId(report.id)}>Delete</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PatientProfile;
