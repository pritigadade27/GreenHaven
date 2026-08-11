import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import art from '../../assets/images/plants/calathea.jpg';
import AuthShell from '../../components/auth/AuthShell.jsx';
import '../Login/Auth.css';

export default function Register() {
  const location = useLocation();
  const from = location.state?.from ?? '/';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');

    const next = {};
    if (form.name.trim().length < 2) next.name = 'Tell us what to call you.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email))
      next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'The two passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await register(form.name, form.email, form.password, form.phone.trim());
      // Honour where the customer was headed, exactly as Login does. Without
      // this, someone sent here from the cart is dropped on the home page.
      navigate(from, { replace: true });
    } catch (err) {
      // Server-side bean validation comes back per field; surface it there.
      if (err.fields) {
        const { fullName, ...rest } = err.fields;
        setErrors({ ...rest, ...(fullName ? { name: fullName } : {}) });
      } else {
        setServerError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      active="register"
      photo={art}
      caption={
        <>
          <blockquote>Every plant ships with a care card.</blockquote>
          <cite>Written for that species &mdash; not a generic leaflet.</cite>
          <ul className="auth__points">
            <li><Icon name="paw" size={15} /> Pet-safe plants clearly labelled</li>
            <li><Icon name="shield" size={15} /> 30-day plant promise</li>
            <li><Icon name="heart" size={15} /> Save a wishlist across devices</li>
          </ul>
        </>
      }
    >
          <span className="eyebrow">Join Green Haven</span>
          <h1>Create your account</h1>
          <p>Save plants, track orders, and get the care reminders that keep them alive.</p>

          <form className="auth__form" onSubmit={submit} noValidate>
            <div className={`field ${errors.name ? 'is-error' : ''}`}>
              <label htmlFor="reg-name">Full name</label>
              <div className="field__control">
                <Icon name="user" size={17} />
                <input
                  id="reg-name"
                  type="text"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Priti Gadade"
                  autoComplete="name"
                />
              </div>
              {errors.name && <p className="field__error">{errors.name}</p>}
            </div>

            <div className={`field ${errors.email ? 'is-error' : ''}`}>
              <label htmlFor="reg-email">Email</label>
              <div className="field__control">
                <Icon name="mail" size={17} />
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@greenhaven.in"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="field__error">{errors.email}</p>}
            </div>

            <div className={`field ${errors.phone ? 'is-error' : ''}`}>
              <label htmlFor="reg-phone">
                Phone <span className="field__optional">optional</span>
              </label>
              <div className="field__control">
                <Icon name="phone" size={17} />
                <input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder="10-digit mobile"
                  autoComplete="tel"
                />
              </div>
              {/* Not required here on purpose: an email address is enough to
                  open an account, and checkout asks for a number anyway, where
                  the courier actually needs it. */}
              {errors.phone && <p className="field__error">{errors.phone}</p>}
            </div>

            <div className={`field ${errors.password ? 'is-error' : ''}`}>
              <label htmlFor="reg-password">Password</label>
              <div className="field__control">
                <Icon name="shield" size={17} />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="field__error">{errors.password}</p>}
            </div>

            <div className={`field ${errors.confirm ? 'is-error' : ''}`}>
              <label htmlFor="reg-confirm">Confirm password</label>
              <div className="field__control">
                <Icon name="shield" size={17} />
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="Type it again"
                  autoComplete="new-password"
                />
              </div>
              {errors.confirm && <p className="field__error">{errors.confirm}</p>}
            </div>

            <Button size="lg" className="auth__submit" icon="arrowRight" type="submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>

            {serverError && (
              <p className="auth__notice auth__notice--error" role="alert">
                {serverError}
              </p>
            )}
          </form>
    </AuthShell>
  );
}
