import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';
import { Pager } from './AdminOrders.jsx';

const STATUSES = ['', 'PENDING', 'APPROVED', 'REJECTED'];

export default function AdminReviews() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const reviews = useAdminQuery(() => adminApi.reviews({ status, page, size: 20 }), [status, page]);

  async function act(row, fn) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await fn();
      reviews.reload();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Reviews</h1>
        <p>New reviews stay pending until approved, so the shop cannot be defaced.</p>
      </header>

      <div className="admin-filters">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All reviews'}</option>)}
        </select>
      </div>

      <AdminState query={reviews}>
        {(data) => data.content.length === 0 ? (
          <div className="admin-empty">
            <Icon name="star" size={30} />
            <h3>No reviews yet</h3>
            <p>Customer reviews will appear here for approval before they reach the shop.</p>
          </div>
        ) : (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id}>
                      <td>{row.productName}</td>
                      <td>{row.customerName}</td>
                      <td>{'★'.repeat(row.rating)}<span className="admin-muted">{'★'.repeat(5 - row.rating)}</span></td>
                      <td>
                        {row.title && <strong>{row.title}</strong>}
                        <span className="admin-sub">{row.body}</span>
                      </td>
                      <td><span className={`admin-pill is-${row.status.toLowerCase()}`}>{row.status}</span></td>
                      <td className="admin-actions">
                        {row.status !== 'APPROVED' && (
                          <button type="button" className="admin-btn admin-btn--ghost" disabled={busyId === row.id}
                            onClick={() => act(row, () => adminApi.setReviewStatus(row.id, 'APPROVED'))}>
                            Approve
                          </button>
                        )}
                        <button type="button" className="admin-btn admin-btn--danger" disabled={busyId === row.id}
                          onClick={() => {
                            if (window.confirm('Delete this review permanently?')) {
                              act(row, () => adminApi.deleteReview(row.id));
                            }
                          }}>
                          Delete
                        </button>
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
