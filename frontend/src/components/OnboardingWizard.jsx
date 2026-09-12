import { useState } from 'react';
import { usePatient } from '../pages/patient/PatientContext';
import styles from './OnboardingWizard.module.css';

export default function OnboardingWizard({ onComplete }) {
  const { user, login } = usePatient();
  const [step, setStep] = useState(1);

  // Form states for profile quick setup
  const [bloodGroup, setBloodGroup] = useState(user?.medicalProfile?.bloodGroup || '');
  const [gender, setGender] = useState(user?.medicalProfile?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.medicalProfile?.dateOfBirth || '');
  const [allergiesInput, setAllergiesInput] = useState((user?.medicalProfile?.allergies || []).join(', '));
  const [conditionsInput, setConditionsInput] = useState((user?.medicalProfile?.preExistingConditions || []).join(', '));
  const [medsInput, setMedsInput] = useState('');
  
  const [emergencyName, setEmergencyName] = useState(user?.medicalProfile?.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.medicalProfile?.emergencyContact?.phone || '');
  const [emergencyRel, setEmergencyRel] = useState(user?.medicalProfile?.emergencyContact?.relationship || '');
  const [address, setAddress] = useState(user?.address || '');

  const [locationPerm, setLocationPerm] = useState(false);
  const [micPerm, setMicPerm] = useState(false);

  const totalSteps = 6;
  const progressPercent = Math.round((step / totalSteps) * 100);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const finishOnboarding = () => {
    localStorage.setItem('mediguide_onboarded', 'true');
    localStorage.removeItem('mediguide_just_signed_up');
    
    const allergiesList = allergiesInput ? allergiesInput.split(',').map(s => s.trim()).filter(Boolean) : user?.medicalProfile?.allergies || [];
    const conditionsList = conditionsInput ? conditionsInput.split(',').map(s => s.trim()).filter(Boolean) : user?.medicalProfile?.preExistingConditions || [];
    const medsList = medsInput ? medsInput.split(',').map(s => s.trim()).filter(Boolean) : user?.medicalProfile?.currentMedications || [];

    const updatedProfile = {
      ...user,
      address: address || user?.address,
      bloodGroup: bloodGroup || user?.medicalProfile?.bloodGroup || user?.bloodGroup,
      bloodType: bloodGroup || user?.medicalProfile?.bloodGroup || user?.bloodType,
      dateOfBirth: dateOfBirth || user?.medicalProfile?.dateOfBirth || user?.dob,
      dob: dateOfBirth || user?.medicalProfile?.dateOfBirth || user?.dob,
      gender: gender || user?.medicalProfile?.gender || user?.gender,
      allergies: allergiesList,
      preExistingConditions: conditionsList,
      pastConditions: conditionsList,
      ongoingMedications: medsList,
      medications: medsList,
      emergencyContact: {
        name: emergencyName || user?.medicalProfile?.emergencyContact?.name || '',
        phone: emergencyPhone || user?.medicalProfile?.emergencyContact?.phone || '',
        relationship: emergencyRel || user?.medicalProfile?.emergencyContact?.relationship || ''
      },
      medicalProfile: {
        ...(user?.medicalProfile || {}),
        bloodGroup: bloodGroup || user?.medicalProfile?.bloodGroup,
        gender: gender || user?.medicalProfile?.gender,
        dateOfBirth: dateOfBirth || user?.medicalProfile?.dateOfBirth,
        allergies: allergiesList,
        preExistingConditions: conditionsList,
        currentMedications: medsList.map(m => typeof m === 'string' ? { name: m, dosage: '', frequency: '' } : m),
        emergencyContact: {
          name: emergencyName || user?.medicalProfile?.emergencyContact?.name || '',
          phone: emergencyPhone || user?.medicalProfile?.emergencyContact?.phone || '',
          relationship: emergencyRel || user?.medicalProfile?.emergencyContact?.relationship || ''
        }
      }
    };

    if (login) {
      login(updatedProfile);
      localStorage.setItem('mediguide_patient', JSON.stringify(updatedProfile));
      localStorage.setItem('mediguide_user', JSON.stringify(updatedProfile));
    }

    if (onComplete) {
      onComplete();
    }
  };

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationPerm(true),
        () => setLocationPerm(true),
        { timeout: 5000 }
      );
    } else {
      setLocationPerm(true);
    }
  };

  const requestMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition || navigator.mediaDevices) {
      setMicPerm(true);
    } else {
      setMicPerm(true);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modalCard}>
        {/* Top Progress Bar */}
        <div className={styles.progressBarTrack}>
          <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Wizard Header */}
        <div className={styles.wizardHeader}>
          <div className={styles.wizardTitleBox}>
            <h2>Welcome to MediGuide</h2>
            <p className={styles.wizardSubtext}>Quick 1-minute personalized setup</p>
          </div>
          <span className={styles.stepBadge}>Step {step} of {totalSteps}</span>
        </div>

        {/* Wizard Body */}
        <div className={styles.wizardBody}>
          {/* STEP 1: Welcome & Overview */}
          {step === 1 && (
            <div className={styles.welcomeHero}>
              <div className={styles.welcomeIconCircle}>🩺</div>
              <h3 className={styles.welcomeTitle}>Your Intelligent Healthcare Companion</h3>
              <p className={styles.welcomeDesc}>
                MediGuide combines clinical AI symptom triage with interactive GPS facility mapping and instant specialist booking.
              </p>

              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🤖</span>
                  <div className={styles.featureText}>
                    <strong>AI Clinical Triage</strong>
                    <p>Describe your symptoms anytime to get preliminary advice and hospital recommendations.</p>
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>🗺️</span>
                  <div className={styles.featureText}>
                    <strong>Dual Facilities Map</strong>
                    <p>View registered partner clinics and nearby Google Maps healthcare centers.</p>
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>📅</span>
                  <div className={styles.featureText}>
                    <strong>Instant Doctor Booking</strong>
                    <p>Schedule doctor consultations without waiting in line.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Basic Info */}
          {step === 2 && (
            <>
              <h3 className={styles.welcomeTitle}>Basic Personal Bio</h3>
              <p className={styles.welcomeDesc}>Help our AI triage tailor medical advice based on your profile.</p>
              
              <div className={styles.grid2}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Blood Group</label>
                  <select className={styles.input} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
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
                  <select className={styles.input} value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className={styles.fieldGroup} style={{ marginTop: '0.875rem' }}>
                <label className={styles.fieldLabel}>Date of Birth</label>
                <input type="date" className={styles.input} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
            </>
          )}

          {/* STEP 3: Health History */}
          {step === 3 && (
            <>
              <h3 className={styles.welcomeTitle}>Medical Background</h3>
              <p className={styles.welcomeDesc}>Optional health history to alert doctors and AI of sensitivities.</p>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Known Allergies (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts, Latex"
                  className={styles.input}
                  value={allergiesInput}
                  onChange={(e) => setAllergiesInput(e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Pre-Existing Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Asthma, Type 2 Diabetes"
                  className={styles.input}
                  value={conditionsInput}
                  onChange={(e) => setConditionsInput(e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Current Prescription Meds</label>
                <input
                  type="text"
                  placeholder="e.g. Metformin 500mg, Lisinopril"
                  className={styles.input}
                  value={medsInput}
                  onChange={(e) => setMedsInput(e.target.value)}
                />
              </div>
            </>
          )}

          {/* STEP 4: Emergency Contact & Address */}
          {step === 4 && (
            <>
              <h3 className={styles.welcomeTitle}>Emergency Contact & Address</h3>
              <p className={styles.welcomeDesc}>Used for quick emergency route dispatching if urgent.</p>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Emergency Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Smith"
                  className={styles.input}
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>

              <div className={styles.grid2}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse"
                    className={styles.input}
                    value={emergencyRel}
                    onChange={(e) => setEmergencyRel(e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    className={styles.input}
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Home Address</label>
                <input
                  type="text"
                  placeholder="123 Health Ave, City"
                  className={styles.input}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </>
          )}

          {/* STEP 5: Permissions */}
          {step === 5 && (
            <>
              <h3 className={styles.welcomeTitle}>Enable Core Capabilities</h3>
              <p className={styles.welcomeDesc}>Enable location for nearby hospitals and microphone for hands-free voice triage.</p>

              <div className={styles.permissionCard}>
                <div className={styles.permissionInfo}>
                  <span className={styles.permissionIcon}>📍</span>
                  <div>
                    <h4 className={styles.permissionTitle}>GPS Location Services</h4>
                    <p className={styles.permissionSub}>To discover nearby registered partners & Google Maps clinics.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={locationPerm ? styles.btnEnableDone : styles.btnEnable}
                  onClick={requestLocation}
                >
                  {locationPerm ? '✓ Enabled' : 'Enable'}
                </button>
              </div>

              <div className={styles.permissionCard}>
                <div className={styles.permissionInfo}>
                  <span className={styles.permissionIcon}>🎤</span>
                  <div>
                    <h4 className={styles.permissionTitle}>Voice Triage Microphone</h4>
                    <p className={styles.permissionSub}>To speak your symptoms directly to the AI counselor.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={micPerm ? styles.btnEnableDone : styles.btnEnable}
                  onClick={requestMic}
                >
                  {micPerm ? '✓ Enabled' : 'Enable'}
                </button>
              </div>
            </>
          )}

          {/* STEP 6: Completion */}
          {step === 6 && (
            <div className={styles.welcomeHero}>
              <div className={styles.welcomeIconCircle} style={{ background: '#DCFCE7', color: '#15803D' }}>
                ✨
              </div>
              <h3 className={styles.welcomeTitle}>You're All Set!</h3>
              <p className={styles.welcomeDesc}>
                Your profile setup is complete. You can now use MediGuide to consult AI, locate clinics, and book specialist sessions.
              </p>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className={styles.wizardFooter}>
          {step > 1 && (
            <button type="button" className={styles.btnBack} onClick={handleBack}>
              ← Back
            </button>
          )}
          <button type="button" className={styles.btnNext} onClick={handleNext}>
            {step === totalSteps ? 'Launch Dashboard ✨' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
