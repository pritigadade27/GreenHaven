import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';

import ProductCard from '../../components/product/ProductCard/ProductCard.jsx';
import Reviews from '../../components/product/Reviews/Reviews.jsx';
import Stars from '../../components/common/Stars/Stars.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import useRequireAuth from '../../hooks/useRequireAuth.js';
import { useCatalogue } from '../../context/CatalogueContext.jsx';
import { BADGES } from '../../data/badges.js';
import { formatPrice, discountPercent } from '../../utils/format.js';
import './PlantDetails.css';

const CARE_ROWS = [
  ['light', 'Light', 'sun'],
  ['water', 'Water', 'drop'],
  ['soil', 'Soil', 'leaf'],
  ['humidity', 'Humidity', 'drop'],
  ['temperature', 'Temperature', 'sun'],
  ['feed', 'Feeding', 'leaf'],
  ['repot', 'Repotting', 'shield'],
];

const LIGHT_LABEL = { low: 'Low light', medium: 'Bright indirect', high: 'Full sun' };
const WATER_LABEL = { low: 'Every 2–3 weeks', medium: 'Weekly', high: 'Every 2–3 days' };

const PET_COPY = {
  safe: { label: 'Pet friendly', tone: 'good', text: 'Non-toxic to cats and dogs.' },
  caution: { label: 'Keep from pets', tone: 'warn', text: 'Mildly irritating if chewed.' },
  toxic: { label: 'Toxic to pets', tone: 'warn', text: 'Harmful if eaten by cats or dogs.' },
};

export default function PlantDetails() {
  const { getPlantBySlug, getRelated, CATEGORIES, ready } = useCatalogue();
  const { id } = useParams();
  const plant = getPlantBySlug(id);
  const [quantity, setQuantity] = useState(1);
  const [shot, setShot] = useState(0);
  const [tab, setTab] = useState('care');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return undefined;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const guard = useRequireAuth();

  if (!ready) {
    return (
      <section className="section">
        <div className="container">
          <div className="pdp__loading" role="status" aria-live="polite">
            <span className="skeleton" style={{ height: 320, borderRadius: 24 }} />
            <div>
              <span className="skeleton" style={{ height: 20, width: '45%' }} />
              <span className="skeleton" style={{ height: 44, width: '75%' }} />
              <span className="skeleton" style={{ height: 16, width: '60%' }} />
            </div>
          </div>
          <span className="sr-only">Loading this product</span>
        </div>
      </section>
    );
  }

  if (!plant) return <Navigate to="/shop" replace />;

  const discount = discountPercent(plant.price, plant.mrp);
  const wishlisted = isWishlisted(plant.id);
  const category = CATEGORIES.find((c) => c.slug === plant.category);
  const pet = PET_COPY[plant.petSafety];
  const related = getRelated(plant, 4);
  const gallery = plant.gallery?.length ? plant.gallery : [plant.image];

  const isMerch = Boolean(plant.isMerchandise);
  const tabs = isMerch
    ? [['about', 'About this product'], ['specs', 'Specifications']]
    : [['care', 'Care instructions'], ['about', 'About this plant'], ['specs', 'Specifications']];
  const activeTab = isMerch && tab === 'care' ? 'about' : tab;

  const badges = (plant.badges ?? [])
    .map((code) => (BADGES[code] ? { code, ...BADGES[code] } : null))
    .filter(Boolean);

  const stock = plant.stock ?? 0;
  const inStock = stock > 0;
  const maxQty = Math.max(1, Math.min(stock, 10));
  const stockTone = !inStock ? 'is-out' : stock <= 5 ? 'is-low' : 'is-in';
  const stockLabel = !inStock
    ? 'Out of stock — check back soon'
    : stock <= 5
      ? `Only ${stock} left in stock`
      : 'In stock, ships in 1–2 days';

  const specs = isMerch
    ? (plant.specs ?? {})
    : {
        'Botanical name': plant.botanical,
        'Mature size': plant.size,
        'Growth rate': plant.growth,
        Maintenance: plant.maintenance,
        'Care level': plant.difficulty,
        Light: LIGHT_LABEL[plant.light],
        Water: WATER_LABEL[plant.water],
        'Pet safety': pet.text,
      };

  if (quantity > maxQty) setQuantity(maxQty);

  const handleAdd = () => {
    addToCart(plant, quantity);
    setAdded(true);
  };

  return (
    <>
      <article className="pdp">
        <div className="container">
          <nav className="pdp__crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <Icon name="chevronRight" size={13} />
            <Link to="/shop">Shop</Link>
            <Icon name="chevronRight" size={13} />
            <Link to={`/shop?category=${plant.category}`}>{category?.name}</Link>
            <Icon name="chevronRight" size={13} />
            <span>{plant.name}</span>
          </nav>

          <div className="pdp__top">
            <div className="pdp__gallery">
              <figure className="pdp__photo">
                <img src={gallery[shot]} alt={plant.name} />
                {discount && <span className="pdp__save">{discount}% off</span>}
              </figure>

              {gallery.length > 1 && (
                <ul className="pdp__thumbs">
                  {gallery.map((src, i) => (
                    <li key={src}>
                      <button
                        type="button"
                        className={i === shot ? 'is-active' : ''}
                        onClick={() => setShot(i)}
                        aria-label={`View image ${i + 1} of ${gallery.length}`}
                      >
                        <img src={src} alt="" loading="lazy" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <ul className="pdp__quick">
                {isMerch ? null : (
                 <>
                <li>
                  <Icon name="sun" size={19} />
                  <div>
                    <strong>{LIGHT_LABEL[plant.light]}</strong>
                    <span>Light</span>
                  </div>
                </li>
                <li>
                  <Icon name="drop" size={19} />
                  <div>
                    <strong>{WATER_LABEL[plant.water]}</strong>
                    <span>Water</span>
                  </div>
                </li>
                <li>
                  <Icon name="paw" size={19} />
                  <div>
                    <strong className={pet.tone === 'warn' ? 'is-warn' : ''}>{pet.label}</strong>
                    <span>Pets</span>
                  </div>
                </li>
                <li>
                  <Icon name="shield" size={19} />
                  <div>
                    <strong>{plant.difficulty}</strong>
                    <span>Care level</span>
                  </div>
                </li>
                 </>
                )}
                {isMerch
                  ? Object.entries(plant.specs ?? {}).slice(0, 4).map(([label, value]) => (
                      <li key={label}>
                        <Icon name="shield" size={19} />
                        <div>
                          <strong>{value}</strong>
                          <span>{label}</span>
                        </div>
                      </li>
                    ))
                  : null}
              </ul>
            </div>

            <div className="pdp__buy">
              <Link className="pdp__category" to={`/shop?category=${plant.category}`}>
                {category?.name}
              </Link>
              <h1>{plant.name}</h1>
              <p className="pdp__botanical">{plant.botanical}</p>

              <a className="pdp__rating" href="#reviews">
                {plant.reviews > 0 ? (
                  <>
                    <Stars value={plant.rating} size={16} />
                    <strong>{Number(plant.rating).toFixed(1)}</strong>
                    <span className="pdp__reviews">
                      {plant.reviews} review{plant.reviews === 1 ? '' : 's'}
                    </span>
                  </>
                ) : (
                  <span className="pdp__reviews">Not yet reviewed &mdash; be the first</span>
                )}
              </a>

              <div className="pdp__price">
                <strong>{formatPrice(plant.price)}</strong>
                {plant.mrp > plant.price && (
                  <>
                    <s>{formatPrice(plant.mrp)}</s>
                    <em>{discount}% off</em>
                  </>
                )}
              </div>

              <p className="pdp__short">{plant.short}</p>

              {badges.length > 0 && (
                <ul className="pdp__badges">
                  {badges.map((b) => (
                    <li key={b.code} className={`pdp__badge is-${b.tone}`}>
                      <Icon name={b.icon} size={14} />
                      {b.label}
                    </li>
                  ))}
                </ul>
              )}

              <p className={`pdp__stock ${stockTone}`}>
                <Icon name={inStock ? 'check' : 'close'} size={15} />
                {stockLabel}
              </p>

              <div className="pdp__actions">
                <div className="pdp__qty">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Reduce quantity"
                  >
                    <Icon name="minus" size={15} />
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    aria-label="Increase quantity"
                  >
                    <Icon name="plus" size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  className={`pdp__add ${added ? 'is-added' : ''}`}
                  disabled={!inStock}
                  onClick={guard(handleAdd, 'add items to your cart')}
                >
                  <Icon name={added ? 'check' : 'cart'} size={18} />
                  {!inStock ? 'Out of stock' : added ? 'Added to cart' : 'Add to Cart'}
                </button>

                <button
                  type="button"
                  className={`pdp__wish ${wishlisted ? 'is-on' : ''}`}
                  aria-pressed={wishlisted}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  onClick={guard(() => toggleWishlist(plant), 'save plants to your wishlist')}
                >
                  <Icon name="heart" size={19} filled={wishlisted} />
                </button>
              </div>

              <ul className="pdp__promise">
                <li>
                  <Icon name="truck" size={15} /> Free delivery over {formatPrice(999)}
                </li>
                <li>
                  <Icon name="shield" size={15} /> 30-day plant promise
                </li>
                <li>
                  <Icon name="leaf" size={15} /> Care card in every box
                </li>
              </ul>
            </div>
          </div>

          <div className="pdp__tabs">
            <div className="pdp__tab-list" role="tablist" aria-label="Product information">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`tab-${key}`}
                  aria-selected={activeTab === key}
                  aria-controls={`panel-${key}`}
                  className={activeTab === key ? 'is-active' : ''}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'care' && plant.care && (
              <div className="pdp__tab-panel" role="tabpanel" id="panel-care" aria-labelledby="tab-care">
                <p className="pdp__tip">
                  <Icon name="leaf" size={17} />
                  {plant.tip}
                </p>
                <dl className="pdp__care">
                  {CARE_ROWS.filter(([key]) => plant.care[key]).map(([key, label, icon]) => (
                    <div key={key}>
                      <dt>
                        <Icon name={icon} size={16} />
                        {label}
                      </dt>
                      <dd>{plant.care[key]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {activeTab === 'about' && (
              <div
                className="pdp__tab-panel"
                role="tabpanel"
                id="panel-about"
                aria-labelledby="tab-about"
              >
                <p className="pdp__prose">{plant.description}</p>
              </div>
            )}

            {activeTab === 'specs' && (
              <div
                className="pdp__tab-panel"
                role="tabpanel"
                id="panel-specs"
                aria-labelledby="tab-specs"
              >
                <dl className="pdp__care">
                  {Object.entries(specs).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </article>

      <Reviews slug={plant.slug} name={plant.name} />

      {related.length > 0 && (
        <section className="pdp-related section section--tint">
          <div className="container">
            <header className="section-heading section-heading--center">
              <span className="eyebrow">You might also like</span>
              <h2>Related plants</h2>
            </header>
            <div className="pdp-related__grid">
              {related.map((p) => (
                <ProductCard key={p.id} plant={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
