import { useEffect, useRef } from 'react';

import Icon from '../Icon/Icon.jsx';
import './ConfirmDialog.css';

/** A small confirmation, used before anything the customer cannot simply undo. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null);
  const confirmRef = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    opener.current = document.activeElement;
    const timer = setTimeout(() => confirmRef.current?.focus(), 30);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll('button');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm" role="presentation" onClick={onCancel}>
      <div
        className="confirm__panel"
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(event) => event.stopPropagation()}
      >
        <span className={`confirm__mark is-${tone}`}>
          <Icon name={tone === 'danger' ? 'close' : 'user'} size={22} />
        </span>

        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>

        <div className="confirm__actions">
          <button type="button" className="confirm__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`confirm__go is-${tone}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
