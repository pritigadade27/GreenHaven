import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../../common/Icon/Icon.jsx';

const ITEMS = [
  { to: '/profile', icon: 'user', label: 'My Profile' },
  { to: '/profile/orders', icon: 'truck', label: 'My Orders' },
  { to: '/profile/payments', icon: 'card', label: 'Payment History' },
  { to: '/profile/wishlist', icon: 'heart', label: 'Wishlist' },
  { to: '/profile/addresses', icon: 'pin', label: 'Saved Addresses' },
  { to: '/profile/password', icon: 'lock', label: 'Change Password' },
];

/**
 * The signed-in customer's menu.
 *
 * A button rather than a link on purpose: the profile has seven destinations,
 * and making the avatar itself navigate would hide six of them behind a page
 * load. Sign out stays in here too, so it is never a stray click away.
 */
export default function ProfileMenu({ user, unread = 0, onSignOut }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const first = user.fullName?.trim().split(' ')[0] || 'Account';
  const initials = user.fullName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        type="button"
        ref={buttonRef}
        className={`profile-menu__trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={user.email}
      >
        <span className="profile-menu__avatar" aria-hidden="true">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials || <Icon name="user" size={16} />}
        </span>
        <span className="profile-menu__name">{first}</span>
        <Icon name="chevronDown" size={16} className="profile-menu__caret" />
        {unread > 0 && <span className="navbar__badge">{unread}</span>}
      </button>

      {open && (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__head">
            <span className="profile-menu__avatar profile-menu__avatar--lg" aria-hidden="true">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
            </span>
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <ul>
            {ITEMS.map(({ to, icon, label }) => (
              <li key={to}>
                <Link to={to} role="menuitem" onClick={() => setOpen(false)}>
                  <Icon name={icon} size={17} />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/profile/notifications" role="menuitem" onClick={() => setOpen(false)}>
                <Icon name="bell" size={17} />
                Notifications
                {unread > 0 && <em className="profile-menu__pip">{unread}</em>}
              </Link>
            </li>
          </ul>

          <button
            type="button"
            className="profile-menu__signout"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <Icon name="signOut" size={17} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
