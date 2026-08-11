import { useState } from 'react';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { profileApi } from '../../services/api.js';
import { Flash, SectionHead } from './ProfileParts.jsx';

const BLANK = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Cheap, honest feedback on the new password — the server sets the real floor. */
function strengthOf(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { level: 'weak', label: 'Weak' };
  if (score === 3) return { level: 'fair', label: 'Fair' };
  if (score === 4) return { level: 'good', label: 'Good' };
  return { level: 'strong', label: 'Strong' };
}

export default function ProfilePassword() {
  const [form, setForm] = useState(BLANK);
  const [show, setShow] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  const strength = strengthOf(form.newPassword);
  const mismatch =
    form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function submit(event) {
    event.preventDefault();
    setFlash(null);

    // Caught here as well as on the server, so the round trip is not spent on
    // something the form can already see.
    if (mismatch) {
      setFlash({ tone: 'bad', message: 'The two new passwords do not match.' });
      return;
    }

    setBusy(true);
    try {
      const result = await profileApi.changePassword(
        form.currentPassword,
        form.newPassword,
        form.confirmPassword
      );
      setForm(BLANK);
      setFlash({ tone: 'good', message: result.message });
    } catch (err) {
      setFieldErrors(err.fields || {});
      setFlash({
        tone: 'bad',
        message: err.fields ? 'Please check the highlighted fields.' : err.message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="psec">
      <SectionHead
        title="Change password"
        subtitle="Your password is stored as a BCrypt hash — nobody here can read it, including us."
      />

      <Flash {...flash} onDismiss={() => setFlash(null)} />

      <article className="pcard pcard--narrow">
        <form className="pform" onSubmit={submit} noValidate>
          <label className="field">
            <span>Current password</span>
            <input
              type={show ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={update('currentPassword')}
              autoComplete="current-password"
            />
            {fieldErrors.currentPassword && <em role="alert">{fieldErrors.currentPassword}</em>}
          </label>

          <label className="field">
            <span>New password</span>
            <input
              type={show ? 'text' : 'password'}
              value={form.newPassword}
              onChange={update('newPassword')}
              autoComplete="new-password"
            />
            {fieldErrors.newPassword && <em role="alert">{fieldErrors.newPassword}</em>}
            {strength && (
              <span className={`pstrength is-${strength.level}`}>
                <i />
                <i />
                <i />
                <i />
                <em>{strength.label}</em>
              </span>
            )}
            <small>At least 8 characters. Longer beats complicated.</small>
          </label>

          <label className="field">
            <span>Confirm new password</span>
            <input
              type={show ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              autoComplete="new-password"
              aria-invalid={mismatch ? 'true' : undefined}
            />
            {mismatch && <em role="alert">These do not match.</em>}
          </label>

          <label className="pform__check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Show passwords</span>
          </label>

          <div className="pform__actions">
            <Button type="submit" disabled={busy} icon="lock">
              {busy ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </form>
      </article>

      <p className="psec__muted psec__note">
        <Icon name="shield" size={15} /> Changing your password does not sign you out of this
        browser. If you think someone else has your password, change it and sign out everywhere.
      </p>
    </section>
  );
}
