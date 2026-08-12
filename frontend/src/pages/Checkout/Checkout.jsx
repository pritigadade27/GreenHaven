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

  const [addresses, setAddresses] = useState([]);
  const [chosen, setChosen] = useState('new');
  const [saveNew, setSaveNew] = useState(true);
  const settled = useRef(false);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const localDelivery = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const discount = coupon?.discount ?? 0;
  const delivery = coupon ? coupon.shipping : localDelivery;
  const total = coupon ? coupon.total : subtotal + localDelivery;

  useEffect(() => {
    if (ready && !isSignedIn) {
      navigate('/login', {
        replace: true,
        state: { from: '/checkout', reason: 'Please sign in to complete your order.' },
      });
    }
  }, [ready, isSignedIn, navigate]);

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
      const order = await orderApi.start(
        form,
        items.map((line) => ({ slug: line.slug, quantity: line.quantity })),
        coupon?.code,
      );

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
            if (settled.current) return;
            settled.current = true;
            orderApi.cancel(order.razorpayOrderId).catch(() => {});
            setBusy(false);
            setError('Payment cancelled. Your cart is still here whenever you are ready.');
          },
        },
        handler: async (response) => {
          settled.current = true;
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
