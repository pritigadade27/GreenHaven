import { Link } from 'react-router-dom';

import Icon from '../../common/Icon/Icon.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import { TESTIMONIALS } from '../../../data/testimonials.js';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import './Testimonials.css';

const initials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

export default function Testimonials() {
  const { PLANTS } = useCatalogue();
  const ref = useScrollReveal();

  // Averaged across the catalogue's real reviews. Until customers have written
  // some this is 0 of 0, so the strip below is not shown at all rather than
  // dividing by zero or quoting a figure nobody earned.
  const totalReviews = PLANTS.reduce((sum, p) => sum + (p.reviews || 0), 0);
  const avgRating =
    totalReviews === 0
      ? null
      : (
          PLANTS.reduce((sum, p) => sum + (p.rating || 0) * (p.reviews || 0), 0) / totalReviews
        ).toFixed(1);

  return (
    <section className="testimonials section" id="testimonials" ref={ref}>
      <div className="container">
        <header className="section-heading section-heading--center reveal">
          <span className="eyebrow">What people say</span>
          <h2>Plant parents, six months later</h2>
          <p>
            The review that matters is not the one written on delivery day. It is the one written
            once the plant has had time to die.
          </p>
        </header>

        {avgRating && (
          <div className="testimonials__summary reveal">
            <div className="testimonials__stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Icon
                  key={i}
                  name="star"
                  size={20}
                  filled={i < Math.round(avgRating)}
                  strokeWidth={i < Math.round(avgRating) ? 0 : 1.4}
                />
              ))}
            </div>
            <p>
              <strong>{avgRating} out of 5</strong>
              <span>
                from {totalReviews.toLocaleString('en-IN')} review
                {totalReviews === 1 ? '' : 's'} across the catalogue
              </span>
            </p>
          </div>
        )}

        <div className="testimonials__grid">
          {TESTIMONIALS.map((item, index) => (
            <figure key={item.id} className={`quote reveal reveal--up delay-${index + 1}`}>
              <span className="quote__mark" aria-hidden="true">
                <Icon name="quote" size={30} filled strokeWidth={0} />
              </span>

              <div className="quote__stars" aria-label={`${item.rating} out of 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Icon
                    key={i}
                    name="star"
                    size={15}
                    filled={i < item.rating}
                    strokeWidth={i < item.rating ? 0 : 1.4}
                  />
                ))}
              </div>

              <blockquote>{item.quote}</blockquote>

              <figcaption>
                <span className="quote__avatar" aria-hidden="true">
                  {initials(item.name)}
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.city} &middot; bought <Link to={`/plant/${item.plant}`}>{item.plantName}</Link>
                  </span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
