import { Link } from 'react-router-dom';

import Logo from '../../common/Logo/Logo.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import './Footer.css';

const QUICK_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop All Plants', to: '/shop' },
  { label: 'Plant Care', to: '/#care-tips' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Wishlist', to: '/wishlist' },
  { label: 'Cart', to: '/cart' },
];

const SOCIAL = [
  { name: 'instagram', label: 'Instagram' },
  { name: 'facebook', label: 'Facebook' },
  { name: 'pinterest', label: 'Pinterest' },
  { name: 'youtube', label: 'YouTube' },
  { name: 'whatsapp', label: 'WhatsApp' },
];

export default function Footer() {
  const { CATEGORIES } = useCatalogue();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo tone="light" />
          <p>
            A premium online garden centre. We grow our own, label what is toxic, and send a care
            card with every plant so it survives its first six weeks.
          </p>

          <ul className="footer__social">
            {SOCIAL.map(({ name, label }) => (
              <li key={name}>
                <a href="#" aria-label={label} title={label}>
                  <Icon name={name} size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav className="footer__col" aria-label="Quick links">
          <h3>Quick Links</h3>
          <ul>
            {QUICK_LINKS.map(({ label, to }) => (
              <li key={label}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer__col" aria-label="Categories">
          <h3>Categories</h3>
          <ul>
            {CATEGORIES.map(({ slug, name }) => (
              <li key={slug}>
                <Link to={`/shop?category=${slug}`}>{name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__col footer__contact">
          <h3>Visit the Nursery</h3>
          <ul>
            <li>
              <Icon name="pin" size={17} />
              <span>Green Haven</span>
            </li>
            <li>
              <Icon name="phone" size={17} />
              <a href="tel:+919000000000">+91 90000 00000</a>
            </li>
            <li>
              <Icon name="mail" size={17} />
              <a href="mailto:hello@greenhaven.in">hello@greenhaven.in</a>
            </li>
          </ul>
          <p className="footer__hours">Open Tue&ndash;Sun, 9am&ndash;7pm</p>
        </div>
      </div>

      <div className="footer__bar">
        <div className="container footer__bar-inner">
          <p>&copy; {year} Green Haven. All rights reserved.</p>
          <p className="footer__tag">Bringing Nature to Every Home</p>
          <ul>
            <li>
              <Link to="/about">Privacy</Link>
            </li>
            <li>
              <Link to="/about">Terms</Link>
            </li>
            <li>
              <Link to="/contact">Shipping</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
