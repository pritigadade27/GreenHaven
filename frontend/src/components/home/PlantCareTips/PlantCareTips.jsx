import { Link } from 'react-router-dom';

import Icon from '../../common/Icon/Icon.jsx';
import Button from '../../common/Button/Button.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import './PlantCareTips.css';

const TOPICS = [
  {
    icon: 'drop',
    topic: 'Watering',
    title: 'More plants drown than dry out',
    body: 'Push a finger 5 cm into the soil. Damp means wait. Almost every yellow leaf on a houseplant is too much water, not too little.',
  },
  {
    icon: 'sun',
    topic: 'Light',
    title: '"Bright indirect" has a simple test',
    body: 'Hold your hand a foot above the leaves at midday. A soft, fuzzy shadow is bright indirect. A sharp one is direct sun. No shadow means it is too dark.',
  },
  {
    icon: 'leaf',
    topic: 'Feeding',
    title: 'Feed in growth, stop in rest',
    body: 'Feed fortnightly from March to September while the plant is actively growing, then stop completely. Feeding a dormant plant burns the roots.',
  },
  {
    icon: 'shield',
    topic: 'Repotting',
    title: 'Go one size up, never three',
    body: 'Roots circling the drainage holes mean it is time. Jump to a much larger pot and the extra soil stays wet, which is how root rot starts.',
  },
];

// Real tips lifted straight from the care cards, so the section and the
// product pages can never contradict each other.
const FROM_THE_CARDS = ['peace-lily', 'monstera-deliciosa', 'spider-plant'];

export default function PlantCareTips() {
  const { getPlantBySlug } = useCatalogue();
  const ref = useScrollReveal();
  // The care-cards panel is now its own section, so it needs its own observer
  // — one ref cannot reveal two separate elements.
  const cardsRef = useScrollReveal();
  const picked = FROM_THE_CARDS.map(getPlantBySlug).filter(Boolean);

  return (
    <>
    <section className="care section" id="care-tips" ref={ref}>
      <div className="container">
        <header className="section-heading section-heading--center reveal">
          <span className="eyebrow">Plant care</span>
          <h2>Four things that keep a plant alive</h2>
          <p>
            You do not need a green thumb. You need to know four things, and most plant deaths
            come from getting one of them slightly wrong.
          </p>
        </header>

        <div className="care__grid">
          {TOPICS.map(({ icon, topic, title, body }, index) => (
            <article key={topic} className={`care-card reveal reveal--up delay-${index + 1}`}>
              <span className="care-card__icon">
                <Icon name={icon} size={22} />
              </span>
              <span className="care-card__topic">{topic}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <div className="care__more reveal">
          <Button to="/shop" size="lg" icon="arrowRight">
            Find a plant that suits your room
          </Button>
        </div>
      </div>
    </section>

    {/* A separate section, not a second half of the one above: together they
        made a 1260px block that no laptop could show at once. */}
    <section className="care-cards section section--tint" ref={cardsRef}>
      <div className="container">
        {/* ------------------------------------------- pulled from real data */}
        <div className="care__cards reveal">
          <div className="care__cards-head">
            <h3>Straight from the care cards</h3>
            <p>Every plant ships with a tip like these, written for that species.</p>
          </div>

          <ul>
            {picked.map((plant) => (
              <li key={plant.id}>
                <Link to={`/plant/${plant.slug}`} className="care__card-link">
                  <img src={plant.image} alt="" loading="lazy" />
                  <div>
                    <strong>{plant.name}</strong>
                    <p>{plant.tip}</p>
                  </div>
                  <Icon name="arrowRight" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
    </>
  );
}
