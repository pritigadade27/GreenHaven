import { useEffect, useState } from 'react';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import { useToast } from '../../components/common/Toast/ToastProvider.jsx';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';
import { Pager } from './AdminOrders.jsx';

const BLANK = {
  name: '',
  slug: '',
  botanicalName: '',
  categorySlug: 'indoor-plants',
  price: '',
  mrp: '',
  stock: 0,
  image: '',
  shortDescription: '',
  description: '',
  careTip: '',
  petSafety: 'safe',
  difficulty: 'easy',
  light: 'medium',
  water: 'medium',
  featured: false,
  bestSeller: false,
  newArrival: false,
};

const PET = ['safe', 'caution', 'toxic'];
const DIFFICULTY = ['easy', 'medium', 'hard'];
const LIGHT = ['low', 'medium', 'bright', 'direct'];
const WATER = ['low', 'medium', 'high'];

export default function AdminProducts() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [categories, setCategories] = useState([]);

  const products = useAdminQuery(() => adminApi.inventory({ q, page, size: 20 }), [q, page]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const set = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  async function act(fn, success) {
    setBusy(true);
    try {
      const result = await fn();
      products.reload();
      toast.success(typeof success === 'function' ? success(result) : success);
      return result;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file) {
    if (!file) return;
    const result = await act(
      () => adminApi.uploadProductImage(file),
      'Image uploaded.'
    );
    if (result?.url) setForm((prev) => ({ ...prev, image: result.url }));
  }

  async function save(event) {
    event.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      mrp: form.mrp === '' ? null : Number(form.mrp),
      stock: Number(form.stock),
    };
    const saved = await act(
      () => (editingId ? adminApi.updateProduct(editingId, payload) : adminApi.createProduct(payload)),
      editingId ? 'Product updated.' : 'Product created.'
    );
    if (saved) {
      setForm(null);
      setEditingId(null);
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Products</h1>
        <p>
          Everything here reaches the shop immediately. A product that has been ordered cannot be
          deleted &mdash; it is discontinued instead, so invoices keep the thing they were for.
        </p>
      </header>

      <div className="admin-filters">
        <div className="admin-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={q}
            placeholder="Search by name, slug or code"
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {!form && (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setEditingId(null);
              setForm(BLANK);
            }}
          >
            <Icon name="plus" size={16} /> New product
          </button>
        )}
      </div>

      {form && (
        <form className="admin-card admin-product-form" onSubmit={save}>
          <h2>{editingId ? 'Edit product' : 'New product'}</h2>

          <div className="admin-product-form__grid">
            <label>
              <span>Name</span>
              <input value={form.name} onChange={set('name')} required maxLength={150} />
            </label>
            <label>
              <span>Botanical name</span>
              <input value={form.botanicalName} onChange={set('botanicalName')} maxLength={150} />
            </label>
            <label>
              <span>Category</span>
              <select value={form.categorySlug} onChange={set('categorySlug')}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Slug {editingId && <em>changing this breaks existing links</em>}</span>
              <input
                value={form.slug}
                onChange={set('slug')}
                placeholder={editingId ? form.slug : 'made from the name'}
              />
            </label>
            <label>
              <span>Price (₹)</span>
              <input type="number" min="1" step="1" value={form.price} onChange={set('price')} required />
            </label>
            <label>
              <span>MRP (₹)</span>
              <input type="number" min="0" step="1" value={form.mrp} onChange={set('mrp')} />
            </label>
            <label>
              <span>Stock</span>
              <input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} />
            </label>
            <label>
              <span>Pet safety</span>
              <select value={form.petSafety} onChange={set('petSafety')}>
                {PET.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Difficulty</span>
              <select value={form.difficulty} onChange={set('difficulty')}>
                {DIFFICULTY.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Light</span>
              <select value={form.light} onChange={set('light')}>
                {LIGHT.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Water</span>
              <select value={form.water} onChange={set('water')}>
                {WATER.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>

            <label className="admin-product-form__wide">
              <span>Short description</span>
              <input value={form.shortDescription} onChange={set('shortDescription')} maxLength={400} />
            </label>
            <label className="admin-product-form__wide">
              <span>Description</span>
              <textarea rows={4} value={form.description} onChange={set('description')} />
            </label>
            <label className="admin-product-form__wide">
              <span>Care tip</span>
              <input value={form.careTip} onChange={set('careTip')} maxLength={400} />
            </label>

            <div className="admin-product-form__wide admin-product-form__image">
              <span>Photograph</span>
              {form.image && <img src={form.image} alt="" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e.target.files?.[0])} />
              <small>JPEG, PNG or WebP, up to 5 MB. {form.image || 'Nothing uploaded yet.'}</small>
            </div>

            <div className="admin-product-form__wide admin-product-form__flags">
              <label>
                <input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured
              </label>
              <label>
                <input type="checkbox" checked={form.bestSeller} onChange={set('bestSeller')} /> Best
                seller
              </label>
              <label>
                <input type="checkbox" checked={form.newArrival} onChange={set('newArrival')} /> New
                arrival
              </label>
            </div>
          </div>

          <div className="admin-product-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}
            </button>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <AdminState query={products}>
        {(data) => (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Flags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="admin-product-cell">
                          {row.image && <img src={row.image.startsWith('/uploads') ? row.image : `/src/assets/images/${row.image}`} alt="" />}
                          <div>
                            {row.name}
                            <span className="admin-sub">{row.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>{row.category}</td>
                      <td>{formatPrice(row.price)}</td>
                      <td>{row.stock}</td>
                      <td>
                        {[row.featured && 'Featured', row.bestSeller && 'Best seller', row.newArrival && 'New']
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      <td className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => {
                            setEditingId(row.id);
                            setForm({
                              ...BLANK,
                              ...row,
                              mrp: row.mrp ?? '',
                              botanicalName: row.botanicalName ?? '',
                              shortDescription: row.shortDescription ?? '',
                              description: row.description ?? '',
                              careTip: row.careTip ?? '',
                              categorySlug: row.categorySlug ?? 'indoor-plants',
                            });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          disabled={busy}
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
        )}
      </AdminState>

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Delete ${removing?.name ?? 'this product'}?`}
        message="If it has ever been ordered it will be discontinued instead of deleted, so the order history and its invoices survive. You can restore it afterwards."
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        tone="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          act(() => adminApi.deleteProduct(target.id), (r) => r.message);
        }}
      />
    </>
  );
}
