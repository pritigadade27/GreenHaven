import { Link } from 'react-router-dom';

import Icon from '../Icon/Icon.jsx';
import './PageHeader.css';

/** The banner every inner page opens with: breadcrumb, title, optional lede. */
export default function PageHeader({ title, lede, crumb, children }) {
  return (
    <header className="page-header">
      <div className="container">
        {crumb && (
          <nav className="page-header__crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <Icon name="chevronRight" size={13} />
            <span>{crumb}</span>
          </nav>
        )}

        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
        {children}
      </div>
    </header>
  );
}
