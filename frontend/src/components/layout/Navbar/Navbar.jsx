import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

import Logo from '../../common/Logo/Logo.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import ConfirmDialog from '../../common/ConfirmDialog/ConfirmDialog.jsx';
import SearchOverlay from './SearchOverlay.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useCart } from '../../../context/CartContext.jsx';
import { useWishlist } from '../../../context/WishlistContext.jsx';
import useScrolled from '../../../hooks/useScrolled.js';
import useLockBodyScroll from '../../../hooks/useLockBodyScroll.js';
import './Navbar.css';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Plant Care', to: '/#care-tips' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const scrolled = useScrolled(40);
  const { pathname, hash } = useLocation();
  const panelRef = useRef(null);
  // Signing out is easy to hit by accident, and on this site it also puts the
  // basket away — so it asks first.
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { user, isSignedIn, logout } = useAuth();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();

  useLockBodyScroll(menuOpen);

  // Any navigation closes whatever layer is open.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname, hash]);

  // Escape closes the drawer, focus moves into it on open and returns to the burger on close.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const opener = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const timer = setTimeout(() => panelRef.current?.focus(), 60);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [menuOpen]);

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <nav className="navbar__inner container" aria-label="Primary">
          <Logo />

          <ul className="navbar__links">
            {LINKS.map(({ label, to }) => (
              <li key={label}>
                {/* Plant Care is a section of the home page, not its own route,
                    so it uses a plain Link and never shows an active state. */}
                {to.includes('#') ? (
                  <Link className="navbar__link" to={to}>
                    {label}
                  </Link>
                ) : (
                  <NavLink
                    end={to === '/'}
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                    }
                    to={to}
                  >
                    {label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>

          <div className="navbar__actions">
            <button
              type="button"
              className="navbar__icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Icon name="search" />
            </button>

            <Link className="navbar__icon-btn" to="/wishlist" aria-label="Wishlist">
              <Icon name="heart" />
              {wishlistCount > 0 && <span className="navbar__badge">{wishlistCount}</span>}
            </Link>

            <Link className="navbar__icon-btn" to="/cart" aria-label="Cart">
              <Icon name="cart" />
              {cartCount > 0 && <span className="navbar__badge">{cartCount}</span>}
            </Link>

            {isSignedIn ? (
              <button type="button" className="navbar__login" onClick={() => setConfirmingLogout(true)} title={user.email}>
                <Icon name="user" size={18} />
                <span>{user.fullName.split(' ')[0]} &middot; Sign out</span>
              </button>
            ) : (
              <Link className="navbar__login" to="/login">
                <Icon name="user" size={18} />
                <span>Login</span>
              </Link>
            )}

            <button
              type="button"
              className="navbar__burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Icon name="menu" size={26} />
            </button>
          </div>
        </nav>
      </header>

      {/* ------------------------------------------------ mobile / tablet menu */}
      <div
        className={`mobile-menu ${menuOpen ? 'mobile-menu--open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      >
        <aside
          className="mobile-menu__panel"
          ref={panelRef}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          // Only a dialog while it is actually open. Left on permanently, a
          // screen reader announces a modal that is not on screen.
          role={menuOpen ? 'dialog' : undefined}
          aria-modal={menuOpen ? 'true' : undefined}
          aria-label="Menu"
        >
          <div className="mobile-menu__head">
            <Logo />
            <button
              type="button"
              className="mobile-menu__close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              tabIndex={menuOpen ? 0 : -1}
            >
              <Icon name="close" size={24} />
            </button>
          </div>

          <ul className="mobile-menu__links">
            {LINKS.map(({ label, to }, index) => (
              <li key={label} style={{ '--i': index }}>
                {/* Closing explicitly, not relying on the route change: tapping
                    the link for the page you are already on produces no
                    navigation, so the effect above never fires and the drawer
                    stays open over the page it just "went" to. */}
                <Link to={to} tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)}>
                  <span>{label}</span>
                  <Icon name="chevronRight" size={18} />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mobile-menu__foot">
            {isSignedIn ? (
              <button type="button" className="mobile-menu__cta" onClick={() => setConfirmingLogout(true)}>
                <Icon name="user" size={18} />
                Sign out ({user.fullName.split(' ')[0]})
              </button>
            ) : (
              <Link className="mobile-menu__cta" to="/login" tabIndex={menuOpen ? 0 : -1}>
                <Icon name="user" size={18} />
                Login / Register
              </Link>
            )}
            <p>Bringing Nature to Every Home</p>
          </div>
        </aside>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

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
