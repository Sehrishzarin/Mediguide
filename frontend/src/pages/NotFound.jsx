import { Compass, ArrowLeft } from 'lucide-react';
import { useAuth, homeForRole } from '../context/AuthContext';
import { Button, Card, EmptyState, Logo } from '../components/ui';
import styles from './NotFound.module.css';

export default function NotFound() {
  const { user, role } = useAuth();
  const home = user ? homeForRole(role) : '/';

  return (
    <main className={styles.page}>
      <Logo size={32} to={home} className={styles.logo} />
      <Card padding="lg" className={styles.card}>
        <p className={styles.code}>Error 404</p>
        <EmptyState
          icon={Compass}
          title="We couldn't find that page"
          text="The link may be broken, or the page may have moved."
          action={<Button icon={ArrowLeft} to={home}>{user ? 'Back to my home' : 'Back to MediGuide'}</Button>}
        />
      </Card>
    </main>
  );
}
