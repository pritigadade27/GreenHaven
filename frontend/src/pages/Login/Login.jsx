import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import art from '../../assets/images/plants/monstera.jpg';
import AuthShell from '../../components/auth/AuthShell.jsx';
import './Auth.css';
import { useCatalogue } from '../../context/CatalogueContext.jsx';

export default function Login() {
  const { ALL_PLANTS } = useCatalogue();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const reason = state?.reason;
  const from = state?.from ?? '/';

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');

    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email))
      next.email = 'Enter a valid email address.';
    if (form.password.length < 6) next.password = 'Passwords are at least 6 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      active="login"
      photo={art}
      caption={
        <>
          <blockquote>Welcome back.</blockquote>
          <cite>Your cart, wishlist and care notes are exactly where you left them.</cite>
          <ul className="auth__points">
            <li>
              <Icon name="leaf" size={15} /> {ALL_PLANTS.length} species, all with care cards
            </li>
            <li><Icon name="truck" size={15} /> Free delivery over &#8377;999</li>
            <li><Icon name="shield" size={15} /> 30-day plant promise</li>
          </ul>
        </>
      }
    >
          {reason && (
            <p className="auth__reason" role="status">
              <Icon name="user" size={15} />
              {reason}
            </p>
          )}

          <span className="eyebrow">Welcome back</span>
          <h1>Sign in</h1>
          <p>Your cart and wishlist are waiting exactly where you left them.</p>

          <form className="auth__form" onSubmit={submit} noValidate>
            <div className={`field ${errors.email ? 'is-error' : ''}`}>
              <label htmlFor="login-email">Email</label>
              <div className="field__control">
                <Icon name="mail" size={17} />
                <input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@greenhaven.in"
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="field__error">{errors.email}</p>}
            </div>

            <div className={`field ${errors.password ? 'is-error' : ''}`}>
              <label htmlFor="login-password">Password</label>
              <div className="field__control">
                <Icon name="shield" size={17} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="field__error">{errors.password}</p>}
            </div>

            <div className="auth__row">
              <label>
  
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <Button size="lg" className="auth__submit" icon="arrowRight" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
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
