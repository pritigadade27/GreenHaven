import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';

const NAV = [
  ['/admin/dashboard', 'Dashboard', 'leaf'],
  ['/admin/orders', 'Orders', 'truck'],
  ['/admin/payments', 'Payments', 'shield'],
  ['/admin/inventory', 'Inventory', 'cart'],
  ['/admin/users', 'Customers', 'user'],
  ['/admin/reviews', 'Reviews', 'star'],
  ['/admin/activity', 'Activity log', 'filter'],
];

/** The dashboard shell. */
export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Signing out here revokes the server-side session, so a mis-click means
  // signing in again — worth one question.
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={`admin ${menuOpen ? 'admin--menu' : ''}`}>
      <aside className="admin__side">
        <div className="admin__brand">
          <span className="admin__brand-mark">
            <Icon name="leaf" size={19} />
          </span>
          <div>
            <strong>Green Haven</strong>
            <span>Staff dashboard</span>
          </div>
        </div>

        <nav className="admin__nav" aria-label="Dashboard">
          {NAV.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={icon} size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="admin__who">
          <div>
            <strong>{admin?.fullName}</strong>
            <span>{admin?.email}</span>
          </div>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setConfirmingLogout(true)}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin__main">
        <header className="admin__top">
          <button
            type="button"
            className="admin__burger"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
          <span className="admin__top-title">Green Haven</span>
          <button
            type="button"
            className="admin-btn admin-btn--ghost admin__top-out"
            onClick={() => setConfirmingLogout(true)}
          >
            Sign out
          </button>
        </header>

        <main className="admin__content">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out of the dashboard?"
        message="This ends your session on this device. You will need to sign in again to return."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => {
          setConfirmingLogout(false);
          logout();
        }}
      />

      {/* Tapping the dimmed area closes the drawer on a phone. */}
      {menuOpen && (
        <button
          type="button"
          className="admin__scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
