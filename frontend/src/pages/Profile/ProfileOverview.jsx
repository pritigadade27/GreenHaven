import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { profileApi } from '../../services/api.js';
import { formatPrice } from '../../utils/format.js';
import { Flash, SectionHead, Skeletons, formatDate } from './ProfileParts.jsx';

export default function ProfileOverview() {
  const { profile, reload } = useOutletContext();
  const { refresh } = useAuth();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  // Email lives behind its own form: it needs the password, and it does not take effect until the.
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [emailOpen, setEmailOpen] = useState(false);
  const [pendingToken, setPendingToken] = useState('');

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      avatarUrl: profile.avatarUrl || '',
    });
  }, [profile]);

  if (!profile) return <Skeletons rows={2} height={190} />;

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFlash(null);
    try {
      await profileApi.update(form);
      await reload();
      // The navbar greeting reads from the auth context, not from here.
      await refresh().catch(() => {});
      setEditing(false);
      setFlash({ tone: 'good', message: 'Your details have been saved.' });
    } catch (err) {
      setFieldErrors(err.fields || {});
      setFlash({ tone: 'bad', message: err.fields ? 'Please check the highlighted fields.' : err.message });
    } finally {
      setBusy(false);
    }
  }

  async function requestEmail(event) {
    event.preventDefault();
    setBusy(true);
    setFlash(null);
    try {
      const result = await profileApi.requestEmailChange(emailForm.email, emailForm.password);
      setPendingToken(result.token);
      setEmailOpen(false);
      setEmailForm({ email: '', password: '' });
      await reload();
      setFlash({ tone: 'good', message: result.message });
    } catch (err) {
      setFieldErrors(err.fields || {});
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmail() {
    setBusy(true);
    try {
      // api.js has already swapped the stored token by the time this resolves.
      await profileApi.confirmEmailChange(pendingToken);
      setPendingToken('');
      await reload();
      await refresh().catch(() => {});
      setFlash({ tone: 'good', message: 'Your email address has been changed.' });
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function dropEmailChange() {
    setBusy(true);
    try {
      await profileApi.cancelEmailChange();
      setPendingToken('');
      await reload();
      setFlash({ tone: 'good', message: 'That email change has been dropped.' });
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="psec">
      <SectionHead title="Personal information" subtitle="What we know about you, and where your orders go.">
        {!editing && (
          <button type="button" className="psec__ghost" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> Edit profile
          </button>
        )}
      </SectionHead>

      <Flash {...flash} onDismiss={() => setFlash(null)} />

      <div className="pcards">
        <article className="pcard pcard--wide">
          {editing ? (
            <form className="pform" onSubmit={save} noValidate>
              <label className="field">
                <span>Full name</span>
                <input type="text" value={form.fullName} onChange={update('fullName')} autoComplete="name" />
                {fieldErrors.fullName && <em role="alert">{fieldErrors.fullName}</em>}
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
                />
                {fieldErrors.phone && <em role="alert">{fieldErrors.phone}</em>}
                <small>The courier calls this number before delivering a live plant.</small>
              </label>

              <label className="field">
                <span>Profile picture</span>
                <input
                  type="url"
                  value={form.avatarUrl}
                  onChange={update('avatarUrl')}
                  placeholder="https://…"
                />
                {fieldErrors.avatarUrl && <em role="alert">{fieldErrors.avatarUrl}</em>}
                <small>Paste a link to an image. Leave it empty to use your initials.</small>
              </label>

              <div className="pform__actions">
                <Button type="submit" disabled={busy} icon="check">
                  {busy ? 'Saving…' : 'Save changes'}
                </Button>
                <button
                  type="button"
                  className="psec__ghost"
                  onClick={() => {
                    setEditing(false);
                    setFieldErrors({});
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="pfacts">
              <div>
                <dt>Full name</dt>
                <dd>{profile.fullName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{profile.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{profile.phone || <em>Not added yet</em>}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{formatDate(profile.joinedAt)}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="pcard pcard--stat">
          <Icon name="truck" size={22} />
          <strong>{profile.totalOrders}</strong>
          <span>Total orders</span>
        </article>

        <article className="pcard pcard--stat">
          <Icon name="card" size={22} />
          <strong>{formatPrice(profile.totalSpent)}</strong>
          <span>Total spent</span>
        </article>

        <article className="pcard pcard--stat">
          <Icon name="pin" size={22} />
          <strong>{profile.savedAddresses}</strong>
          <span>Saved addresses</span>
        </article>

        <article className="pcard pcard--stat">
          <Icon name="heart" size={22} />
          <strong>{profile.wishlistItems}</strong>
          <span>Wishlist items</span>
        </article>
      </div>

      <article className="pcard">
        <SectionHead
          title="Email address"
          subtitle="You sign in with this, so a change has to be confirmed before it takes effect."
        />

        {profile.pendingEmail ? (
          <div className="pemail">
            <p>
              <Icon name="mail" size={16} /> Waiting on confirmation for{' '}
              <strong>{profile.pendingEmail}</strong>. Until then you keep signing in with{' '}
              {profile.email}.
            </p>
            <div className="pform__actions">
              {pendingToken && (
                <Button onClick={confirmEmail} disabled={busy} icon="check">
                  Confirm the change
                </Button>
              )}
              <button type="button" className="psec__ghost" onClick={dropEmailChange} disabled={busy}>
                Drop it
              </button>
            </div>
            {pendingToken && (
              <small className="pemail__note">
                No mail server is connected yet, so the confirmation link is shown here rather
                than emailed.
              </small>
            )}
          </div>
        ) : emailOpen ? (
          <form className="pform" onSubmit={requestEmail} noValidate>
            <label className="field">
              <span>New email address</span>
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
                autoComplete="email"
              />
            </label>
            <label className="field">
              <span>Your password</span>
              <input
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
              />
              <small>Asked for so an unattended browser cannot move your account.</small>
            </label>
            <div className="pform__actions">
              <Button type="submit" disabled={busy} icon="arrowRight">
                {busy ? 'Sending…' : 'Request the change'}
              </Button>
              <button type="button" className="psec__ghost" onClick={() => setEmailOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="pemail">
            <p>
              <Icon name="mail" size={16} /> <strong>{profile.email}</strong>
            </p>
            <button type="button" className="psec__ghost" onClick={() => setEmailOpen(true)}>
              <Icon name="edit" size={16} /> Change email
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
