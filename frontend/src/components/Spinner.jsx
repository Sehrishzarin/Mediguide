import styles from './Spinner.module.css';

function Spinner({ size = 'md', className = '' }) {
  const sizeClass = styles[size] || styles.md;

  return (
    <svg
      className={`${styles.spinner} ${sizeClass} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className={styles.circle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className={styles.path}
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default Spinner;
