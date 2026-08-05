import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';
import { Pager } from './AdminOrders.jsx';

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const users = useAdminQuery(() => adminApi.users({ q, page, size: 20 }), [q, page]);

  async function toggle(row) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await adminApi.setBlocked(row.id, !row.blocked);
      users.reload();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Customers</h1>
        <p>A blocked account keeps its order history but cannot sign in or buy.</p>
      </header>

      <div className="admin-filters">
        <label className="admin-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={q}
            placeholder="Name or email"
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
          />
        </label>
      </div>

      <AdminState query={users}>
        {(data) => (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th><th>Phone</th><th>Role</th>
                    <th>Orders</th><th>Spent</th><th>Joined</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id} className={row.blocked ? 'is-blocked' : ''}>
                      <td>
                        {row.fullName}
                        <span className="admin-sub">{row.email}</span>
                      </td>
                      <td className="admin-muted">{row.phone || '—'}</td>
                      <td>
                        <span className={`admin-pill is-${row.role === 'ADMIN' ? 'paid' : 'muted'}`}>
                          {row.role}
                        </span>
                      </td>
                      <td>{row.totalOrders}</td>
                      <td>{formatPrice(row.totalSpent)}</td>
                      <td className="admin-muted">
                        {row.registeredAt ? new Date(row.registeredAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        {row.role !== 'ADMIN' && (
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            disabled={busyId === row.id}
                            onClick={() => toggle(row)}
                          >
                            {row.blocked ? 'Unblock' : 'Block'}
                          </button>
                        )}
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
