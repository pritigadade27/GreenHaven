import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';
import { resolveImage } from '../../utils/productImages.js';
import { Pager } from './AdminOrders.jsx';

const FILTERS = [['', 'All products'], ['low', 'Low stock'], ['out', 'Out of stock'],
                 ['recent', 'Recently added']];

export default function AdminInventory() {
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [savingId, setSavingId] = useState(null);

  const items = useAdminQuery(
    () => adminApi.inventory({ filter, q, page, size: 20 }),
    [filter, q, page]
  );

  async function save(row, value) {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0 || next === row.stock) return;
    setSavingId(row.id);
    try {
      await adminApi.setStock(row.id, next);
      items.reload();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Inventory</h1>
        <p>
          Stock status is derived, never stored: 0 is out of stock, 5 or fewer is low. Changing
          a figure here writes straight to the catalogue.
        </p>
      </header>

      <div className="admin-filters">
        <label className="admin-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={q}
            placeholder="Product name, slug or code"
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
          />
        </label>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
          {FILTERS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <AdminState query={items}>
        {(data) => data.content.length === 0 ? (
          <div className="admin-empty">
            <Icon name="cart" size={30} />
            <h3>Nothing matches</h3>
            <p>Try a different search or clear the filter.</p>
          </div>
        ) : (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th><th>Product</th><th>Category</th><th>Price</th>
                    <th>Stock</th><th>Status</th><th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id}>
                      <td className="admin-thumb-cell">
                        <img className="admin-thumb" src={resolveImage(row.image)} alt="" loading="lazy" />
                      </td>
                      <td>
                        {row.name}
                        <span className="admin-sub">{row.code} · {row.slug}</span>
                      </td>
                      <td className="admin-muted">{row.category}</td>
                      <td>{formatPrice(row.price)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="admin-stock"
                          defaultValue={row.stock ?? 0}
                          disabled={savingId === row.id}
                          onBlur={(e) => save(row, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        />
                      </td>
                      <td>
                        <span className={`admin-pill is-${row.stockStatus.toLowerCase().replaceAll('_','-')}`}>
                          {row.stockStatus.replaceAll('_', ' ').toLowerCase()}
                        </span>
                      </td>
                      <td className="admin-muted">
                        {[row.featured && 'Featured', row.bestSeller && 'Best seller',
                          row.newArrival && 'New'].filter(Boolean).join(', ') || '—'}
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
