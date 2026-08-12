import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { resolveImage } from '../../utils/productImages.js';
import { formatPrice } from '../../utils/format.js';
import { Empty, SectionHead } from './ProfileParts.jsx';

/** The same saved list as /wishlist, laid out as rows to sit inside the profile panel. */
export default function ProfileWishlist() {
  const { reload } = useOutletContext();
  const { items, totalItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const moveToCart = (plant) => {
    addToCart(
      { id: plant.id, slug: plant.slug, name: plant.name, price: plant.price, image: plant.image },
      1
    );
    removeFromWishlist(plant.id);
    reload();
  };

  if (totalItems === 0) {
    return (
      <section className="psec">
        <SectionHead title="Wishlist" />
        <Empty icon="heart" title="Nothing saved yet" action={{ to: '/shop', label: 'Browse plants' }}>
          Tap the heart on any plant to keep it here while you decide. Your list is saved to your
          account, so it survives signing out.
        </Empty>
      </section>
    );
  }

  return (
    <section className="psec">
      <SectionHead
        title="Wishlist"
        subtitle={`${totalItems} plant${totalItems === 1 ? '' : 's'} saved for later.`}
      >
        <Button to="/wishlist" size="md" icon="arrowRight">
          Full wishlist
        </Button>
      </SectionHead>

      <ul className="pwish">
        {items.map((plant) => (
          <li key={plant.id} className="pcard pwish__row">
            <Link to={`/plant/${plant.slug}`} className="pwish__img">
              {plant.image ? (
                <img src={resolveImage(plant.image)} alt="" loading="lazy" />
              ) : (
                <span className="porder__noimg" aria-hidden="true">
                  <Icon name="leaf" size={20} />
                </span>
              )}
            </Link>

            <div className="pwish__body">
              <Link to={`/plant/${plant.slug}`}>{plant.name}</Link>
              <strong>{formatPrice(plant.price)}</strong>
            </div>

            <div className="pwish__actions">
              <Button onClick={() => moveToCart(plant)} size="md" icon="cart">
                Move to cart
              </Button>
              <button
                type="button"
                className="psec__danger"
                onClick={() => {
                  removeFromWishlist(plant.id);
                  reload();
                }}
              >
                <Icon name="trash" size={15} /> Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="psec__actions">
        <Button to="/shop" size="lg" icon="arrowRight">
          Continue shopping
        </Button>
      </div>
    </section>
  );
}
