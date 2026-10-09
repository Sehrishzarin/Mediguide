import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../../../components/ui';
import styles from './Care.module.css';

// Bottom sheet on phones, centred dialog on wider screens.
// Focus moves to the primary action, Escape and the backdrop close it, focus returns on close.
export default function ConfirmSheet({ title, busy, onClose, children, actions, labelledBy = 'sheet-title' }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector('[data-autofocus]') || panel;
    first?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && !busyRef.current) closeRef.current();
      if (e.key === 'Tab' && panel) {
        // Keep keyboard focus inside the dialog
        const items = [...panel.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
        if (items.length === 0) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
        else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, []);

  return (
    <div className={styles.overlay} onClick={() => { if (!busy) onClose(); }}>
      <div
        ref={panelRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.sheetHead}>
          <h2 id={labelledBy} className={styles.sheetTitle}>{title}</h2>
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} disabled={busy} />
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {actions && <div className={styles.sheetActions}>{actions}</div>}
      </div>
    </div>
  );
}
