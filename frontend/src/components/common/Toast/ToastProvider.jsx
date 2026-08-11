import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import Icon from '../Icon/Icon.jsx';
import './Toast.css';

const ToastContext = createContext(null);

const ICON = { good: 'check', bad: 'shield', info: 'leaf' };
const LIFETIME = { good: 4000, info: 5000, bad: 8000 };

/**
 * Brief messages that do not interrupt.
 *
 * Replaces window.alert in the dashboard: an alert blocks the whole page until
 * it is dismissed, cannot be styled, and on a failed save it hides the form the
 * admin needs to correct. A toast says the same thing and leaves the work on
 * screen.
 *
 * Failures linger twice as long as successes, and are announced assertively —
 * "saved" can be missed, "that did not save" cannot afford to be.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, tone = 'good') => {
      if (!message) return null;
      // Date.now alone collides when two land in the same millisecond, which
      // duplicates React keys and makes one of them undismissable.
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      timers.current.set(id, setTimeout(() => dismiss(id), LIFETIME[tone] ?? 5000));
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (m) => push(m, 'good'),
      error: (m) => push(m, 'bad'),
      info: (m) => push(m, 'info'),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <output key={t.id} className={`toast is-${t.tone}`} role={t.tone === 'bad' ? 'alert' : 'status'}>
            <Icon name={ICON[t.tone] ?? 'leaf'} size={17} />
            <span>{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <Icon name="close" size={15} />
            </button>
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
