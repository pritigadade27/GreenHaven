import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';
import { Pager } from './AdminOrders.jsx';

const STATUSES = ['', 'CAPTURED', 'FAILED', 'CREATED'];

export default function AdminPayments() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const payments = useAdminQuery(() => adminApi.payments({ status, page, size: 20 }), [status, page]);

  return (
    <>
      <header className="admin-head">
        <h1>Payments</h1>
        <p>
          Every attempt, not just the successful ones. <strong>Status</strong> is what Razorpay
          reported; <strong>verified</strong> is what our own signature check concluded.
        </p>
      </header>

      <div className="admin-filters">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All payments'}</option>
          ))}
        </select>
      </div>

      <AdminState query={payments}>
        {(data) => data.content.length === 0 ? (
          <div className="admin-empty">
            <Icon name="shield" size={30} />
            <h3>No payments recorded</h3>
            <p>Add live Razorpay keys to <code>backend/.env</code> to start taking payments.</p>
          </div>
        ) : (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Invoice</th><th>Customer</th><th>Razorpay payment</th>
                    <th>Method</th><th>Amount</th><th>Status</th><th>Verified</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.orderNumber || '—'}</strong></td>
                      <td className="admin-muted">{row.invoiceNumber || '—'}</td>
                      <td>{row.customerName || '—'}</td>
                      <td className="admin-mono">{row.razorpayPaymentId || '—'}</td>
                      <td>{row.method || '—'}</td>
                      <td>{formatPrice(row.amount)}</td>
                      <td><span className={`admin-pill is-${(row.status || '').toLowerCase()}`}>{row.status}</span></td>
                      <td>
                        <span className={`admin-pill is-${row.verificationStatus === 'VERIFIED' ? 'paid' : 'failed'}`}>
                          {row.verificationStatus}
                        </span>
                        {row.failureReason && <span className="admin-sub">{row.failureReason}</span>}
                      </td>
                      <td className="admin-muted">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '—'}
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
