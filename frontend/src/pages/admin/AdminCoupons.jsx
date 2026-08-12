import { useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { useToast } from '../../components/common/Toast/ToastProvider.jsx';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';
import { Pager } from './AdminOrders.jsx';

const BLANK = {
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  maxDiscount: '',
  minOrderValue: '',
  freeShipping: false,
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  perUserLimit: '1',
  active: true,
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** A datetime-local value ("2026-08-20T18:30") as an instant the API accepts. */
const toInstant = (local) => (local ? new Date(local).toISOString() : null);

/** And back again, for the edit form. */
const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminCoupons() {
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const coupons = useAdminQuery(() => adminApi.coupons({ page, size: 20 }), [page]);

  const set = (key) => (event) =>
    setForm((f) => ({
      ...f,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));

  function edit(row) {
    setEditingId(row.id);
    setForm({
      code: row.code,
      description: row.description ?? '',
      discountType: row.discountType,
      discountValue: String(row.discountValue ?? ''),
      maxDiscount: row.maxDiscount === null ? '' : String(row.maxDiscount),
      minOrderValue: row.minOrderValue === null ? '' : String(row.minOrderValue),
      freeShipping: row.freeShipping,
      startsAt: toLocal(row.startsAt),
      expiresAt: toLocal(row.expiresAt),
      usageLimit: row.usageLimit === null ? '' : String(row.usageLimit),
      perUserLimit: String(row.perUserLimit ?? 1),
      active: row.active,
    });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const body = {
        code: form.code.trim(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        // Empty means "no ceiling", which is not the same as zero — so these go as null rather than being.
        maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
        minOrderValue: form.minOrderValue === '' ? 0 : Number(form.minOrderValue),
        freeShipping: form.freeShipping,
        startsAt: toInstant(form.startsAt),
        expiresAt: toInstant(form.expiresAt),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        perUserLimit: form.perUserLimit === '' ? 1 : Number(form.perUserLimit),
        active: form.active,
      };
      if (editingId) await adminApi.updateCoupon(editingId, body);
      else await adminApi.createCoupon(body);
      toast.success(editingId ? 'Coupon updated.' : `${body.code} is ready to use.`);
      setForm(null);
      setEditingId(null);
      coupons.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await adminApi.setCouponState(row.id, !row.active);
      coupons.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Discount codes</h1>
        <p>
          A code is turned off rather than deleted &mdash; orders point at the code they used, and
          an invoice should still say what came off it years later.
        </p>
      </header>

      <div className="admin-filters">
        {!form && (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setEditingId(null);
              setForm(BLANK);
            }}
          >
            <Icon name="plus" size={16} /> New code
          </button>
        )}
      </div>

      {form && (
        <form className="admin-card admin-product-form" onSubmit={save}>
          <h2>{editingId ? `Edit ${form.code}` : 'New discount code'}</h2>

          <div className="admin-product-form__grid">
            <label>
              <span>Code {editingId && <em>customers already have the old one</em>}</span>
              <input
                value={form.code}
                onChange={set('code')}
                required
                maxLength={40}
                style={{ textTransform: 'uppercase' }}
              />
            </label>
            <label>
              <span>Description &mdash; the customer sees this</span>
              <input
                value={form.description}
                onChange={set('description')}
                maxLength={200}
                placeholder="Spring sale"
              />
            </label>

            <label>
              <span>Type</span>
              <select value={form.discountType} onChange={set('discountType')}>
                <option value="PERCENT">Percentage off</option>
                <option value="FLAT">Fixed amount off</option>
              </select>
            </label>
            <label>
              <span>{form.discountType === 'PERCENT' ? 'Percent off' : 'Rupees off'}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={form.discountType === 'PERCENT' ? '100' : undefined}
                value={form.discountValue}
                onChange={set('discountValue')}
                required
              />
            </label>

            <label>
              <span>Cap the discount at</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.maxDiscount}
                onChange={set('maxDiscount')}
                placeholder="No cap"
              />
            </label>
            <label>
              <span>Minimum basket</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minOrderValue}
                onChange={set('minOrderValue')}
                placeholder="0"
              />
            </label>

            <label>
              <span>Starts</span>
              <input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
            </label>
            <label>
              <span>Expires</span>
              <input type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} />
            </label>

            <label>
              <span>Total uses</span>
              <input
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={set('usageLimit')}
                placeholder="Unlimited"
              />
            </label>
            <label>
              <span>Uses per customer</span>
              <input
                type="number"
                min="1"
                value={form.perUserLimit}
                onChange={set('perUserLimit')}
                required
              />
            </label>

            <div className="admin-product-form__wide admin-product-form__flags">
              <label>
                <input type="checkbox" checked={form.freeShipping} onChange={set('freeShipping')} />{' '}
                Also make delivery free
              </label>
              <label>
                <input type="checkbox" checked={form.active} onChange={set('active')} /> Available to
                customers
              </label>
            </div>
          </div>

          <div className="admin-product-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create code'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <AdminState query={coupons}>
        {(data) => (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Takes off</th>
                    <th>Conditions</th>
                    <th>Used</th>
                    <th>Given away</th>
                    <th>State</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.code}</strong>
                        {row.description && <span className="admin-sub">{row.description}</span>}
                      </td>
                      <td>
                        {row.discountType === 'PERCENT'
                          ? `${Number(row.discountValue)}%`
                          : formatPrice(row.discountValue)}
                        {row.maxDiscount !== null && (
                          <span className="admin-sub">up to {formatPrice(row.maxDiscount)}</span>
                        )}
                        {row.freeShipping && <span className="admin-sub">+ free delivery</span>}
                      </td>
                      <td>
                        {Number(row.minOrderValue) > 0 && (
                          <span className="admin-sub">min {formatPrice(row.minOrderValue)}</span>
                        )}
                        <span className="admin-sub">
                          {row.perUserLimit === 1 ? 'once each' : `${row.perUserLimit}× each`}
                        </span>
                        {row.expiresAt && (
                          <span className="admin-sub">until {formatDate(row.expiresAt)}</span>
                        )}
                      </td>
                      <td>
                        {row.timesUsed}
                        {row.usageLimit !== null && (
                          <span className="admin-muted"> / {row.usageLimit}</span>
                        )}
                      </td>
                      <td>{formatPrice(row.givenAway)}</td>
                      <td>
                        <span className={`admin-pill is-${row.state.toLowerCase()}`}>
                          {row.state}
                        </span>
                      </td>
                      <td className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => edit(row)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          disabled={busyId === row.id}
                          onClick={() => toggle(row)}
                        >
                          {row.active ? 'Turn off' : 'Turn on'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data} onPage={setPage} />
          </>
        )}
      </AdminState>
    </>
  );
}
