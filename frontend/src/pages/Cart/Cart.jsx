import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCatalogue } from '../../context/CatalogueContext.jsx';
import useRequireAuth from '../../hooks/useRequireAuth.js';
import { formatPrice } from '../../utils/format.js';
import './Cart.css';

const FREE_DELIVERY_OVER = 999;
const DELIVERY_FEE = 99;

export default function Cart() {
  const { CATALOGUE } = useCatalogue();
  const { items, subtotal, totalItems, setQuantity, removeFromCart, clearCart, maxFor } =
    useCart();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();

  // Cart totals with delivery fee
  const delivery = subtotal >= FREE_DELIVERY_OVER || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;
  const toFreeDelivery = FREE_DELIVERY_OVER - subtotal;

  if (items.length === 0) {
    return (
      <>
      <h1 className="sr-only">Your cart</h1>
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Icon name="cart" size={46} />
              <h2>Your cart is empty</h2>
              <p>
                Nothing in here yet. The catalogue is {CATALOGUE.length} products deep &mdash; start with something
                forgiving.
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
      <h1 className="sr-only">Your cart</h1>

      <section className="cart section">
        <div className="container cart__layout">
          <div className="cart__lines">
            {delivery > 0 && (
              <p className="cart__nudge">
                <Icon name="truck" size={17} />
                Add {formatPrice(toFreeDelivery)} more for free delivery.
              </p>
            )}

            <ul>
              {items.map((line) => (
                <li key={line.id} className="cart-line">
                  <Link to={`/plant/${line.slug}`} className="cart-line__img">
                    <img src={line.image} alt={line.name} />
                  </Link>

                  <div className="cart-line__info">
                    <Link to={`/plant/${line.slug}`}>{line.name}</Link>
                    <span>{formatPrice(line.price)} each</span>
                  </div>

                  <div className="cart-line__qty">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.id, line.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Icon name="minus" size={14} />
                    </button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.id, line.quantity + 1)}
                      disabled={line.quantity >= maxFor(line.id)}
                      aria-label="Increase quantity"
                      title={
                        line.quantity >= maxFor(line.id)
                          ? `Only ${maxFor(line.id)} in stock`
                          : undefined
                      }
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>

                  <strong className="cart-line__total">
                    {formatPrice(line.price * line.quantity)}
                  </strong>

                  <button
                    type="button"
                    className="cart-line__remove"
                    onClick={() => removeFromCart(line.id)}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="cart__lines-foot">
              <Link to="/shop">
                <Icon name="chevronRight" size={14} />
                Continue shopping
              </Link>
              <button type="button" onClick={clearCart}>
                Clear cart
              </button>
            </div>
          </div>

          <aside className="cart__summary">
            <h2>Order summary</h2>

            <dl>
              <div>
                <dt>Subtotal ({totalItems} items)</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{delivery === 0 ? <em>Free</em> : formatPrice(delivery)}</dd>
              </div>
              <div className="cart__summary-total">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            <Button
              size="lg"
              icon="arrowRight"
              className="cart__checkout"
              onClick={requireAuth(() => navigate('/checkout'), 'check out')}
            >
              Proceed to checkout
            </Button>

            <p className="cart__note">
              Secured by Razorpay &mdash; UPI, cards, netbanking and wallets.
            </p>

            <ul className="cart__trust">
              <li>
                <Icon name="shield" size={16} /> 30-day plant promise
              </li>
              <li>
                <Icon name="truck" size={16} /> Free delivery over{' '}
                {formatPrice(FREE_DELIVERY_OVER)}
              </li>
              <li>
                <Icon name="leaf" size={16} /> Care card in every box
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
