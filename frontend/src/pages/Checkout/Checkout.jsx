import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { orderApi, addressApi, couponApi } from '../../services/api.js';
import loadRazorpay from '../../utils/razorpay.js';
import { formatPrice } from '../../utils/format.js';
import './Checkout.css';

const FREE_DELIVERY_OVER = 999;
const DELIVERY_FEE = 99;

const EMPTY = { addressLine: '', phone: '', city: '', state: '', pincode: '' };

/** A saved address flattened into the shape the checkout form holds. */
const toForm = (a) => ({
  addressLine: [a.line1, a.line2].filter(Boolean).join(', '),
  phone: a.phone ?? '',
  city: a.city ?? '',
  state: a.state ?? '',
  pincode: a.pincode ?? '',
});

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
  const [testSheet, setTestSheet] = useState(null);

  // Saved addresses. `chosen` is the id being delivered to, or 'new' while the
  // customer is typing one that is not saved.
  const [addresses, setAddresses] = useState([]);
  const [chosen, setChosen] = useState('new');
  const [saveNew, setSaveNew] = useState(true);
  // Which of the two Razorpay callbacks got there first. A ref, not state:
  // both callbacks read it synchronously and must see the same value.
  const settled = useRef(false);

  // A code the customer has typed, and the server's answer about it. The
  // answer holds every figure, because what a code is worth is the server's
  // decision — this page never works out a discount of its own.
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const localDelivery = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const discount = coupon?.discount ?? 0;
  const delivery = coupon ? coupon.shipping : localDelivery;
  const total = coupon ? coupon.total : subtotal + localDelivery;

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

  // Pull the saved addresses in and pre-select the default, so a returning
  // customer does not retype an address the account already knows.
  useEffect(() => {
    if (!ready || !isSignedIn) return undefined;
    let alive = true;
    addressApi
      .list()
      .then((saved) => {
        if (!alive || saved.length === 0) return;
        setAddresses(saved);
        const preferred = saved.find((a) => a.isDefault) ?? saved[0];
        setChosen(preferred.id);
        setForm(toForm(preferred));
      })
      // A failure here is not worth blocking checkout — the form still works.
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ready, isSignedIn]);

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const basket = items.map((line) => ({ slug: line.slug, quantity: line.quantity }));

  async function applyCoupon(event) {
    event?.preventDefault();
    const code = couponInput.trim();
    if (!code) return;

    setCouponBusy(true);
    setCouponError('');
    try {
      const quote = await couponApi.quote(code, basket);
      if (quote.applied) {
        setCoupon(quote);
        setCouponInput('');
      } else {
        setCoupon(null);
        setCouponError(quote.message);
      }
    } catch (err) {
      setCoupon(null);
      setCouponError(err.message);
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponError('');
  }

  // A quote is priced against the basket it was asked about. Change the basket
  // in another tab and the discount shown here is answering a question nobody
  // is asking any more — so it is re-asked, and drops away if it no longer
  // applies (a code with a minimum the smaller basket no longer meets).
  useEffect(() => {
    if (!coupon) return undefined;
    if (Math.round(coupon.subtotal * 100) === Math.round(subtotal * 100)) return undefined;

    let alive = true;
    couponApi
      .quote(coupon.code, basket)
      .then((quote) => {
        if (!alive) return;
        if (quote.applied) {
          setCoupon(quote);
        } else {
          setCoupon(null);
          setCouponError(quote.message);
        }
      })
      .catch(() => {
        if (alive) setCoupon(null);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, coupon]);

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
        coupon?.code,
      );

      // Saved only once the order exists, and never blocking it: a failure to
      // remember an address must not lose the customer their checkout.
      if (chosen === 'new' && saveNew) {
        addressApi
          .add({
            label: 'Home',
            fullName: user?.fullName || 'Delivery',
            phone: form.phone.trim(),
            line1: form.addressLine.trim(),
            line2: '',
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
            country: 'India',
            makeDefault: addresses.length === 0,
          })
          .catch(() => {});
      }

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

  // Test mode: the gateway is stood in for, so there is no sheet to open. The
  // outcome the tester picks is signed by the server and then goes through the
  // same verify call a real payment does.
  async function settleSimulated(order, succeed) {
    setTestSheet(null);
    setBusy(true);
    settled.current = true;
    try {
      const response = await orderApi.simulate(order.razorpayOrderId, succeed);
      const confirmed = await orderApi.verify(response);
      clearCart();
      setPlaced(confirmed);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openSheet(order) {
    if (order.simulated) {
      setBusy(false);
      settled.current = false;
      setTestSheet(order);
      return;
    }

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

            {addresses.length > 0 && (
              <ul className="checkout__saved">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label className={chosen === a.id ? 'is-on' : undefined}>
                      <input
                        type="radio"
                        name="saved-address"
                        checked={chosen === a.id}
                        onChange={() => {
                          setChosen(a.id);
                          setForm(toForm(a));
                          setFieldErrors({});
                        }}
                      />
                      <span className="checkout__saved-label">
                        {a.label}
                        {a.isDefault && <em>Default</em>}
                      </span>
                      <span className="checkout__saved-body">
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}
                      </span>
                      <span className="checkout__saved-phone">{a.phone}</span>
                    </label>
                  </li>
                ))}
                <li>
                  <label className={chosen === 'new' ? 'is-on' : undefined}>
                    <input
                      type="radio"
                      name="saved-address"
                      checked={chosen === 'new'}
                      onChange={() => {
                        setChosen('new');
                        setForm(EMPTY);
                        setFieldErrors({});
                      }}
                    />
                    <span className="checkout__saved-label">Deliver somewhere else</span>
                    <span className="checkout__saved-body">Type a new address below.</span>
                  </label>
                </li>
              </ul>
            )}

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

            {chosen === 'new' && (
              <label className="checkout__remember">
                <input
                  type="checkbox"
                  checked={saveNew}
                  onChange={(e) => setSaveNew(e.target.checked)}
                />
                <span>Save this address for next time</span>
              </label>
            )}

            <p className="checkout__secure">
              <Icon name="shield" size={15} /> Payments are handled by Razorpay. Card details never
              touch Green Haven&rsquo;s servers.
            </p>
          </form>

          {testSheet && (
            <div
              className="testpay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="testpay-title"
            >
              <div className="testpay__card">
                <span className="testpay__badge">Test mode</span>
                <h2 id="testpay-title">Simulated payment</h2>
                <p>
                  No Razorpay account is connected yet, so no money moves and no card is asked
                  for. Choose an outcome and the rest of the order runs exactly as it would in
                  production.
                </p>

                <dl className="testpay__facts">
                  <div>
                    <dt>Order</dt>
                    <dd>{testSheet.orderNumber}</dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd>{formatPrice(testSheet.total)}</dd>
                  </div>
                </dl>

                <div className="testpay__actions">
                  <Button size="lg" icon="check" onClick={() => settleSimulated(testSheet, true)}>
                    Pay {formatPrice(testSheet.total)}
                  </Button>
                  <button
                    type="button"
                    className="testpay__fail"
                    onClick={() => settleSimulated(testSheet, false)}
                  >
                    Simulate a failed payment
                  </button>
                  <button
                    type="button"
                    className="testpay__cancel"
                    onClick={() => {
                      setTestSheet(null);
                      orderApi.cancel(testSheet.razorpayOrderId).catch(() => {});
                      setError('Payment cancelled. Your cart is still here whenever you are ready.');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

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

            {/* Sits above the totals it changes, so the effect of applying a
                code is visible in the same glance as the code itself. */}
            <div className="checkout__coupon">
              {coupon ? (
                <div className="checkout__coupon-applied">
                  <span>
                    <Icon name="check" size={15} />
                    <strong>{coupon.code}</strong>
                    {coupon.description && <em>{coupon.description}</em>}
                  </span>
                  <button type="button" onClick={removeCoupon}>
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <label htmlFor="checkout-coupon">Discount code</label>
                  <div className="checkout__coupon-entry">
                    <input
                      id="checkout-coupon"
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponError('');
                      }}
                      onKeyDown={(e) => {
                        // Enter here would submit the delivery form and open
                        // the payment sheet — emphatically not what someone
                        // pressing Enter in a coupon box is asking for.
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyCoupon();
                        }
                      }}
                      placeholder="Enter a code"
                      autoComplete="off"
                      spellCheck="false"
                      maxLength={40}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponBusy || !couponInput.trim()}
                    >
                      {couponBusy ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                </>
              )}
              {couponError && (
                <p className="checkout__coupon-error" role="alert">
                  {couponError}
                </p>
              )}
            </div>

            <dl>
              <div>
                <dt>Subtotal ({totalItems} items)</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="checkout__saved">
                  <dt>Discount ({coupon.code})</dt>
                  <dd>−{formatPrice(discount)}</dd>
                </div>
              )}
              <div>
                <dt>Delivery</dt>
                <dd>{delivery === 0 ? <em>Free</em> : formatPrice(delivery)}</dd>
              </div>
              {coupon?.tax > 0 && (
                <div>
                  <dt>GST</dt>
                  <dd>{formatPrice(coupon.tax)}</dd>
                </div>
              )}
              {/* Tax is only shown when some is charged. The figure the
                  customer is actually billed comes from the server; this is
                  the estimate the button is labelled with. */}
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
