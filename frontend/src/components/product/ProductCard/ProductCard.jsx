import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../../common/Icon/Icon.jsx';
import { useCart } from '../../../context/CartContext.jsx';
import { useWishlist } from '../../../context/WishlistContext.jsx';
import useRequireAuth from '../../../hooks/useRequireAuth.js';
import { BADGES } from '../../../data/badges.js';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import { formatPrice, discountPercent } from '../../../utils/format.js';
import './ProductCard.css';

export default function ProductCard({ plant, rank }) {
  const { CATEGORIES } = useCatalogue();
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return undefined;
    const t = setTimeout(() => setJustAdded(false), 1600);
    return () => clearTimeout(t);
  }, [justAdded]);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const guard = useRequireAuth();

  const wishlisted = isWishlisted(plant.id);
  const discount = discountPercent(plant.price, plant.mrp);
  const categoryName = CATEGORIES.find((c) => c.slug === plant.category)?.name ?? '';

  const badgeCodes = plant.badges ?? [];
  const petBadge = badgeCodes.find((b) => b.startsWith('pet'));
  const otherBadge = badgeCodes.find((b) => !b.startsWith('pet'));
  const shown = [petBadge, otherBadge].filter(Boolean).slice(0, 2);

  const handleAdd = () => {
    addToCart(
      {
        stock: plant.stock,
        id: plant.id,
        slug: plant.slug,
        name: plant.name,
        price: plant.price,
        image: plant.image,
      },
      1
    );
    setJustAdded(true);
  };

  return (
    <article className="product-card">
      <div className="product-card__media">
        <Link to={`/plant/${plant.slug}`} aria-label={plant.name}>
          <img src={plant.image} alt={plant.name} loading="lazy" />
        </Link>

        {rank && <span className="product-card__rank">#{rank} Best Seller</span>}
        {discount && !rank && <span className="product-card__save">{discount}% off</span>}

        <button
          type="button"
          className={`product-card__wish ${wishlisted ? 'is-on' : ''}`}
          onClick={guard(() => toggleWishlist(plant), 'save plants to your wishlist')}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `Remove ${plant.name} from wishlist` : `Add ${plant.name} to wishlist`}
        >
          <Icon name="heart" size={18} filled={wishlisted} />
        </button>
      </div>

      <div className="product-card__body">
        <span className="product-card__category">{categoryName}</span>

        <h3 className="product-card__name">
          <Link to={`/plant/${plant.slug}`}>{plant.name}</Link>
        </h3>

        <p className="product-card__short">{plant.short}</p>

        <ul className="product-card__badges">
          {shown.map((code) => {
            const badge = BADGES[code];
            if (!badge) return null;
            return (
              <li key={code} className={`tag tag--${badge.tone}`} title={badge.detail}>
                <Icon name={badge.icon} size={13} />
                {badge.label}
              </li>
            );
          })}
        </ul>

        <div className="product-card__foot">
          <div className="product-card__price">
            <strong>{formatPrice(plant.price)}</strong>
            {plant.mrp > plant.price && <s>{formatPrice(plant.mrp)}</s>}
          </div>

          <button
            type="button"
            className={`product-card__add ${justAdded ? 'is-added' : ''}`}
            onClick={guard(handleAdd, 'add items to your cart')}
          >
            <Icon name={justAdded ? 'shield' : 'cart'} size={16} />
            <span>{justAdded ? 'Added' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
