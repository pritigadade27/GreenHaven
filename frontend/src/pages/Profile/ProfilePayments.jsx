import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import { profileApi } from '../../services/api.js';
import { formatPrice } from '../../utils/format.js';
import { Empty, Flash, Pill, SectionHead, Skeletons, formatDateTime } from './ProfileParts.jsx';

export default function ProfilePayments() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    profileApi
      .payments()
      .then((list) => alive && setPayments(list))
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setPayments([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function invoice(orderNumber) {
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

  if (payments === null) return <Skeletons rows={4} height={64} />;

  if (payments.length === 0) {
    return (
      <section className="psec">
        <SectionHead title="Payment history" />
        <Empty
          icon="card"
          title={error ? 'We could not load your payments' : 'No payments yet'}
          action={{ to: '/shop', label: 'Browse plants' }}
        >
          {error || 'Every payment attempt is recorded here, successful or not.'}
        </Empty>
      </section>
    );
  }

  return (
    <section className="psec">
      <SectionHead
        title="Payment history"
        subtitle="Attempts are kept as well as successes — the record is never edited."
      />
      <Flash {...flash} onDismiss={() => setFlash(null)} />

      <article className="pcard">
        <div className="ptable-wrap">
          <table className="ptable">
            <thead>
              <tr>
                <th scope="col">Payment</th>
                <th scope="col">Order</th>
                <th scope="col">Date</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className={open === p.id ? 'is-open' : undefined}>
                  <td data-label="Payment">
                    <span className="pmono">{p.razorpayPaymentId || `#${p.id}`}</span>
                    {p.method && <small>{p.method}</small>}
                  </td>
                  <td data-label="Order">
                    {p.orderNumber ? (
                      <Link to={`/profile/orders/${p.orderNumber}`}>{p.orderNumber}</Link>
                    ) : (
                      '—'
                    )}
                    {p.invoiceNumber && <small>{p.invoiceNumber}</small>}
                  </td>
                  <td data-label="Date">{formatDateTime(p.paidAt)}</td>
                  <td className="ptable__amount" data-label="Amount">{formatPrice(p.amount)}</td>
                  <td data-label="Status">
                    <Pill value={p.status} />
                  </td>
                  <td className="ptable__actions">
                    <button
                      type="button"
                      className="psec__ghost"
                      onClick={() => setOpen(open === p.id ? null : p.id)}
                      aria-expanded={open === p.id}
                    >
                      Details
                    </button>
                    {p.invoiceAvailable && (
                      <button
                        type="button"
                        className="psec__ghost"
                        onClick={() => invoice(p.orderNumber)}
                        disabled={busy}
                      >
                        <Icon name="download" size={15} /> Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* The expanded row rendered outside the table, so a narrow screen is not forced to fit six. */}
      {open !== null && (
        <article className="pcard">
          {(() => {
            const p = payments.find((row) => row.id === open);
            if (!p) return null;
            return (
              <>
                <h3 className="pcard__title">Payment details</h3>
                <dl className="pfacts pfacts--tight">
                  <div>
                    <dt>Internal id</dt>
                    <dd className="pmono">{p.id}</dd>
                  </div>
                  <div>
                    <dt>Razorpay payment id</dt>
                    <dd className="pmono">{p.razorpayPaymentId || '—'}</dd>
                  </div>
                  <div>
                    <dt>Razorpay order id</dt>
                    <dd className="pmono">{p.razorpayOrderId || '—'}</dd>
                  </div>
                  <div>
                    <dt>Order</dt>
                    <dd>{p.orderNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>Invoice</dt>
                    <dd>{p.invoiceNumber || <em>Not issued</em>}</dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd>{formatPrice(p.amount)}</dd>
                  </div>
                  <div>
                    <dt>Method</dt>
                    <dd>{p.method || '—'}</dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>
                      <Pill value={p.verificationStatus} />
                    </dd>
                  </div>
                  <div>
                    <dt>Recorded</dt>
                    <dd>{formatDateTime(p.paidAt)}</dd>
                  </div>
                  {p.failureReason && (
                    <div className="pfacts__wide">
                      <dt>Why it failed</dt>
                      <dd>{p.failureReason}</dd>
                    </div>
                  )}
                </dl>
              </>
            );
          })()}
        </article>
      )}
    </section>
  );
}
