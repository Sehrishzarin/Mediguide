import { useState } from 'react';
import { Link } from 'react-router-dom';
import OrgSignup from './OrgSignup';
import OrgDataForm from './OrgDataForm';
import OrgDocumentUpload from './OrgDocumentUpload';
import OrgStaffForm from './OrgStaffForm';
import styles from './OrgOnboarding.module.css';

const STEPS = [
  { label: 'Org Data', key: 'data' },
  { label: 'Documents', key: 'documents' },
  { label: 'Staff', key: 'staff' },
  { label: 'Done', key: 'done' },
];

function Stepper({ currentStep }) {
  return (
    <div className={styles.stepper}>
      {STEPS.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        return (
          <div key={step.key} className={styles.stepGroup}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={`${styles.stepCircle} ${isCompleted ? styles.stepDone : isActive ? styles.stepActive : styles.stepPending}`}>
                {isCompleted ? (
                  <svg className={styles.stepCheckSvg} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (idx + 1)}
              </div>
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : isCompleted ? styles.stepLabelDone : styles.stepLabelPending}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`${styles.connector} ${idx < currentStep ? styles.connectorDone : styles.connectorPending}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DoneScreen({ orgName }) {
  return (
    <div className={styles.doneScreen}>
      <div className={styles.doneCircle}>
        <svg className={styles.doneSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h2 className={styles.doneTitle}>Pending verification</h2>
      <p className={styles.doneText}>
        Your organization <span className={styles.doneBold}>{orgName || ''}</span> has been submitted for review.
      </p>
      <p className={styles.doneSubtext}>
        Our admin team will verify your information and documents. You'll be notified once your organization is approved.
      </p>
      <Link to="/" className={styles.doneBtn}>Back to Home</Link>
    </div>
  );
}

function OrgOnboarding() {
  const [step, setStep] = useState(-1);
  const [wizardData, setWizardData] = useState({ user: null, organization: null, documents: [], staff: [] });

  const handleSignupDone = ({ user }) => { setWizardData((prev) => ({ ...prev, user })); setStep(0); };
  const handleOrgDataDone = ({ organization }) => { setWizardData((prev) => ({ ...prev, organization })); setStep(1); };
  const handleDocsDone = ({ documents }) => { setWizardData((prev) => ({ ...prev, documents })); setStep(2); };
  const handleStaffDone = ({ staff }) => { setWizardData((prev) => ({ ...prev, staff })); setStep(3); };

  const orgId = wizardData.organization?.id;

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.backLinkWrap}>
          <Link to="/" className={styles.backLink}>&larr; MediGuide Home</Link>
        </div>
        <h1 className={styles.heading}>Organization Onboarding</h1>

        {step >= 0 && <Stepper currentStep={step} />}

        <div className={styles.contentCard}>
          {step === -1 && <OrgSignup onNext={handleSignupDone} />}
          {step === 0 && <OrgDataForm onNext={handleOrgDataDone} onBack={() => setStep(-1)} />}
          {step === 1 && <OrgDocumentUpload orgId={orgId} onNext={handleDocsDone} onBack={() => setStep(0)} />}
          {step === 2 && <OrgStaffForm orgId={orgId} onNext={handleStaffDone} onBack={() => setStep(1)} />}
          {step === 3 && <DoneScreen orgName={wizardData.organization?.name} />}
        </div>
      </div>
    </div>
  );
}

export default OrgOnboarding;
