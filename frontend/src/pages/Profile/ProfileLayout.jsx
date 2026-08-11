import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { profileApi } from '../../services/api.js';
import { formatPrice } from '../../utils/format.js';
import './Profile.css';

const SECTIONS = [
  { to: '/profile', end: true, icon: 'user', label: 'Personal Information' },
  { to: '/profile/orders', icon: 'truck', label: 'My Orders' },
  { to: '/profile/payments', icon: 'card', label: 'Payment History' },
  { to: '/profile/wishlist', icon: 'heart', label: 'Wishlist' },
  { to: '/profile/addresses', icon: 'pin', label: 'Saved Addresses' },
  { to: '/profile/password', icon: 'lock', label: 'Change Password' },
  { to: '/profile/invoices', icon: 'file', label: 'Download Invoices' },
  { to: '/profile/notifications', icon: 'bell', label: 'Notifications' },
];

/**
 * The shell every profile screen renders inside.
 *
 * It owns the one /api/profile call, and hands both the data and a reloader to
 * its children through the Outlet context — so editing an address updates the
 * counter in the header without every screen fetching the same summary again.
 */
export default function ProfileLayout() {
  const { user, isSignedIn, ready, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const load = useCallback(
    () =>
      profileApi
        .me()
        .then((data) => {
          setProfile(data);
          setError('');
          return data;
        })
        .catch((err) => {
          setError(err.message);
          return null;
        }),
    []
  );

  useEffect(() => {
    if (!ready) return;
    if (!isSignedIn) {
      navigate('/login', {
        replace: true,
        state: { from: '/profile', reason: 'Please sign in to see your profile.' },
      });
      return;
    }
    load();
  }, [ready, isSignedIn, navigate, load]);

  const context = useMemo(() => ({ profile, reload: load }), [profile, load]);

  const initials = (profile?.fullName || user?.fullName || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <h1 className="sr-only">My profile</h1>

      <section className="section profile">
        <div className="container">
          <header className="profile__hero">
            <span className="profile__avatar" aria-hidden="true">
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials}
            </span>

            <div className="profile__greeting">
              {profile ? (
                <>
                  <h2>{profile.fullName}</h2>
                  <p>{profile.email}</p>
                </>
              ) : (
                <>
                  <span className="skeleton" style={{ width: 200, height: 24 }} />
                  <span className="skeleton" style={{ width: 260, height: 14, marginTop: 10 }} />
                </>
              )}
            </div>

            <dl className="profile__stats">
              <div>
                <dt>Orders</dt>
                <dd>{profile ? profile.totalOrders : '—'}</dd>
              </div>
              <div>
                <dt>Spent</dt>
                <dd>{profile ? formatPrice(profile.totalSpent) : '—'}</dd>
              </div>
              <div>
                <dt>Wishlist</dt>
                <dd>{profile ? profile.wishlistItems : '—'}</dd>
              </div>
            </dl>
          </header>

          {error && (
            <p className="profile__error" role="alert">
              <Icon name="shield" size={16} /> {error}
            </p>
          )}

          <div className="profile__grid">
            <nav className="profile__nav" aria-label="Profile sections">
              <ul>
                {SECTIONS.map(({ to, end, icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                    >
                      <Icon name={icon} size={18} />
                      <span>{label}</span>
                      {to === '/profile/notifications' && profile?.unreadNotifications > 0 && (
                        <em className="profile__pip">{profile.unreadNotifications}</em>
                      )}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={() => setConfirmingLogout(true)}>
                    <Icon name="signOut" size={18} />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </nav>

            <div className="profile__panel">
              <Outlet context={context} />
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        message="Your cart and wishlist are saved to your account — they will be waiting when you sign back in."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => {
          setConfirmingLogout(false);
          logout();
        }}
      />
    </>
  );
}
