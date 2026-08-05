import { Link, useLocation } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useCatalogue } from '../../context/CatalogueContext.jsx';
import './NotFound.css';

/** A real 404. */
export default function NotFound() {
  const { CATEGORIES } = useCatalogue();
  const { pathname } = useLocation();

  return (
    <section className="notfound">
      <div className="container notfound__inner">
        <span className="notfound__mark">
          <Icon name="leaf" size={40} />
        </span>

        <p className="eyebrow">404 — page not found</p>
        <h1>This one didn&rsquo;t take root</h1>
        <p className="notfound__lede">
          Nothing lives at <code>{pathname}</code>. The link may be old, or there may be a typo in
          it. Everything else is still here.
        </p>

        <div className="notfound__actions">
          <Button to="/shop" size="lg" icon="arrowRight">
            Browse the shop
          </Button>
          <Button to="/" variant="outline" size="lg">
            Back to home
          </Button>
        </div>

        <nav className="notfound__cats" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/shop?category=${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
