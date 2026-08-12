import Icon from '../../components/common/Icon/Icon.jsx';
import Button from '../../components/common/Button/Button.jsx';

/** The bits every profile screen needs, so none of them reinvents them. */

export function SectionHead({ title, subtitle, children }) {
  return (
    <header className="psec__head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="psec__head-actions">{children}</div>}
    </header>
  );
}

/** The loading state. */
export function Skeletons({ rows = 3, height = 96 }) {
  return (
    <div className="psec__skeletons" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton" style={{ height, borderRadius: 'var(--radius-md)' }} />
      ))}
      <p className="sr-only" role="status">
        Loading
      </p>
    </div>
  );
}

export function Empty({ icon = 'leaf', title, children, action }) {
  return (
    <div className="empty-state psec__empty">
      <Icon name={icon} size={44} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && (
        <Button to={action.to} onClick={action.onClick} size="lg" icon="arrowRight">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** A short-lived confirmation or complaint above a form. */
export function Flash({ tone = 'good', message, onDismiss }) {
  if (!message) return null;
  return (
    <p className={`psec__flash is-${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <Icon name={tone === 'bad' ? 'shield' : 'check'} size={16} />
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={15} />
        </button>
      )}
    </p>
  );
}

/** Order and payment states, in the customer's language and the site's colours. */
const TONES = {
  PAID: 'good',
  CAPTURED: 'good',
  VERIFIED: 'good',
  DELIVERED: 'good',
  SHIPPED: 'good',
  OUT_FOR_DELIVERY: 'good',
  PENDING: 'wait',
  CREATED: 'wait',
  PROCESSING: 'wait',
  PACKED: 'wait',
  CONFIRMED: 'wait',
  UNVERIFIED: 'wait',
  FAILED: 'bad',
  PAID_SHORT: 'bad',
  CANCELLED: 'muted',
};

const WORDS = {
  PAID: 'Paid',
  PAID_SHORT: 'Paid — short stock',
  PENDING: 'Awaiting payment',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  CREATED: 'Started',
  CAPTURED: 'Captured',
  VERIFIED: 'Verified',
  UNVERIFIED: 'Unverified',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};

/** PENDING means two different things depending on which column it came from: a payment not yet. */
const DELIVERY_WORDS = {
  PENDING: 'Preparing',
  CONFIRMED: 'Confirmed',
  FAILED: 'Delivery failed',
};

export function Pill({ value, kind = 'payment' }) {
  if (!value) return null;
  const word =
    (kind === 'delivery' ? DELIVERY_WORDS[value] : null) || WORDS[value] || value;
  const tone = kind === 'delivery' && value === 'PENDING' ? 'wait' : TONES[value] || 'muted';
  return <span className={`psec__pill is-${tone}`}>{word}</span>;
}

const DATE = { day: 'numeric', month: 'short', year: 'numeric' };
const DATE_TIME = { ...DATE, hour: 'numeric', minute: '2-digit' };

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', DATE) : '—';

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', DATE_TIME) : '—';
