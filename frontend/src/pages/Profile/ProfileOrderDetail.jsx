import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCatalogue } from '../../context/CatalogueContext.jsx';
import { profileApi } from '../../services/api.js';
import { resolveImage } from '../../utils/productImages.js';
import { formatPrice } from '../../utils/format.js';
import { Empty, Flash, Pill, Skeletons, formatDate, formatDateTime } from './ProfileParts.jsx';

/** The icon that marks each stop on the tracking strip. */
const STEP_ICON = {
  PLACED: 'check',
  PAID: 'card',
  PROCESSING: 'leaf',
  PACKED: 'box',
  SHIPPED: 'truck',
  OUT_FOR_DELIVERY: 'pin',
  DELIVERED: 'check',
  CANCELLED: 'close',
};

export default function ProfileOrderDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { getPlantBySlug } = useCatalogue();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    let alive = true;
    setOrder(null);
    profileApi
      .order(orderNumber)
      .then((data) => alive && setOrder(data))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [orderNumber]);

  async function downloadInvoice() {
    setBusy(true);
    try {
      await profileApi.downloadInvoice(orderNumber);
      setFlash({ tone: 'good', message: 'Your invoice is downloading.' });
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Puts the order's lines back in the basket at today's prices, which is the
   * only honest thing to do: the old price belongs to the old order.
   */
  async function reorder() {
    setBusy(true);
    try {
      const lines = await profileApi.reorder(orderNumber);
      let added = 0;
      let missing = 0;
      lines.forEach(({ slug, quantity }) => {
        const product = getPlantBySlug(slug);
        if (!product) {
          missing += 1;
          return;
        }
        addToCart(product, quantity);
        added += 1;
      });

      if (added === 0) {
        setFlash({ tone: 'bad', message: 'None of these are in the catalogue any more.' });
      } else {
        setFlash({
          tone: 'good',
          message: missing
            ? `${added} added to your basket. ${missing} is no longer sold.`
            : `${added} item${added === 1 ? '' : 's'} added to your basket at today's prices.`,
        });
      }
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setConfirmingCancel(false);
    setBusy(true);
    try {
      const updated = await profileApi.cancelOrder(orderNumber, 'Cancelled from My Profile');
      setOrder(updated);
      setFlash({ tone: 'good', message: 'This order has been cancelled.' });
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <section className="psec">
        <Empty icon="truck" title="We could not open that order" action={{ to: '/profile/orders', label: 'Back to orders' }}>
          {error}
        </Empty>
      </section>
    );
  }

  if (!order) return <Skeletons rows={3} height={160} />;

  // The one condition the whole review system turns on.
  const delivered = order.deliveryStatus === 'DELIVERED';

  return (
    <section className="psec">
      <button type="button" className="psec__back" onClick={() => navigate('/profile/orders')}>
        <Icon name="chevronRight" size={16} /> All orders
      </button>

      <header className="psec__head">
        <div>
          <h2>{order.orderNumber}</h2>
          <p>
            Placed {formatDateTime(order.placedAt)}
            {order.invoiceNumber && <> &middot; Invoice {order.invoiceNumber}</>}
          </p>
        </div>
        <div className="porder__pills">
          <Pill value={order.status} />
          <Pill value={order.deliveryStatus} kind="delivery" />
        </div>
      </header>

      <Flash {...flash} onDismiss={() => setFlash(null)} />

      {/* ---- tracking ---- */}
      <article className="pcard">
        <h3 className="pcard__title">Tracking</h3>
        <ol className="ptrack">
          {order.timeline.map((step) => (
            <li key={step.key} className={`ptrack__step is-${step.state.toLowerCase()}`}>
              <span className="ptrack__dot" aria-hidden="true">
                <Icon name={STEP_ICON[step.key] || 'check'} size={15} />
              </span>
              <span className="ptrack__label">{step.label}</span>
              {step.at && <span className="ptrack__at">{formatDate(step.at)}</span>}
            </li>
          ))}
        </ol>
        {order.deliveryStatus !== 'CANCELLED' && order.estimatedDelivery && (
          <p className="ptrack__eta">
            <Icon name="calendar" size={15} /> Expected by {formatDate(order.estimatedDelivery)}
          </p>
        )}
        {order.cancelledAt && (
          <p className="ptrack__eta">
            <Icon name="close" size={15} /> Cancelled {formatDateTime(order.cancelledAt)}
            {order.cancelReason && <> &middot; {order.cancelReason}</>}
          </p>
        )}
      </article>

      <div className="pcards pcards--two">
        <article className="pcard">
          <h3 className="pcard__title">Shipping address</h3>
          <address className="paddr">
            <strong>{order.shipTo.name}</strong>
            {order.shipTo.line}
            <span>
              {order.shipTo.city} {order.shipTo.pincode}
            </span>
            <span>
              {order.shipTo.state}, {order.shipTo.country}
            </span>
            {order.shipTo.phone && (
              <span>
                <Icon name="phone" size={14} /> {order.shipTo.phone}
              </span>
            )}
          </address>
        </article>

        <article className="pcard">
          <h3 className="pcard__title">Payment</h3>
          {order.payment ? (
            <dl className="pfacts pfacts--tight">
              <div>
                <dt>Status</dt>
                <dd>
                  <Pill value={order.payment.status} />
                </dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{order.payment.method || '—'}</dd>
              </div>
              <div>
                <dt>Razorpay payment id</dt>
                <dd className="pmono">{order.payment.razorpayPaymentId || '—'}</dd>
              </div>
              <div>
                <dt>Razorpay order id</dt>
                <dd className="pmono">{order.payment.razorpayOrderId || '—'}</dd>
              </div>
              <div>
                <dt>Paid on</dt>
                <dd>{formatDateTime(order.payment.paidAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="psec__muted">No payment has been recorded for this order.</p>
          )}
        </article>
      </div>

      {/* ---- what was in it ---- */}
      <article className="pcard">
        <h3 className="pcard__title">Items</h3>
        <div className="ptable-wrap">
          <table className="ptable">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Qty</th>
                <th scope="col">Price</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((line, i) => (
                <tr key={line.slug || i}>
                  <td>
                    <div className="ptable__product">
                      {line.image ? (
                        <img src={resolveImage(line.image)} alt="" loading="lazy" />
                      ) : (
                        <span className="porder__noimg" aria-hidden="true">
                          <Icon name="leaf" size={18} />
                        </span>
                      )}
                      <div>
                        {line.slug ? (
                          <Link to={`/plant/${line.slug}`}>{line.name}</Link>
                        ) : (
                          <span>{line.name}</span>
                        )}
                        {line.category && <small>{line.category}</small>}
                        {/* Only once it has actually arrived. Reviewing a plant
                            still in a van helps nobody. */}
                        {delivered && line.slug && (
                          <Link className="porder__rate" to={`/plant/${line.slug}#reviews`}>
                            <Icon name="star" size={13} /> Rate &amp; review
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{line.quantity}</td>
                  <td>{formatPrice(line.unitPrice)}</td>
                  <td className="ptable__amount">{formatPrice(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ptotals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div>
              <dt>Discount</dt>
              <dd>-{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div>
            <dt>Delivery</dt>
            <dd>{order.shipping > 0 ? formatPrice(order.shipping) : <em>Free</em>}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{order.tax > 0 ? formatPrice(order.tax) : <em>Included</em>}</dd>
          </div>
          <div className="ptotals__final">
            <dt>Total</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </article>

      <div className="psec__actions">
        {order.invoiceAvailable && (
          <Button onClick={downloadInvoice} disabled={busy} icon="download">
            Download invoice
          </Button>
        )}
        <button type="button" className="psec__ghost" onClick={reorder} disabled={busy}>
          <Icon name="repeat" size={16} /> Reorder
        </button>
        {order.cancellable && (
          <button
            type="button"
            className="psec__danger"
            onClick={() => setConfirmingCancel(true)}
            disabled={busy}
          >
            <Icon name="close" size={16} /> Cancel order
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancel this order?"
        message={
          order.status === 'PAID'
            ? 'The order will not be despatched. Your payment record and invoice are kept, and the refund is handled separately.'
            : 'This order has not been paid for, so nothing will be charged.'
        }
        confirmLabel="Cancel the order"
        cancelLabel="Keep it"
        onCancel={() => setConfirmingCancel(false)}
        onConfirm={cancel}
      />
    </section>
  );
}
