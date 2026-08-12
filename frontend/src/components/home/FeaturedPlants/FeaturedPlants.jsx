import ProductCard from '../../product/ProductCard/ProductCard.jsx';
import Button from '../../common/Button/Button.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import './FeaturedPlants.css';

export default function FeaturedPlants() {
  const { getFeatured, CATALOGUE } = useCatalogue();
  const ref = useScrollReveal();
  const plants = getFeatured().slice(0, 4);

  return (
    <section className="featured section" id="featured" ref={ref}>
      <div className="container">
        <header className="featured__head reveal">
          <div>
            <span className="eyebrow">Handpicked this month</span>
            <h2>Featured Plants</h2>
          </div>
          <p>
            Eight we would happily put in our own homes — chosen for how they look and how
            forgiving they are, not for what needs shifting.
          </p>
        </header>

        <div className="featured__grid">
          {plants.map((plant, index) => (
            <div key={plant.id} className={`reveal reveal--up delay-${(index % 4) + 1}`}>
              <ProductCard plant={plant} />
            </div>
          ))}
        </div>

        <div className="featured__more reveal">
          <Button to="/shop" variant="outline" size="lg" icon="arrowRight">
            View all {CATALOGUE.length} products
          </Button>
        </div>
      </div>
    </section>
  );
}
