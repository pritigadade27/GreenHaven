import { Link } from 'react-router-dom';

import Icon from '../../common/Icon/Icon.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import './Categories.css';

// Plants
import castIron from '../../../assets/images/plants/cast-iron-plant.jpg';
import croton from '../../../assets/images/plants/croton.jpg';
import hibiscus from '../../../assets/images/plants/hibiscus.jpg';
import jade from '../../../assets/images/plants/jade-plant.jpg';
import peaceLily from '../../../assets/images/plants/peace-lily.jpg';
// Merchandise — the branded shots, so the logo is visible on every product image
import pots from '../../../assets/images/care/terracotta-set.jpg';
import toolSet from '../../../assets/images/tools/tool-set-2.jpg';
import plantCare from '../../../assets/images/care/neem-mister.jpg';
// Our own packets, fanned into a flat lay — better than a stock photo of
// somebody else's seeds, and every packet already carries the logo.
import seedFlatlay from '../../../assets/images/care/seed-flatlay.jpg';

const IMAGES = {
  'indoor-plants': castIron,
  'outdoor-plants': croton,
  'flowering-plants': hibiscus,
  succulents: jade,
  'air-purifying': peaceLily,
  'pots-planters': pots,
  'gardening-tools': toolSet,
  seeds: seedFlatlay,
  'plant-care': plantCare,
};

export default function Categories() {
  const { CATEGORIES, countInCategory } = useCatalogue();
  const ref = useScrollReveal();

  return (
    <section className="categories section" id="categories" ref={ref}>
      <div className="container">
        <header className="section-heading section-heading--center reveal">
          <span className="eyebrow">Shop by category</span>
          <h2>Find your kind of green</h2>
          <p>
            {CATEGORIES.length} collections, from a first windowsill plant to everything a terrace needs.
            Every one comes with the care guidance to keep it alive.
          </p>
        </header>

        <div className="categories__grid">
          {CATEGORIES.map(({ slug, name, blurb }, index) => {
            const count = countInCategory(slug);
            return (
              <Link
                key={slug}
                to={`/shop?category=${slug}`}
                className={`cat-card reveal reveal--zoom delay-${(index % 6) + 1}`}
              >
                <div className="cat-card__media">
                  <img src={IMAGES[slug]} alt="" loading="lazy" />
                </div>

                <div className="cat-card__body">
                  <div className="cat-card__text">
                    <h3>{name}</h3>
                    {/* Show a real count where we have stock, the pitch where we don't —
                        never a hard-coded number that will drift out of date. */}
                    <p>{count > 0 ? `${count} product${count === 1 ? '' : 's'}` : blurb}</p>
                  </div>

                  <span className="cat-card__go" aria-hidden="true">
                    <Icon name="arrowRight" size={17} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
