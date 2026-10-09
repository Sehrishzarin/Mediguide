import { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import styles from './ErrorToast.module.css';

function ErrorToast({ message, onClose, duration = 5000 }) {
  // Keep the latest onClose without restarting the timer on every parent render
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!message || duration <= 0) return undefined;
    const timer = setTimeout(() => closeRef.current?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message) return null;

  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.toast}>
        <AlertCircle size={18} className={styles.icon} aria-hidden="true" />
        <p className={styles.message}>{message}</p>
        <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Dismiss">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default ErrorToast;
