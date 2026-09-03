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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toast, setToast] = useState('');

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
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px 16px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', textAlign: 'center', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
          ✓ Profile and medical records updated successfully!
        </div>
      )}

      <h1 className={styles.heading}>Patient Profile & Health Records</h1>

      {/* Personal Identity Card */}
      <div className={styles.card}>
        <div className={styles.profileRow}>
          <div className={styles.avatarWrap}>
            <svg className={styles.avatarSvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p className={styles.profileName}>{name || user?.name || 'Patient User'}</p>
            <p className={styles.profileEmail} style={{ color: '#0d9488', fontWeight: '600' }}>🔒 {user?.email || 'patient@mediguide.com'} (Fixed)</p>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className={styles.input} />
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
      </div>

      {/* Clinical Medical Information Card */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Medical Context & History</h2>
        
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Active Prescription Medications</label>
          <TagInput tags={medications} onChange={setMedications} placeholder="e.g. Metformin 500mg, Lisinopril 10mg" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Pre-existing Chronic Conditions & Surgeries</label>
          <TagInput tags={conditions} onChange={setConditions} placeholder="e.g. Asthma, Diabetes, Past Appendectomy" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Known Allergies & Drug Sensitivities</label>
          <TagInput tags={allergies} onChange={setAllergies} placeholder="e.g. Penicillin, Peanuts, Latex" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Emergency Contact</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <input type="text" placeholder="Name" value={emergencyContact.name || ''} onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })} className={styles.input} />
            <input type="text" placeholder="Relationship" value={emergencyContact.relationship || ''} onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })} className={styles.input} />
            <input type="tel" placeholder="Phone" value={emergencyContact.phone || ''} onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })} className={styles.input} />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Overall Health Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional medical notes for AI triage evaluation..." className={styles.textarea} />
        </div>

        <button onClick={handleSave} disabled={saving} className={styles.primaryBtn}>
          {saving && <Spinner size="sm" />}
          {saving ? 'Saving Profile...' : '💾 Save Profile & Health History'}
        </button>
      </div>

      {/* Test Reports Section */}
      <div className={styles.card}>
        <div className={styles.reportHeader}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Medical Test Reports</h2>
          <label className={styles.uploadLabel}>
            <svg className={styles.uploadSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload Report'}
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleUpload} className={styles.hiddenInput} disabled={uploading} />
          </label>
        </div>
        {reports.length === 0 ? (
          <p className={styles.emptyReports}>No medical reports uploaded yet.</p>
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
                <button onClick={() => setToast(`Preview of "${report.filename}" loaded`)} className={styles.reportViewBtn}>View</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PatientProfile;
