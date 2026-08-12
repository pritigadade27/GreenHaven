import { useState } from 'react';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { contactApi } from '../../services/api.js';
import '../Login/Auth.css';
import './Contact.css';

const SUBJECTS = [
  'A question about a plant',
  'My order',
  'Something arrived damaged',
  'Care advice',
  'Wholesale or bulk',
  'Something else',
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [failure, setFailure] = useState('');

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email))
      next.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) next.message = 'A little more detail would help us help you.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus('sending');
    setFailure('');
    try {
      await contactApi.send(form);
      setStatus('sent');
      setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' });
    } catch (err) {
      setErrors(err.fields || {});
      setFailure(err.fields ? 'Please check the highlighted fields.' : err.message);
      setStatus('error');
    }
  };

  return (
    <>
      <h1 className="sr-only">Contact Green Haven</h1>

      <section className="contact section">
        <div className="container contact__layout">
          <div className="contact__form-card">
            <h2>Send a message</h2>
            <p className="contact__form-lede">We answer within one working day, usually sooner.</p>

            <form className="auth__form" onSubmit={submit} noValidate>
              <div className="contact__row">
                <div className={`field ${errors.name ? 'is-error' : ''}`}>
                  <label htmlFor="c-name">Your name</label>
                  <div className="field__control">
                    <Icon name="user" size={17} />
                    <input id="c-name" type="text" value={form.name} onChange={update('name')} placeholder="Priti Gadade" />
                  </div>
                  {errors.name && <p className="field__error">{errors.name}</p>}
                </div>

                <div className={`field ${errors.email ? 'is-error' : ''}`}>
                  <label htmlFor="c-email">Email</label>
                  <div className="field__control">
                    <Icon name="mail" size={17} />
                    <input id="c-email" type="email" value={form.email} onChange={update('email')} placeholder="you@greenhaven.in" />
                  </div>
                  {errors.email && <p className="field__error">{errors.email}</p>}
                </div>
              </div>

              <div className="field">
                <label htmlFor="c-subject">What is it about?</label>
                <div className="field__control">
                  <Icon name="filter" size={17} />
                  <select id="c-subject" value={form.subject} onChange={update('subject')}>
                    {SUBJECTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`field ${errors.message ? 'is-error' : ''}`}>
                <label htmlFor="c-message">Message</label>
                <div className="field__control field__control--area">
                  <textarea
                    id="c-message"
                    rows={5}
                    value={form.message}
                    onChange={update('message')}
                    placeholder="Tell us about the room, the light, and what you are hoping to grow…"
                  />
                </div>
                {errors.message && <p className="field__error">{errors.message}</p>}
              </div>

              <Button
                size="lg"
                className="auth__submit"
                icon="arrowRight"
                type="submit"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </Button>

              <p
                className={`auth__notice ${status === 'sent' ? 'is-good' : ''} ${
                  status === 'error' ? 'is-bad' : ''
                }`}
                role="status"
                aria-live="polite"
              >
                {status === 'sent' &&
                  'Thank you — your message is with us. We answer within one working day.'}
                {status === 'error' && failure}
                {(status === 'idle' || status === 'sending') &&
                  'We answer within one working day, usually sooner.'}
              </p>
            </form>
          </div>

          <aside className="contact__aside">
            <ul className="contact__details">
              <li>
                <span>
                  <Icon name="pin" size={19} />
                </span>
                <div>
                  <strong>Visit the nursery</strong>
                  <p>Green Haven Nursery</p>
                </div>
              </li>
              <li>
                <span>
                  <Icon name="phone" size={19} />
                </span>
                <div>
                  <strong>Call us</strong>
                  <p>
                    <a href="tel:+919000000000">+91 90000 00000</a>
                    <br />
                    Tue&ndash;Sun, 9am&ndash;7pm
                  </p>
                </div>
              </li>
              <li>
                <span>
                  <Icon name="mail" size={19} />
                </span>
                <div>
                  <strong>Email</strong>
                  <p>
                    <a href="mailto:hello@greenhaven.in">hello@greenhaven.in</a>
                    <br />
                    <a href="mailto:care@greenhaven.in">care@greenhaven.in</a> for plant help
                  </p>
                </div>
              </li>
            </ul>

          </aside>
        </div>
      </section>
    </>
  );
}
