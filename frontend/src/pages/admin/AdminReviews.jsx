import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { useToast } from '../../components/common/Toast/ToastProvider.jsx';
import { adminApi } from '../../services/adminApi.js';
import AdminState from './AdminState.jsx';
import { Pager } from './AdminOrders.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';

const STATUSES = ['', 'APPROVED', 'HIDDEN', 'PENDING', 'REJECTED'];

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminReviews() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [removing, setRemoving] = useState(null);
  // Which review is having a hide reason typed for it.
  const [hiding, setHiding] = useState(null);
  const [reason, setReason] = useState('Inappropriate content');
  const reviews = useAdminQuery(() => adminApi.reviews({ status, page, size: 20 }), [status, page]);

  async function act(row, fn) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await fn();
      reviews.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Reviews</h1>
        <p>
          Reviews come from customers who had the plant delivered, so they publish straight away.
          Hiding one takes it off the shop and out of the product&rsquo;s average without
          destroying what the customer wrote.
        </p>
      </header>

      <div className="admin-filters">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || 'All reviews'}
            </option>
          ))}
        </select>
      </div>

      <AdminState query={reviews}>
        {(data) =>
          data.content.length === 0 ? (
            <div className="admin-empty">
              <Icon name="star" size={30} />
              <h3>No reviews yet</h3>
              <p>
                Once a customer receives a plant and writes about it, their review appears here.
              </p>
            </div>
          ) : (
            <>
              <div className="admin-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Rating</th>
                      <th>Review</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.productName}
                          {row.orderNumber && <span className="admin-sub">{row.orderNumber}</span>}
                        </td>
                        <td>
                          {row.customerName}
                          <span className="admin-sub">{row.customerEmail}</span>
                          {row.verifiedPurchase && (
                            <span className="admin-pill is-approved">Verified</span>
                          )}
                        </td>
                        <td>
                          {/* Ratings come in halves, so the glyphs are drawn from the whole part and the remainder is stated. */}
                          {'★'.repeat(Math.floor(row.rating))}
                          <span className="admin-muted">
                            {'★'.repeat(5 - Math.ceil(row.rating))}
                          </span>
                          <span className="admin-sub">{Number(row.rating)} of 5</span>
                        </td>
                        <td>
                          {row.title && <strong>{row.title}</strong>}
                          <span className="admin-sub">{row.body}</span>
                          {row.images?.length > 0 && (
                            /* Shown because a photograph is the part of a review most likely to need taking down, and it. */
                            <span className="admin-review-photos">
                              {row.images.map((url, index) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt={`Review photograph ${index + 1}`} loading="lazy" />
                                </a>
                              ))}
                            </span>
                          )}
                          {row.hiddenReason && (
                            <span className="admin-sub">Hidden: {row.hiddenReason}</span>
                          )}
                        </td>
                        <td>
                          {formatDate(row.createdAt)}
                          {row.updatedAt && <span className="admin-sub">edited</span>}
                        </td>
                        <td>
                          <span className={`admin-pill is-${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="admin-actions">
                          {row.status === 'APPROVED' ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost"
                              disabled={busyId === row.id}
                              onClick={() => {
                                setReason('Inappropriate content');
                                setHiding(row);
                              }}
                            >
                              Hide
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost"
                              disabled={busyId === row.id}
                              onClick={() =>
                                act(row, () => adminApi.setReviewStatus(row.id, 'APPROVED'))
                              }
                            >
                              {row.status === 'HIDDEN' ? 'Unhide' : 'Approve'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            disabled={busyId === row.id}
                            onClick={() => setRemoving(row)}
                          >
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
          )
        }
      </AdminState>

      {hiding && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Hide review">
          <form
            className="admin-modal__card"
            onSubmit={(e) => {
              e.preventDefault();
              const row = hiding;
              setHiding(null);
              act(row, () => adminApi.setReviewStatus(row.id, 'HIDDEN', reason));
            }}
          >
            <h2>Hide this review</h2>
            <p>
              It comes off the product page and out of the average, and the customer&rsquo;s words
              are kept. Only admins see the reason.
            </p>
            <label>
              <span>Reason</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} autoFocus />
            </label>
            <div className="admin-modal__actions">
              <button type="submit" className="admin-btn admin-btn--primary">Hide it</button>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setHiding(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this review permanently?"
        message="Hiding a review is reversible and keeps what the customer wrote. Deleting is not."
        confirmLabel="Delete it"
        cancelLabel="Cancel"
        tone="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const row = removing;
          setRemoving(null);
          act(row, () => adminApi.deleteReview(row.id));
        }}
      />
    </>
  );
}
