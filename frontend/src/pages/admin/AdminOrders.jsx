import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { useToast } from '../../components/common/Toast/ToastProvider.jsx';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';

const DELIVERY = ['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED',
                  'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const pretty = (value) => (value || '').replaceAll('_', ' ').toLowerCase();

export default function AdminOrders() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [delivery, setDelivery] = useState('');
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const orders = useAdminQuery(
    () => adminApi.orders({ q, delivery, page, size: 20 }),
    [q, delivery, page]
  );

  async function advance(row, status) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await adminApi.setDeliveryStatus(row.id, status);
      orders.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Orders</h1>
        <p>Payment status is set by the gateway; only fulfilment is editable here.</p>
      </header>

      <div className="admin-filters">
        <label className="admin-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={q}
            placeholder="Order number, invoice, customer name or email"
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
          />
        </label>
        <select value={delivery} onChange={(e) => { setDelivery(e.target.value); setPage(0); }}>
          {DELIVERY.map((d) => (
            <option key={d} value={d}>{d ? pretty(d) : 'All fulfilment states'}</option>
          ))}
        </select>
      </div>

      <AdminState query={orders}>
        {(data) => data.content.length === 0 ? (
          <div className="admin-empty">
            <Icon name="truck" size={30} />
            <h3>No orders yet</h3>
            <p>Orders appear here the moment a payment is verified.</p>
          </div>
        ) : (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Invoice</th><th>Customer</th>
                    <th>Payment</th><th>Fulfilment</th><th>Total</th><th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.orderNumber}</strong></td>
                      <td className="admin-muted">{row.invoiceNumber || '—'}</td>
                      <td>
                        {row.customerName}
                        <span className="admin-sub">{row.customerEmail}</span>
                      </td>
                      <td><span className={`admin-pill is-${(row.status || '').toLowerCase()}`}>{pretty(row.status)}</span></td>
                      <td>
                        <select
                          value={row.deliveryStatus}
                          disabled={busyId === row.id}
                          onChange={(e) => advance(row, e.target.value)}
                        >
                          {DELIVERY.filter(Boolean).map((d) => (
                            <option key={d} value={d}>{pretty(d)}</option>
                          ))}
                        </select>
                      </td>
                      <td>{formatPrice(row.total)}</td>
                      <td className="admin-muted">
                        {row.placedAt ? new Date(row.placedAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} total={data.totalPages} onChange={setPage} />
          </>
        )}
      </AdminState>
    </>
  );
}

export function Pager({ page, total, onChange }) {
  if (total <= 1) return null;
  return (
    <nav className="admin-pager" aria-label="Pagination">
      <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>Page {page + 1} of {total}</span>
      <button type="button" disabled={page + 1 >= total} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
