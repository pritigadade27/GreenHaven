import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { orderApi } from '../../services/api.js';
import loadRazorpay from '../../utils/razorpay.js';
import { formatPrice } from '../../utils/format.js';
import './Checkout.css';

const FREE_DELIVERY_OVER = 999;
const DELIVERY_FEE = 99;

const EMPTY = { addressLine: '', phone: '', city: '', state: '', pincode: '' };

export default function Checkout() {
  const { items, subtotal, totalItems, clearCart } = useCart();
  const { user, isSignedIn, ready } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  // Which of the two Razorpay callbacks got there first. A ref, not state:
  // both callbacks read it synchronously and must see the same value.
  const settled = useRef(false);

  const delivery = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  // Reaching checkout signed out means a stale tab or a hand-typed URL; the
  // API would reject it anyway, so bounce to the sign-in screen with a reason.
  useEffect(() => {
    // Wait for the auth check to finish.
    if (ready && !isSignedIn) {
      navigate('/login', {
        replace: true,
        state: { from: '/checkout', reason: 'Please sign in to complete your order.' },
      });
    }
  }, [ready, isSignedIn, navigate]);

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function handlePay(event) {
    event.preventDefault();
    setError('');

    // Catch the obvious locally rather than spending a round trip on it. The
    // server validates all of this again and remains the authority.
    const local = {};
    if (form.addressLine.trim().length < 6) local.addressLine = 'Enter the full address.';
    if (!/^([+]?91[- ]?|0)?[6-9]\d{9}$/.test(form.phone.trim()))
      local.phone = 'Enter a 10-digit Indian mobile number.';
    if (!form.city.trim()) local.city = 'City is required.';
    if (!form.state.trim()) local.state = 'State is required.';
    if (!/^\d{6}$/.test(form.pincode.trim())) local.pincode = 'Enter a 6-digit pincode.';

    setFieldErrors(local);
    if (Object.keys(local).length > 0) {
      setError('Please check the highlighted fields.');
      return;
    }

    setBusy(true);

    try {
      // 1. The server prices the basket and opens a Razorpay order.
      const order = await orderApi.start(
        form,
        items.map((line) => ({ slug: line.slug, quantity: line.quantity })),
      );

      // The button showed a total summed from prices persisted in the browser; the sheet charges what the server just calculated.
      if (Math.round(order.total * 100) !== Math.round(total * 100)) {
        setBusy(false);
        setPriceChange({ was: total, now: order.total, order });
        return;
      }

      openSheet(order);
    } catch (err) {
      setFieldErrors(err.fields || {});
      setError(err.fields ? 'Please check the highlighted fields.' : err.message);
      setBusy(false);
    }
  }

  async function openSheet(order) {
    try {
      // 2. Payment sheet.
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        throw new Error('Could not load the payment window. Check your connection.');
      }

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        order_id: order.razorpayOrderId,
        amount: Math.round(order.total * 100),
        currency: 'INR',
        name: 'Green Haven',
        description: `Order ${order.orderNumber}`,
        image: '/apple-touch-icon.png',
        prefill: { name: user?.fullName || '', email: user?.email || '' },
        notes: { orderNumber: order.orderNumber },
        theme: { color: '#6D0008' },
        modal: {
          ondismiss: () => {
            // ondismiss fires whenever the sheet closes — including in the window between a successful authorisation and `handler` running.
            if (settled.current) return;
            settled.current = true;
            orderApi.cancel(order.razorpayOrderId).catch(() => {});
            setBusy(false);
            setError('Payment cancelled. Your cart is still here whenever you are ready.');
          },
        },
        handler: async (response) => {
          // Claim the outcome before any await, so a dismiss that lands
          // during verification cannot undo a real payment.
          settled.current = true;
          // 3. The browser's "it worked" is only a hint. The server re-checks
          //    the HMAC signature before a single rupee is treated as paid.
          try {
            const confirmed = await orderApi.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearCart();
            setPlaced(confirmed);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        },
      });

      rzp.on('payment.failed', (res) => {
        settled.current = true;
        setBusy(false);
        setError(res?.error?.description || 'The payment did not go through. Nothing was charged.');
      });

      rzp.open();
    } catch (err) {
      setFieldErrors(err.fields || {});
      setError(err.fields ? 'Please check the highlighted fields.' : err.message);
      setBusy(false);
    }
  }

  /* --------------------------------------------------------- price moved */
  // Reached only when the server's total differs from the one on the button.
  // The customer decides — we never quietly charge a number they were not shown.
  if (priceChange) {
    return (
      <>
      <h1 className="sr-only">Checkout</h1>
        <section className="section">
          <div className="container">
            <div className="checkout__done">
              <span className="checkout__tick checkout__tick--warn">
                <Icon name="shield" size={28} />
              </span>
              <h2>The price has changed since you added this</h2>
              <p>
                Your basket showed <strong>{formatPrice(priceChange.was)}</strong>. The current
                total is <strong>{formatPrice(priceChange.now)}</strong>. Nothing has been charged.
              </p>

              <div className="checkout__choice">
                <Button
                  size="lg"
                  icon="arrowRight"
                  onClick={() => {
                    const order = priceChange.order;
                    setPriceChange(null);
                    setBusy(true);
                    openSheet(order);
                  }}
                >
                  Pay {formatPrice(priceChange.now)}
                </Button>
                <Link to="/cart" className="checkout__back">
                  Back to the cart
                </Link>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  /* ------------------------------------------------------------ confirmed */
  if (placed) {
    return (
      <>
      <h1 className="sr-only">Checkout</h1>
        <section className="section">
          <div className="container">
            <div className="checkout__done">
              <span className="checkout__tick">
                <Icon name="check" size={30} />
              </span>
              <h2>Thank you, {user?.fullName?.split(' ')[0] || 'friend'}.</h2>
              <p>
                Order <strong>{placed.orderNumber}</strong> is paid and being potted up. A
                confirmation is on its way to {user?.email}.
              </p>
              <dl className="checkout__receipt">
                <div>
                  <dt>Amount paid</dt>
                  <dd>{formatPrice(placed.total)}</dd>
                </div>
                <div>
                  <dt>Payment id</dt>
                  <dd>{placed.razorpayPaymentId}</dd>
                </div>
                <div>
                  <dt>Delivering to</dt>
                  <dd>
                    {placed.addressLine}, {placed.city} {placed.pincode}
                  </dd>
                </div>
              </dl>
              <Button to="/shop" size="lg" icon="arrowRight">
                Continue shopping
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  /* --------------------------------------------------------- empty basket */
  if (items.length === 0) {
    return (
      <>
      <h1 className="sr-only">Checkout</h1>
        <section className="section">
          <div className="container">
            <div className="empty-state">
              <Icon name="cart" size={46} />
              <h2>There is nothing to pay for yet</h2>
              <p>Add a plant or two and the checkout will be waiting.</p>
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
      <h1 className="sr-only">Checkout</h1>

      <section className="section checkout">
        <div className="container checkout__grid">
          <form className="checkout__form" onSubmit={handlePay} noValidate>
            <h2>Delivery address</h2>

            <label className="field">
              <span>Address</span>
              <input
                type="text"
                value={form.addressLine}
                onChange={update('addressLine')}
                placeholder="Flat, building, street"
                autoComplete="street-address"
              />
              {fieldErrors.addressLine && (
                <em id="err-addressLine" role="alert">
                  {fieldErrors.addressLine}
                </em>
              )}
            </label>

            <label className="field">
              <span>Phone number</span>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder="10-digit mobile"
                autoComplete="tel"
                aria-invalid={fieldErrors.phone ? 'true' : undefined}
                aria-describedby={fieldErrors.phone ? 'err-phone' : undefined}
              />
              {fieldErrors.phone && <em id="err-phone" role="alert">{fieldErrors.phone}</em>}
              <small>The courier calls this number before delivering a live plant.</small>
            </label>

            <div className="checkout__row">
              <label className="field">
                <span>City</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={update('city')}
                  autoComplete="address-level2"
                />
                {fieldErrors.city && (
                <em id="err-city" role="alert">
                  {fieldErrors.city}
                </em>
              )}
              </label>

              <label className="field">
                <span>State</span>
                <input
                  type="text"
                  value={form.state}
                  onChange={update('state')}
                  autoComplete="address-level1"
                />
                {fieldErrors.state && (
                <em id="err-state" role="alert">
                  {fieldErrors.state}
                </em>
              )}
              </label>

              <label className="field">
                <span>Pincode</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pincode}
                  onChange={update('pincode')}
                  autoComplete="postal-code"
                />
                {fieldErrors.pincode && (
                <em id="err-pincode" role="alert">
                  {fieldErrors.pincode}
                </em>
              )}
              </label>
            </div>

            {error && (
              <p className="checkout__error" role="alert">
                {error}
              </p>
            )}

            <Button size="lg" icon="arrowRight" type="submit" disabled={busy}>
              {busy ? 'Opening payment…' : `Pay ${formatPrice(total)}`}
            </Button>

            <p className="checkout__secure">
              <Icon name="shield" size={15} /> Payments are handled by Razorpay. Card details never
              touch Green Haven&rsquo;s servers.
            </p>
          </form>

          <aside className="checkout__summary">
            <h2>Your order</h2>

            <ul className="checkout__lines">
              {items.map((line) => (
                <li key={line.id}>
                  <img src={line.image} alt="" />
                  <div>
                    <Link to={`/plant/${line.slug}`}>{line.name}</Link>
                    <span>Qty {line.quantity}</span>
                  </div>
                  <strong>{formatPrice(line.price * line.quantity)}</strong>
                </li>
              ))}
            </ul>

            <dl>
              <div>
                <dt>Subtotal ({totalItems} items)</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{delivery === 0 ? <em>Free</em> : formatPrice(delivery)}</dd>
              </div>
              <div className="checkout__total">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            <Link to="/cart" className="checkout__back">
              Edit cart
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
