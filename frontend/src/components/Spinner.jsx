import styles from './Spinner.module.css';

// size: sm | md | lg. Small spinners inherit the text colour (e.g. inside buttons) and are
// hidden from screen readers; the large page loader is brand-coloured and announced.
function Spinner({ size = 'md', className = '', label = 'Loading' }) {
  const sizeClass = styles[size] || styles.md;
  return (
    <span
      className={`${styles.spinner} ${sizeClass} ${className}`}
      role={size === 'lg' ? 'status' : undefined}
      aria-label={size === 'lg' ? label : undefined}
      aria-hidden={size === 'lg' ? undefined : true}
    >
      <span className={styles.ring} aria-hidden="true" />
    </span>
  );
}

export default Spinner;
