import Icon from '../../components/common/Icon/Icon.jsx';
import useAdminQuery from '../../hooks/useAdminQuery.js';
import { adminApi } from '../../services/adminApi.js';
import { formatPrice } from '../../utils/format.js';
import AdminState from './AdminState.jsx';
import AdminProductStrip from './AdminProductStrip.jsx';

/** The twelve figures, and how each should read. */
const CARDS = [
  ['totalProducts', 'Products', 'leaf'],
  ['totalCategories', 'Categories', 'filter'],
  ['totalUsers', 'Customers', 'user'],
  ['totalOrders', 'Orders', 'truck'],
  ['totalRevenue', 'Revenue', 'shield', 'money'],
  ['successfulPayments', 'Payments taken', 'check'],
  ['pendingOrders', 'Pending orders', 'drop', 'warn'],
  ['cancelledOrders', 'Cancelled', 'close', 'warn'],
  ['lowStockProducts', 'Low stock', 'sun', 'warn'],
  ['outOfStockProducts', 'Out of stock', 'close', 'bad'],
  ['totalReviews', 'Reviews', 'star'],
  ['newsletterSubscribers', 'Subscribers', 'mail'],
];

export default function AdminDashboard() {
  const stats = useAdminQuery(() => adminApi.stats(), []);
  const analytics = useAdminQuery(() => adminApi.analytics(), []);

  return (
    <>
      <header className="admin-head">
        <h1>Dashboard</h1>
        <p>Every figure is counted from the database, not cached.</p>
      </header>

      <AdminState query={stats} skeleton="cards">
        {(data) => (
          <div className="admin-cards">
            {CARDS.map(([key, label, icon, tone]) => (
              <article key={key} className={`admin-card ${tone ? `is-${tone}` : ''}`}>
                <span className="admin-card__icon">
                  <Icon name={icon} size={18} />
                </span>
                <strong>
                  {tone === 'money' ? formatPrice(data[key] ?? 0) : (data[key] ?? 0)}
                </strong>
                <span className="admin-card__label">{label}</span>
              </article>
            ))}
          </div>
        )}
      </AdminState>

      <AdminProductStrip />

      <header className="admin-head admin-head--sub">
        <h2>Revenue</h2>
        <p>Captured payments per month. An unpaid order is not revenue.</p>
      </header>

      <AdminState query={analytics} skeleton="chart">
        {(data) =>
          data.monthly.length === 0 ? (
            <div className="admin-empty">
              <Icon name="shield" size={30} />
              <h3>No payments yet</h3>
              <p>
                This chart fills in as soon as the first payment is captured. It needs live
                Razorpay keys in <code>backend/.env</code>.
              </p>
            </div>
          ) : (
            <>
              <RevenueChart points={[...data.monthly].reverse()} />
              <div className="admin-split">
                <TopTable title="Top products" rows={data.topProducts} />
                <TopTable title="Top categories" rows={data.topCategories} />
              </div>
            </>
          )
        }
      </AdminState>
    </>
  );
}

/** A bar chart in plain CSS. */
function RevenueChart({ points }) {
  const peak = Math.max(...points.map((p) => Number(p.revenue) || 0), 1);

  return (
    <div className="admin-chart" role="img" aria-label="Monthly revenue">
      {points.map((point) => {
        const value = Number(point.revenue) || 0;
        return (
          <div className="admin-chart__col" key={point.month}>
            <span className="admin-chart__value">{formatPrice(value)}</span>
            <div
              className="admin-chart__bar"
              style={{ height: `${Math.max(4, (value / peak) * 100)}%` }}
            />
            <span className="admin-chart__label">{point.month}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopTable({ title, rows }) {
  return (
    <section className="admin-panel">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="admin-muted">Nothing sold yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Units</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.unitsSold}</td>
                <td>{formatPrice(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
