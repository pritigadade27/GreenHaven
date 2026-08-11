import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import { profileApi } from '../../services/api.js';
import { Empty, SectionHead, Skeletons, formatDateTime } from './ProfileParts.jsx';

/** How each event reads at a glance. */
const KIND = {
  ORDER_PLACED: { icon: 'box', tone: 'wait' },
  PAYMENT_SUCCESSFUL: { icon: 'card', tone: 'good' },
  PAYMENT_FAILED: { icon: 'shield', tone: 'bad' },
  ORDER_SHIPPED: { icon: 'truck', tone: 'good' },
  OUT_FOR_DELIVERY: { icon: 'pin', tone: 'good' },
  ORDER_DELIVERED: { icon: 'check', tone: 'good' },
  ORDER_CANCELLED: { icon: 'close', tone: 'muted' },
};

export default function ProfileNotifications() {
  const { reload } = useOutletContext();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    profileApi
      .notifications()
      .then((list) => {
        if (!alive) return;
        setItems(list);
        // Opening this page is what "reading" them means, so the badge clears
        // as soon as they are on screen rather than after a separate click.
        if (list.some((n) => !n.read)) {
          profileApi
            .markNotificationsRead()
            .then(() => reload())
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [reload]);

  if (items === null) return <Skeletons rows={4} height={72} />;

  if (items.length === 0) {
    return (
      <section className="psec">
        <SectionHead title="Notifications" />
        <Empty
          icon="bell"
          title={error ? 'We could not load your notifications' : 'Nothing to report'}
          action={{ to: '/shop', label: 'Browse plants' }}
        >
          {error || 'You will hear from us here when an order is placed, paid, shipped or delivered.'}
        </Empty>
      </section>
    );
  }

  return (
    <section className="psec">
      <SectionHead title="Notifications" subtitle="The last 20 things that happened to your orders." />

      <ul className="pnotifs">
        {items.map((n) => {
          const kind = KIND[n.type] || { icon: 'leaf', tone: 'muted' };
          return (
            <li key={n.id} className={`pcard pnotif ${n.read ? '' : 'is-unread'}`}>
              <span className={`pnotif__icon is-${kind.tone}`} aria-hidden="true">
                <Icon name={kind.icon} size={18} />
              </span>
              <div className="pnotif__body">
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <span className="pnotif__meta">
                  {formatDateTime(n.createdAt)}
                  {n.orderNumber && (
                    <>
                      {' '}
                      &middot;{' '}
                      <Link to={`/profile/orders/${n.orderNumber}`}>{n.orderNumber}</Link>
                    </>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
