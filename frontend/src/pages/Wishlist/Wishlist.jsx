import ProductCard from '../../components/product/ProductCard/ProductCard.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import './Wishlist.css';

export default function Wishlist() {
  const { items, totalItems, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  const addAll = () => {
    items.forEach((plant) =>
      addToCart(
        {
          id: plant.id,
          slug: plant.slug,
          name: plant.name,
          price: plant.price,
          image: plant.image,
        },
        1
      )
    );
  };

  if (totalItems === 0) {
    return (
      <>
      <h1 className="sr-only">Your wishlist</h1>
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Icon name="heart" size={46} />
              <h2>Nothing saved yet</h2>
              <p>
                Tap the heart on any plant to keep it here while you decide. Your list survives a
                refresh.
              </p>
              <Button to="/shop" size="lg" icon="arrowRight">
                Browse plants
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Your wishlist</h1>

      <section className="wishlist section">
        <div className="container">
          <div className="wishlist__bar">
            <Button onClick={addAll} icon="cart">
              Add all to cart
            </Button>
            <button type="button" className="wishlist__clear" onClick={clearWishlist}>
              Clear wishlist
            </button>
          </div>

          <div className="wishlist__grid">
            {items.map((plant) => (
              <ProductCard key={plant.id} plant={plant} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
