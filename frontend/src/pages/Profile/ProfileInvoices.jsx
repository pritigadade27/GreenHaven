import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import { profileApi } from '../../services/api.js';
import { formatPrice } from '../../utils/format.js';
import { Empty, Flash, SectionHead, Skeletons, formatDate } from './ProfileParts.jsx';

export default function ProfileInvoices() {
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    profileApi
      .invoices()
      .then((list) => alive && setInvoices(list))
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setInvoices([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function download(number) {
    setBusy(number);
    try {
      const filename = await profileApi.downloadDocument(number);
      setFlash({ tone: 'good', message: `${filename} is downloading.` });
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy('');
    }
  }

  if (invoices === null) return <Skeletons rows={4} height={60} />;

  if (invoices.length === 0) {
    return (
      <section className="psec">
        <SectionHead title="Download invoices" />
        <Empty
          icon="file"
          title={error ? 'We could not load your invoices' : 'No invoices yet'}
          action={{ to: '/shop', label: 'Browse plants' }}
        >
          {error || 'An invoice is issued the moment a payment is verified, and kept for good.'}
        </Empty>
      </section>
    );
  }

  return (
    <section className="psec">
      <SectionHead
        title="Download invoices"
        subtitle="Invoices are never deleted or renumbered. A cancelled paid order keeps its invoice and gains a credit note."
      />
      <Flash {...flash} onDismiss={() => setFlash(null)} />

      <article className="pcard">
        <div className="ptable-wrap">
          <table className="ptable">
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">Order</th>
                <th scope="col">Date</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">
                  <span className="sr-only">Download</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.invoiceNumber}>
                  <td data-label="Document">
                    <span className="pmono">{inv.invoiceNumber}</span>
                    {inv.docType === 'CREDIT_NOTE' && (
                      <span className="pcredit">
                        Credit note{inv.reason ? ` · ${inv.reason}` : ''}
                      </span>
                    )}
                  </td>
                  <td data-label="Order">
                    <Link to={`/profile/orders/${inv.orderNumber}`}>{inv.orderNumber}</Link>
                  </td>
                  <td data-label="Date">{formatDate(inv.invoiceDate)}</td>
                  <td data-label="Items">{inv.totalItems}</td>
                  <td className="ptable__amount" data-label="Total">
                    {inv.docType === 'CREDIT_NOTE' ? '−' : ''}
                    {formatPrice(inv.total)}
                  </td>
                  <td className="ptable__actions">
                    <button
                      type="button"
                      className="psec__ghost"
                      onClick={() => download(inv.invoiceNumber)}
                      disabled={busy === inv.invoiceNumber}
                    >
                      <Icon name="download" size={15} />
                      {busy === inv.invoiceNumber ? 'Preparing…' : 'PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
