import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Icon from '../../common/Icon/Icon.jsx';
import useLockBodyScroll from '../../../hooks/useLockBodyScroll.js';
import './SearchOverlay.css';

const SUGGESTIONS = [
  'Monstera Deliciosa',
  'Fiddle Leaf Fig',
  'Snake Plant',
  'Succulents',
  'Ceramic Planters',
  'Air Purifying Plants',
];

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const opener = useRef(null);
  const navigate = useNavigate();

  const close = useRef(onClose);
  close.current = onClose;

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return undefined;

    opener.current = document.activeElement;
    const timer = setTimeout(() => inputRef.current?.focus(), 120);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        close.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open]);

  const runSearch = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
    setQuery('');
    onClose();
  };

  return (
    <div
      className={`search-overlay ${open ? 'search-overlay--open' : ''}`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className="search-overlay__panel"
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="container">
          <form
            className="search-overlay__form"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(query);
            }}
            role="search"
          >
            <Icon name="search" size={26} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search plants, pots, seeds…"
              aria-label="Search the Green Haven catalogue"
              tabIndex={open ? 0 : -1}
            />
            <button
              type="button"
              className="search-overlay__close"
              onClick={onClose}
              aria-label="Close search"
              tabIndex={open ? 0 : -1}
            >
              <Icon name="close" size={24} />
            </button>
          </form>

          <div className="search-overlay__suggestions">
            <span className="eyebrow">Popular right now</span>
            <ul>
              {SUGGESTIONS.map((term) => (
                <li key={term}>
                  <button type="button" onClick={() => runSearch(term)} tabIndex={open ? 0 : -1}>
                    {term}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
