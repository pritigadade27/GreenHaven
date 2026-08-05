import { Link } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { adminApi } from '../../services/adminApi.js';
import { resolveImage } from '../../utils/productImages.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';

/**
 * A row of products with their photographs.
 *
 * Shows what needs restocking first — an admin recognises a plant by its
 * picture far faster than by a slug, and stock is the one number worth acting
 * on today. When nothing is short it falls back to the newest products, so the
 * panel is never an empty box.
 */
export default function AdminProductStrip() {
  const low = useAdminQuery(() => adminApi.inventory({ filter: 'low', size: 6 }), []);
  const recent = useAdminQuery(() => adminApi.inventory({ filter: 'recent', size: 6 }), []);

  const query = low.data && low.data.content.length > 0 ? low : recent;
  const needsRestock = Boolean(low.data && low.data.content.length > 0);

  return (
    <>
      <header className="admin-head admin-head--sub">
        <h2>{needsRestock ? 'Running low' : 'Recently added'}</h2>
        <p>
          {needsRestock
            ? 'Five or fewer left. Tap through to set a new figure.'
            : 'Nothing is short of stock, so here is what went into the catalogue last.'}
        </p>
      </header>

      <AdminState query={query}>
        {(data) =>
          data.content.length === 0 ? (
            <div className="admin-empty">
              <Icon name="cart" size={30} />
              <h3>No products yet</h3>
            </div>
          ) : (
            <div className="admin-strip">
              {data.content.map((p) => (
                <Link key={p.id} to="/admin/inventory" className="admin-strip__card">
                  <img src={resolveImage(p.image)} alt="" loading="lazy" />
                  <div className="admin-strip__body">
                    <strong>{p.name}</strong>
                    <span>{p.category}</span>
                    <div className="admin-strip__foot">
                      <span className={`admin-pill is-${p.stockStatus.toLowerCase().replaceAll('_', '-')}`}>
                        {p.stock} left
                      </span>
                      <em>{formatPrice(p.price)}</em>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        }
      </AdminState>
    </>
  );
}
