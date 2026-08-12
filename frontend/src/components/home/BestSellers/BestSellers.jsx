import ProductCard from '../../product/ProductCard/ProductCard.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import './BestSellers.css';

export default function BestSellers() {
  const { getBestSellers } = useCatalogue();
  const ref = useScrollReveal();
  const plants = [...getBestSellers()]
    .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
    .slice(0, 4);

  return (
    <section className="bestsellers section section--tint" id="best-sellers" ref={ref}>
      <div className="container">
        <header className="section-heading section-heading--center reveal">
          <span className="eyebrow">Most loved</span>
          <h2>Best Sellers</h2>
          <p>The four that leave the nursery faster than we can grow them.</p>
        </header>

        <div className="bestsellers__grid">
          {plants.map((plant, index) => (
            <div key={plant.id} className={`reveal reveal--up delay-${index + 1}`}>
              <ProductCard plant={plant} rank={index + 1} />
            </div>
          ))}
        </div>

        <ul className="bestsellers__promise reveal">
          <li>
            <Icon name="truck" size={20} />
            <div>
              <strong>Free delivery over ₹999</strong>
              <span>Packed to survive the journey</span>
            </div>
          </li>
          <li>
            <Icon name="shield" size={20} />
            <div>
              <strong>30-day plant promise</strong>
              <span>Arrives unhappy? We replace it</span>
            </div>
          </li>
          <li>
            <Icon name="leaf" size={20} />
            <div>
              <strong>Care card with every plant</strong>
              <span>Light, water and feeding, written down</span>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
