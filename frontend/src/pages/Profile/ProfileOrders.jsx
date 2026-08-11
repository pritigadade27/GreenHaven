import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import { profileApi } from '../../services/api.js';
import { resolveImage } from '../../utils/productImages.js';
import { formatPrice } from '../../utils/format.js';
import { Empty, Pill, SectionHead, Skeletons, formatDate, formatDateTime } from './ProfileParts.jsx';

export default function ProfileOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    profileApi
      .orders()
      .then((list) => alive && setOrders(list))
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (orders === null) return <Skeletons rows={3} height={150} />;

  if (orders.length === 0) {
    return (
      <section className="psec">
        <SectionHead title="My orders" />
        <Empty
          icon="truck"
          title={error ? 'We could not load your orders' : 'No orders yet'}
          action={{ to: '/shop', label: 'Start shopping' }}
        >
          {error || 'Everything you buy shows up here, with its status and what was in it.'}
        </Empty>
      </section>
    );
  }

  return (
    <section className="psec">
      <SectionHead
        title="My orders"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'} — newest first.`}
      />

      <ul className="porders">
        {orders.map((order) => (
          <li key={order.orderNumber} className="pcard porder">
            <header className="porder__head">
              <div>
                <h3>{order.orderNumber}</h3>
                <p>
                  {formatDateTime(order.placedAt)}
                  {order.invoiceNumber && <> &middot; Invoice {order.invoiceNumber}</>}
                </p>
              </div>
              <div className="porder__pills">
                <Pill value={order.status} />
                <Pill value={order.deliveryStatus} kind="delivery" />
              </div>
            </header>

            <div className="porder__body">
              <ul className="porder__thumbs">
                {order.preview.map((line, i) => (
                  <li key={`${order.orderNumber}-${line.slug || i}`}>
                    {line.image ? (
                      <img src={resolveImage(line.image)} alt="" loading="lazy" />
                    ) : (
                      <span className="porder__noimg" aria-hidden="true">
                        <Icon name="leaf" size={18} />
                      </span>
                    )}
                    <em>&times;{line.quantity}</em>
                  </li>
                ))}
                {order.totalItems > order.preview.length && (
                  <li className="porder__more">+{order.totalItems - order.preview.length}</li>
                )}
              </ul>

              <dl className="porder__facts">
                <div>
                  <dt>Items</dt>
                  <dd>{order.totalItems}</dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>{order.paymentMethod || '—'}</dd>
                </div>
                <div>
                  <dt>Expected by</dt>
                  <dd>{formatDate(order.estimatedDelivery)}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd className="porder__total">{formatPrice(order.total)}</dd>
                </div>
              </dl>
            </div>

            <footer className="porder__foot">
              {order.deliveryAddress && (
                <p>
                  <Icon name="pin" size={15} /> {order.deliveryAddress}
                </p>
              )}
              <Link className="psec__ghost" to={`/profile/orders/${order.orderNumber}`}>
                View details <Icon name="chevronRight" size={16} />
              </Link>
            </footer>
          </li>
        ))}
      </ul>
    </section>
  );
}
