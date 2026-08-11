import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { authApi } from '../../services/api.js';
import '../Login/Auth.css';

/**
 * Asks for a reset link, then lets one be used.
 *
 * Both halves live on one screen because they are one task, and because
 * arriving with ?token=… straight from an email should not land on a page
 * asking for an address again.
 */
export default function ForgotPassword() {
  const [params] = useSearchParams();
  const tokenFromLink = params.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [token, setToken] = useState(tokenFromLink);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // A token in the URL means the customer came from the email, so go straight
  // to setting a new password.
  const stage = done ? 'done' : token ? 'reset' : 'request';

  async function request(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await authApi.forgotPassword(email.trim());
      setSent(result.message);
      // Present only while no mail server is connected; in production the
      // token arrives by email and never touches this response.
      if (result.token) setToken(result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(event) {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token.trim(), password, confirm);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth">
      <div className="auth__form-side">
        <div className="auth__card">
          <Link className="auth__back" to="/login">
            <Icon name="chevronRight" size={16} /> Back to sign in
          </Link>

          {stage === 'request' && (
            <>
              <h1>Forgotten your password?</h1>
              <p className="auth__lede">
                Give us the address on the account and we will send a link to set a new one.
              </p>

              <form onSubmit={request} noValidate>
                <div className="field">
                  <label htmlFor="fp-email">Email</label>
                  <div className="field__control">
                    <Icon name="mail" size={17} />
                    <input
                      id="fp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@greenhaven.in"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {sent && <p className="auth__note">{sent}</p>}
                {error && <p className="auth__error" role="alert">{error}</p>}

                <Button type="submit" size="lg" icon="arrowRight" disabled={busy}>
                  {busy ? 'Sending…' : 'Send the link'}
                </Button>
              </form>
            </>
          )}

          {stage === 'reset' && (
            <>
              <h1>Set a new password</h1>
              <p className="auth__lede">
                {sent
                  ? 'No mail server is connected yet, so the link opened straight away.'
                  : 'Choose something you have not used here before.'}
              </p>

              <form onSubmit={reset} noValidate>
                <div className="field">
                  <label htmlFor="fp-new">New password</label>
                  <div className="field__control">
                    <Icon name="lock" size={17} />
                    <input
                      id="fp-new"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <small>At least 8 characters. Longer beats complicated.</small>
                </div>

                <div className="field">
                  <label htmlFor="fp-confirm">Confirm new password</label>
                  <div className="field__control">
                    <Icon name="lock" size={17} />
                    <input
                      id="fp-confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {error && <p className="auth__error" role="alert">{error}</p>}

                <Button type="submit" size="lg" icon="check" disabled={busy}>
                  {busy ? 'Saving…' : 'Change my password'}
                </Button>
              </form>
            </>
          )}

          {stage === 'done' && (
            <>
              <h1>That is done</h1>
              <p className="auth__lede">
                Your password has been changed. The link you used will not work again.
              </p>
              <Button to="/login" size="lg" icon="arrowRight">
                Sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
