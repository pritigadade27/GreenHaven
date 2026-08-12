import { Link } from 'react-router-dom';

import ProductCard from '../../product/ProductCard/ProductCard.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import './NewArrivals.css';

export default function NewArrivals() {
  const ref = useScrollReveal();
  const { CATALOGUE } = useCatalogue();

  const arrivals = CATALOGUE.filter((p) => p.newArrival).slice(0, 4);
  if (arrivals.length === 0) return null;

  return (
    <section className="new-arrivals section" ref={ref}>
      <div className="container">
        <header className="section-heading reveal">
          <div>
            <span className="eyebrow">Just in</span>
            <h2>New arrivals</h2>
            <p>The latest to reach the nursery benches, still settling in.</p>
          </div>
          <Link className="new-arrivals__all" to="/shop?newArrival=true">
            See everything new <Icon name="arrowRight" size={17} />
          </Link>
        </header>

        <div className="new-arrivals__grid">
          {arrivals.map((plant, index) => (
            <div key={plant.id} className={`reveal reveal--up delay-${index + 1}`}>
              <ProductCard plant={plant} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
