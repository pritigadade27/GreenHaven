import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';

export default function AdminLogin() {
  const { login, isAdmin, ready } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && isAdmin) {
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    }
  }, [ready, isAdmin, navigate, location.state]);

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setError('');
  };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={submit} noValidate>
        <span className="admin-login__mark">
          <Icon name="shield" size={26} />
        </span>

        <h1>Staff sign-in</h1>
        <p className="admin-login__lede">This area is restricted to Green Haven staff.</p>

        <label className="admin-field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="admin-field">
          <span>Password</span>
          <div className="admin-field__control">
            <input
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={update('password')}
              autoComplete="current-password"
              required
            />
            <button type="button" onClick={() => setShow((v) => !v)}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {error && (
          <p className="admin-login__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="admin-login__note">
          Sessions end after a period of inactivity and signing in here closes any other
          session on your account.
        </p>
      </form>
    </div>
  );
}
