import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { adminAuthApi } from '../../services/adminApi.js';
import AdminState from './AdminState.jsx';
import { Pager } from './AdminOrders.jsx';

export default function AdminActivity() {
  const [page, setPage] = useState(0);
  const log = useAdminQuery(() => adminAuthApi.activity({ page, size: 30 }), [page]);

  return (
    <>
      <header className="admin-head">
        <h1>Activity log</h1>
        <p>Every sign-in and every change, with who made it and from where.</p>
      </header>

      <AdminState query={log}>
        {(data) => data.content.length === 0 ? (
          <div className="admin-empty">
            <Icon name="filter" size={30} />
            <h3>Nothing recorded yet</h3>
          </div>
        ) : (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id}>
                      <td className="admin-muted">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td>
                        {row.adminName}
                        <span className="admin-sub">{row.adminEmail}</span>
                      </td>
                      <td>
                        <span className={`admin-pill is-${row.action.includes('FAILED') ? 'failed' : 'muted'}`}>
                          {row.action.replaceAll('_', ' ').toLowerCase()}
                        </span>
                      </td>
                      <td>
                        {row.detail || '—'}
                        {row.entityId && <span className="admin-sub">{row.entityType} {row.entityId}</span>}
                      </td>
                      <td className="admin-mono admin-muted">{row.ipAddress || '—'}</td>
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
