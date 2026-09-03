import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function MedicalProfileEditor() {
  const { user, updateProfile, logout } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('biodata'); // 'biodata', 'conditions', 'meds', 'treatments', 'emergency'

  // Bio-Data State
  const [bloodGroup, setBloodGroup] = useState('');
  const [gender, setGender] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState('N/A');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Arrays & Complex Objects
  const [allergies, setAllergies] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');

  const [preExistingConditions, setPreExistingConditions] = useState([]);
  const [newCondition, setNewCondition] = useState('');

  const [currentMedications, setCurrentMedications] = useState([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');

  const [longTermTreatments, setLongTermTreatments] = useState([]);
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');

  const [emergencyContact, setEmergencyContact] = useState({ name: '', relationship: '', phone: '' });

  useEffect(() => {
    if (user?.medicalProfile) {
      const p = user.medicalProfile;
      setBloodGroup(p.bloodGroup || '');
      setGender(p.gender || '');
      setPregnancyStatus(p.pregnancyStatus || 'N/A');
      setDateOfBirth(p.dateOfBirth || '');
      setHeight(p.height || '');
      setWeight(p.weight || '');
      setAllergies(p.allergies || []);
      setPreExistingConditions(p.preExistingConditions || []);
      setCurrentMedications(p.currentMedications || []);
      setLongTermTreatments(p.longTermTreatments || []);
      setEmergencyContact(p.emergencyContact || { name: '', relationship: '', phone: '' });
    }
  }, [user]);

  // Tag Helpers
  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (tag) => {
    setAllergies(allergies.filter(a => a !== tag));
  };

  const handleAddCondition = () => {
    if (newCondition.trim() && !preExistingConditions.includes(newCondition.trim())) {
      setPreExistingConditions([...preExistingConditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const handleRemoveCondition = (tag) => {
    setPreExistingConditions(preExistingConditions.filter(c => c !== tag));
  };

  const handleAddMedication = () => {
    if (medName.trim()) {
      setCurrentMedications([...currentMedications, { name: medName.trim(), dosage: medDosage.trim(), frequency: medFrequency.trim() }]);
      setMedName('');
      setMedDosage('');
      setMedFrequency('');
    }
  };

  const handleRemoveMedication = (index) => {
    setCurrentMedications(currentMedications.filter((_, i) => i !== index));
  };

  const handleAddTreatment = () => {
    if (treatmentName.trim()) {
      setLongTermTreatments([...longTermTreatments, { treatmentName: treatmentName.trim(), notes: treatmentNotes.trim(), isOngoing: true }]);
      setTreatmentName('');
      setTreatmentNotes('');
    }
  };

  const handleRemoveTreatment = (index) => {
    setLongTermTreatments(longTermTreatments.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      medicalProfile: {
        bloodGroup,
        gender,
        pregnancyStatus,
        dateOfBirth,
        height: Number(height) || 0,
        weight: Number(weight) || 0,
        allergies,
        preExistingConditions,
        currentMedications,
        longTermTreatments,
        emergencyContact
      }
    };

    try {
      const res = await updateProfile(payload);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save medical profile', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="medical-profile-editor">
      {/* Header Profile Summary */}
      <div className="profile-header-card">
        <div className="profile-avatar-large">
          {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
        </div>
        <h4>{user?.name || 'Patient'}</h4>
        <p className="user-email-sub">{user?.email}</p>

        {/* Quick Health Vitals Pill Bar */}
        <div className="vitals-pill-bar">
          <div className="vital-item">
            <span className="vital-label">BLOOD</span>
            <strong className="vital-val red">{bloodGroup || 'Not Set'}</strong>
          </div>
          <div className="vital-item">
            <span className="vital-label">HEIGHT</span>
            <strong className="vital-val">{height ? `${height} cm` : '--'}</strong>
          </div>
          <div className="vital-item">
            <span className="vital-label">WEIGHT</span>
            <strong className="vital-val">{weight ? `${weight} kg` : '--'}</strong>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="save-success-toast">
          ✓ Medical records saved successfully to your profile!
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="med-sub-tabs">
        <button className={`sub-tab ${activeSubTab === 'biodata' ? 'active' : ''}`} onClick={() => setActiveSubTab('biodata')}>Bio</button>
        <button className={`sub-tab ${activeSubTab === 'conditions' ? 'active' : ''}`} onClick={() => setActiveSubTab('conditions')}>History</button>
        <button className={`sub-tab ${activeSubTab === 'meds' ? 'active' : ''}`} onClick={() => setActiveSubTab('meds')}>Rx Meds</button>
        <button className={`sub-tab ${activeSubTab === 'treatments' ? 'active' : ''}`} onClick={() => setActiveSubTab('treatments')}>Therapies</button>
        <button className={`sub-tab ${activeSubTab === 'emergency' ? 'active' : ''}`} onClick={() => setActiveSubTab('emergency')}>SOS</button>
      </div>

      {/* SUB TAB 1: BIO DATA & VITALS */}
      {activeSubTab === 'biodata' && (
        <div className="editor-card">
          <h4 className="card-section-title">Personal Medical Bio-Data</h4>
          
          <div className="form-grid-2">
            <div className="form-group-sm">
              <label>Blood Group</label>
              <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
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

            <div className="form-group-sm">
              <label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2 margin-top">
            <div className="form-group-sm">
              <label>Height (cm)</label>
              <input type="number" placeholder="e.g. 175" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>

            <div className="form-group-sm">
              <label>Weight (kg)</label>
              <input type="number" placeholder="e.g. 70" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>

          <div className="form-group-sm margin-top">
            <label>Date of Birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
        </div>
      )}

      {/* SUB TAB 2: PAST ILLNESSES & ALLERGIES */}
      {activeSubTab === 'conditions' && (
        <div className="editor-card">
          <h4 className="card-section-title">Pre-Existing Conditions & Illnesses</h4>
          <p className="card-help-text">Record past surgeries, chronic illnesses, or diagnosed conditions (e.g. Diabetes, Asthma).</p>
          
          <div className="tag-input-row">
            <input 
              type="text" 
              placeholder="e.g. Type 2 Diabetes, Past Appendectomy..."
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
            />
            <button type="button" className="btn-add-tag" onClick={handleAddCondition}>Add</button>
          </div>

          <div className="tags-container">
            {preExistingConditions.map((cond, idx) => (
              <span key={idx} className="med-tag condition">
                🩺 {cond}
                <button type="button" onClick={() => handleRemoveCondition(cond)}>✕</button>
              </span>
            ))}
          </div>

          <hr className="divider" />

          <h4 className="card-section-title">Allergies & Sensitivities</h4>
          <p className="card-help-text">Record drug, food, or environmental allergies (e.g. Penicillin, Peanuts, Latex).</p>

          <div className="tag-input-row">
            <input 
              type="text" 
              placeholder="e.g. Penicillin, Peanuts..."
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
            />
            <button type="button" className="btn-add-tag" onClick={handleAddAllergy}>Add</button>
          </div>

          <div className="tags-container">
            {allergies.map((alg, idx) => (
              <span key={idx} className="med-tag allergy">
                ⚠️ {alg}
                <button type="button" onClick={() => handleRemoveAllergy(alg)}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 3: CURRENT MEDICATIONS */}
      {activeSubTab === 'meds' && (
        <div className="editor-card">
          <h4 className="card-section-title">Active Prescription Medications</h4>
          <p className="card-help-text">List current medications you take regularly.</p>

          <div className="form-add-row">
            <input type="text" placeholder="Medicine Name (e.g. Lisinopril)" value={medName} onChange={(e) => setMedName(e.target.value)} />
            <div className="form-grid-2">
              <input type="text" placeholder="Dosage (e.g. 10mg)" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} />
              <input type="text" placeholder="Frequency (e.g. Once daily)" value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} />
            </div>
            <button type="button" className="btn-add-block" onClick={handleAddMedication}>+ Add Medication Record</button>
          </div>

          <div className="med-list-items">
            {currentMedications.map((m, idx) => (
              <div key={idx} className="med-item-card">
                <div className="med-item-info">
                  <strong>💊 {m.name}</strong>
                  <p>{m.dosage} • {m.frequency}</p>
                </div>
                <button type="button" className="btn-del" onClick={() => handleRemoveMedication(idx)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 4: LONG TERM TREATMENTS */}
      {activeSubTab === 'treatments' && (
        <div className="editor-card">
          <h4 className="card-section-title">Long-Term Medical Therapies & Procedures</h4>
          <p className="card-help-text">Record ongoing or long-term medical treatments (e.g. Dialysis, Radiation, Immunotherapy, Physical Therapy).</p>

          <div className="form-add-row">
            <input type="text" placeholder="Treatment / Therapy Name (e.g. Immunotherapy)" value={treatmentName} onChange={(e) => setTreatmentName(e.target.value)} />
            <input type="text" placeholder="Notes (e.g. Monthly maintenance therapy)" value={treatmentNotes} onChange={(e) => setTreatmentNotes(e.target.value)} />
            <button type="button" className="btn-add-block" onClick={handleAddTreatment}>+ Add Treatment Record</button>
          </div>

          <div className="med-list-items">
            {longTermTreatments.map((t, idx) => (
              <div key={idx} className="med-item-card treatment">
                <div className="med-item-info">
                  <strong>💉 {t.treatmentName}</strong>
                  <p>{t.notes}</p>
                </div>
                <button type="button" className="btn-del" onClick={() => handleRemoveTreatment(idx)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 5: EMERGENCY CONTACT */}
      {activeSubTab === 'emergency' && (
        <div className="editor-card">
          <h4 className="card-section-title">Emergency Contact Details</h4>
          <p className="card-help-text">Person to reach out to in case of medical emergency.</p>

          <div className="form-group-sm">
            <label>Contact Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. Robert Doe"
              value={emergencyContact.name}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
            />
          </div>

          <div className="form-group-sm margin-top">
            <label>Relationship</label>
            <input 
              type="text" 
              placeholder="e.g. Spouse, Parent, Sibling"
              value={emergencyContact.relationship}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
            />
          </div>

          <div className="form-group-sm margin-top">
            <label>Emergency Phone Number</label>
            <input 
              type="tel" 
              placeholder="e.g. +1 555-0199"
              value={emergencyContact.phone}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="profile-actions-bar">
        <button type="button" className="btn-save-medical" onClick={handleSaveProfile} disabled={saving}>
          {saving ? 'Saving Records...' : '💾 Save Health Profile'}
        </button>
        <button type="button" className="btn-signout-profile" onClick={logout}>Sign Out</button>
      </div>
    </div>
  );
}
