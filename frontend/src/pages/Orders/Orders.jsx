import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { orderApi } from '../../services/api.js';
import { formatPrice } from '../../utils/format.js';
import './Orders.css';

/** How each status reads to a customer, and how it looks. */
const STATUS = {
  PAID: { label: 'Paid', tone: 'good', note: 'Being potted up for despatch.' },
  PENDING: { label: 'Awaiting payment', tone: 'wait', note: 'Payment was not completed.' },
  FAILED: { label: 'Payment failed', tone: 'bad', note: 'You have not been charged.' },
  CANCELLED: { label: 'Cancelled', tone: 'muted', note: 'This order was cancelled.' },
  SHIPPED: { label: 'Shipped', tone: 'good', note: 'On its way to you.' },
  DELIVERED: { label: 'Delivered', tone: 'good', note: 'Enjoy — and check the care card.' },
};

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

export default function Orders() {
  const { isSignedIn, ready } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState(null); // null = still loading
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!isSignedIn) {
      navigate('/login', {
        replace: true,
        state: { from: '/orders', reason: 'Please sign in to see your orders.' },
      });
      return;
    }
    let alive = true;
    orderApi
      .mine()
      .then((list) => alive && setOrders(list))
      .catch((err) => alive && (setError(err.message), setOrders([])));
    // Guards against a state update after the customer navigates away.
    return () => {
      alive = false;
    };
  }, [ready, isSignedIn, navigate]);

  if (!ready || orders === null) {
    return (
      <>
      <h1 className="sr-only">Your orders</h1>
        <section className="section">
          <div className="container orders__skeletons">
            {[1, 2, 3].map((n) => (
              <div key={n} className="orders__card orders__card--loading" aria-hidden="true">
                <span className="skeleton" style={{ width: '40%', height: 18 }} />
                <span className="skeleton" style={{ width: '65%', height: 14 }} />
                <span className="skeleton" style={{ width: '30%', height: 14 }} />
              </div>
            ))}
            <p className="sr-only" role="status">
              Loading your orders
            </p>
          </div>
        </section>
      </>
    );
  }

  if (orders.length === 0) {
    return (
      <>
      <h1 className="sr-only">Your orders</h1>
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Icon name="truck" size={46} />
              <h2>{error ? 'We could not load your orders' : 'No orders yet'}</h2>
              <p>
                {error ||
                  'When you buy something, it will appear here with its status and what was in it.'}
              </p>
              <Button to="/shop" size="lg" icon="arrowRight">
                Start shopping
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Your orders</h1>

      <section className="section">
        <div className="container orders">
          {orders.map((order) => {
            const status = STATUS[order.status] ?? {
              label: order.status,
              tone: 'muted',
              note: '',
            };
            const placed = formatDate(order.placedAt);

            return (
              <article key={order.orderNumber} className="orders__card">
                <header className="orders__head">
                  <div>
                    <h2>{order.orderNumber}</h2>
                    {placed && <p className="orders__date">Placed {placed}</p>}
                  </div>
                  <span className={`orders__status is-${status.tone}`}>{status.label}</span>
                </header>

                {status.note && <p className="orders__note">{status.note}</p>}

                <ul className="orders__lines">
                  {order.items.map((line) => (
                    <li key={line.slug}>
                      <Link to={`/plant/${line.slug}`}>{line.name}</Link>
                      <span>&times;{line.quantity}</span>
                      <strong>{formatPrice(line.unitPrice * line.quantity)}</strong>
                    </li>
                  ))}
                </ul>

                <footer className="orders__foot">
                  {order.addressLine && (
                    <p className="orders__address">
                      <Icon name="pin" size={15} />
                      {order.addressLine}, {order.city} {order.pincode}
                    </p>
                  )}
                  <dl>
                    <div>
                      <dt>Delivery</dt>
                      <dd>{order.shipping > 0 ? formatPrice(order.shipping) : <em>Free</em>}</dd>
                    </div>
                    <div className="orders__total">
                      <dt>Total paid</dt>
                      <dd>{formatPrice(order.total)}</dd>
                    </div>
                  </dl>
                </footer>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
