import { lazy, Suspense } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Segmented, Skeleton } from '../../../components/ui';
import BookTab from './BookTab';
import AppointmentsTab from './AppointmentsTab';
import styles from './Care.module.css';

// Leaflet is heavy: only load it when the Nearby tab is opened
const NearbyTab = lazy(() => import('./NearbyTab'));

const TABS = [
  { value: 'book', label: 'Book a doctor', short: 'Book' },
  { value: 'appointments', label: 'My appointments', short: 'Appointments' },
  { value: 'nearby', label: 'Nearby', short: 'Nearby' }
];

// Full labels on wide screens, short ones on phones (the hidden one is display: none, so it is not announced)
const SEGMENTS = TABS.map((t) => ({
  value: t.value,
  label: (
    <>
      <span className={styles.labelLong}>{t.label}</span>
      <span className={styles.labelShort}>{t.short}</span>
    </>
  )
}));

function NearbySkeleton() {
  return (
    <div className={styles.stack} aria-busy="true" aria-label="Loading nearby facilities">
      <Skeleton height={300} radius="var(--r-lg)" />
      <Skeleton height={88} radius="var(--r-lg)" />
      <Skeleton height={88} radius="var(--r-lg)" />
    </div>
  );
}

function CareHub() {
  const { tab } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  if (!TABS.some((t) => t.value === tab)) {
    return <Navigate to="/patient/care/book" replace state={location.state} />;
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Care" subtitle="Book a doctor, manage appointments and find care nearby." className={styles.header} />
      <Segmented
        label="Care sections"
        options={SEGMENTS}
        value={tab}
        onChange={(v) => { if (v !== tab) navigate(`/patient/care/${v}`); }}
        className={styles.tabs}
      />
      <div className={styles.panel} role="tabpanel" aria-label={TABS.find((t) => t.value === tab).label}>
        {tab === 'book' && <BookTab key={location.key} />}
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'nearby' && (
          <Suspense fallback={<NearbySkeleton />}>
            <NearbyTab />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default CareHub;
