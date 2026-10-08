import { Link } from 'react-router-dom';
import { useAuth, homeForRole } from '../context/AuthContext';
import styles from './NotFound.module.css';

export default function NotFound() {
  const { user, role } = useAuth();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.code} aria-hidden="true">404</p>
        <h1 className={styles.title}>We could not find that page</h1>
        <p className={styles.text}>The link may be broken or the page may have moved.</p>
        <div className={styles.actions}>
          {user && <Link to={homeForRole(role)} className={styles.primary}>Go to my dashboard</Link>}
          <Link to="/" className={user ? styles.secondary : styles.primary}>Back to home</Link>
        </div>
      </div>
    </main>
  );
}
