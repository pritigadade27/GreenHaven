import { useState } from 'react';

import Icon from '../../common/Icon/Icon.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import { contactApi } from '../../../services/api.js';
import './Newsletter.css';

export default function Newsletter() {
  const ref = useScrollReveal();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');   // idle | sending | error | done
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    // Catches obvious typos before a round trip. The server validates too.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setMessage('That does not look like an email address — check and try again.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      const reply = await contactApi.subscribe(email);
      // Subscribing twice is not an error worth scolding anyone over, so the
      // server's own wording is used — it covers both cases gracefully.
      setMessage(reply?.message || 'Thank you. Look for the first letter next month.');
      setStatus('done');
      setEmail('');
    } catch (err) {
      setMessage(err.message);
      setStatus('error');
    }
  };

  return (
    <section className="newsletter section" ref={ref}>
      <div className="container">
        <div className="newsletter__panel reveal reveal--zoom">
          <span className="newsletter__leaf newsletter__leaf--a float" aria-hidden="true">
            <Icon name="leaf" size={120} strokeWidth={0.9} />
          </span>
          <span className="newsletter__leaf newsletter__leaf--b float--slow" aria-hidden="true">
            <Icon name="leaf" size={90} strokeWidth={0.9} />
          </span>

          <div className="newsletter__copy">
            <span className="eyebrow">The Green Haven letter</span>
            <h2>One email a month. Seasonal care, nothing else.</h2>
            <p>
              What to water less of in monsoon, what to feed before spring, what is about to come
              into flower. No daily offers, and we never sell your address.
            </p>
          </div>

          <form className="newsletter__form" onSubmit={submit} noValidate>
            <div className={`newsletter__field ${status === 'error' ? 'is-error' : ''}`}>
              <Icon name="mail" size={19} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                placeholder="you@greenhaven.in"
                aria-label="Email address"
              />
              <button type="submit" disabled={status === 'sending'}>
                <span>{status === 'sending' ? 'Signing up…' : 'Subscribe'}</span>
                <Icon name="arrowRight" size={17} />
              </button>
            </div>

            <p className="newsletter__note" role="status" aria-live="polite">
              {(status === 'error' || status === 'done') && message}
              {(status === 'idle' || status === 'sending') && 'Unsubscribe in one click, any time.'}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
