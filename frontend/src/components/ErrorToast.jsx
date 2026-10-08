import { useEffect, useRef } from 'react';
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
        <svg
          className={styles.icon}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
        <p className={styles.message}>{message}</p>
        <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Dismiss">
          <svg className={styles.closeSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ErrorToast;
