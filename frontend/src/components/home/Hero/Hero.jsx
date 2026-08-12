import Button from '../../common/Button/Button.jsx';
import heroPlant from '../../../assets/images/hero/unsplash-interior.jpg';
import peaceLily from '../../../assets/images/plants/peace-lily.jpg';
import zzPlant from '../../../assets/images/plants/zz-plant.jpg';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import './Hero.css';

/** Drifting leaf silhouettes behind the photograph. */
function Leaf({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 60" aria-hidden="true">
      <path
        d="M2 52C2 22 26 4 96 2c4 40-22 56-62 56-12 0-24-2-32-6Z"
        fill="currentColor"
        opacity=".9"
      />
      <path d="M18 44C36 28 58 16 88 9" fill="none" stroke="#FFF8F8" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Hero() {
  const { ALL_PLANTS, CATEGORIES } = useCatalogue();
  // Figures come from the catalogue itself, so they can never drift out of date.
  const stats = [
    { value: CATEGORIES.length, label: 'Plant categories' },
    { value: ALL_PLANTS.length, label: 'Curated species' },
    { value: 'Free', label: 'Care guidance' },
  ];

  return (
    <section className="hero">
      <div className="hero__wash" aria-hidden="true" />

      <div className="container hero__inner">
        {/* ------------------------------------------------------------ copy */}
        <div className="hero__content">
          <span className="eyebrow hero__eyebrow">Premium Garden Centre</span>

          <h1 className="hero__title">
            Bring Nature to<br />
            <em>Every Home</em>
          </h1>

          <p className="hero__text">
            A curated collection of indoor and outdoor plants, chosen for Indian homes and
            delivered with the care guidance to keep them alive. From your first pothos to a
            terrace in full bloom — we tell you exactly how to look after it.
          </p>

          <div className="hero__actions">
            <Button to="/shop" size="lg" icon="arrowRight">
              Shop Plants
            </Button>
            <Button to="/shop" size="lg" variant="outline">
              Explore Collection
            </Button>
          </div>

          <ul className="hero__stats">
            {stats.map(({ value, label }) => (
              <li key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ----------------------------------------------------------- image */}
        <div className="hero__visual">
          <div className="hero__blob" aria-hidden="true" />

          <Leaf className="hero__leaf hero__leaf--1 float" />
          <Leaf className="hero__leaf hero__leaf--2 float--slow" />
          <Leaf className="hero__leaf hero__leaf--3 float" />

          {/* Three plants rather than one — the arch carries the hero, the two discs show the range without. */}
          <figure className="hero__frame">
            <img
              src={heroPlant}
              alt="A snake plant in a terracotta pot"
              width="600"
              height="840"
              fetchPriority="high"
            />
          </figure>

          <figure className="hero__disc hero__disc--top">
            <img src={peaceLily} alt="A peace lily in a ceramic pot" loading="lazy" />
          </figure>

          <figure className="hero__disc hero__disc--bottom">
            <img src={zzPlant} alt="A ZZ plant in a white pot" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>
  );
}
