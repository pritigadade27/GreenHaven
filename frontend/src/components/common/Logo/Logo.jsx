import { Link } from 'react-router-dom';

import mark from '../../../assets/logo/green-haven-logo-without-name.svg';
import './Logo.css';

/** The Green Haven lockup: botanical emblem + script wordmark. */
export default function Logo({ tone = 'dark', compact = false, className = '' }) {
  return (
    <Link
      to="/"
      className={`logo logo--${tone} ${compact ? 'logo--compact' : ''} ${className}`}
      aria-label="Green Haven — home"
    >
      <img className="logo__mark" src={mark} alt="" width="44" height="44" />
      <span className="logo__text">
        <span className="logo__name">Green Haven</span>
        <span className="logo__tagline">Bringing Nature to Every Home</span>
      </span>
    </Link>
  );
}
