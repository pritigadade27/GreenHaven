import { useEffect, useRef, useState } from 'react';

import Button from '../../common/Button/Button.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import Stars from '../../common/Stars/Stars.jsx';
import { reviewApi } from '../../../services/api.js';

const WORDS = {
  1: 'It did not work out',
  2: 'Not what I hoped',
  3: 'It is fine',
  4: 'Happy with it',
  5: 'I would buy it again',
};

/**
 * The words for a rating, halves included.
 *
 * A half step lands between two sentiments, so it borrows the lower one and
 * says so — "It is fine, nearly" is honest about 3.5 in a way that silently
 * showing either neighbour's wording would not be.
 */
function words(rating) {
  if (!rating) return 'Tap a star — halves count';
  if (Number.isInteger(rating)) return WORDS[rating];
  return `${WORDS[Math.floor(rating)]}, nearly`;
}

const MAX_BODY = 2000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Write or edit a review.
 *
 * A dialog rather than an inline form: it is a deliberate act, and putting it
 * over the page keeps the product details underneath rather than pushing the
 * whole page around while someone types.
 */
export default function ReviewForm({ slug, productName, existing, orderNumber, onClose, onSaved }) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [images, setImages] = useState(existing?.images ?? []);
  const [uploading, setUploading] = useState(0);
  const [imageError, setImageError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const cardRef = useRef(null);
  const fileRef = useRef(null);

  // Escape closes, focus moves in on open and back to the opener on close, and
  // Tab stays inside — the same treatment ConfirmDialog gets.
  useEffect(() => {
    const opener = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = cardRef.current?.querySelectorAll(
        'button, input, textarea, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Focus the first star: that is where the form starts, and it is the one
    // field that cannot be left blank.
    const timer = setTimeout(
      () => cardRef.current?.querySelector('.stars--input input')?.focus(),
      60
    );
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  /**
   * Uploads each chosen file and keeps the paths.
   *
   * Uploading on selection rather than on submit means the thumbnails appear
   * while the review is still being written, and a rejected file is caught
   * before anyone has typed a paragraph.
   */
  async function addFiles(fileList) {
    const chosen = Array.from(fileList ?? []);
    if (!chosen.length) return;
    setImageError('');

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES} photographs.`);
      return;
    }
    const taking = chosen.slice(0, room);
    if (chosen.length > room) {
      setImageError(`Only the first ${room} ${room === 1 ? 'photograph was' : 'were'} added — ` +
        `${MAX_IMAGES} is the limit.`);
    }

    for (const file of taking) {
      // Checked here as well as on the server, so the answer is instant and
      // nobody waits for a 5 MB upload to be told it was 5 MB.
      if (!IMAGE_TYPES.includes(file.type)) {
        setImageError('Photographs must be JPEG, PNG or WebP.');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError('Each photograph must be 5 MB or smaller.');
        continue;
      }

      setUploading((n) => n + 1);
      try {
        const { url } = await reviewApi.uploadImage(file);
        setImages((current) =>
          current.length >= MAX_IMAGES || current.includes(url) ? current : [...current, url]
        );
      } catch (err) {
        setImageError(err.message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    // Caught here so the round trip is not spent on something the form can see.
    const local = {};
    if (!rating) local.rating = 'Choose a rating.';
    if (body.trim().length < 10) local.body = 'Tell other customers a little more — 10 characters at least.';
    setFieldErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const payload = { rating, title: title.trim(), body: body.trim(), images };
      if (existing) await reviewApi.edit(existing.id, payload);
      else await reviewApi.write(slug, payload);
      await onSaved();
    } catch (err) {
      setFieldErrors(err.fields || {});
      setError(err.fields ? 'Please check the highlighted fields.' : err.message);
      setBusy(false);
    }
  }

  return (
    <div
      className="rform"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rform-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="rform__card" ref={cardRef}>
        <header className="rform__head">
          <div>
            <h2 id="rform-title">{existing ? 'Edit your review' : 'Write a review'}</h2>
            <p>{productName}</p>
          </div>
          <button type="button" className="rform__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="rform__rating">
            <span className="rform__label">Your rating</span>
            <Stars value={rating} size={30} onChange={setRating} label="Your rating" />
            <span className="rform__words">{words(rating)}</span>
            {fieldErrors.rating && <em role="alert">{fieldErrors.rating}</em>}
          </div>

          <label className="field">
            <span>Title (optional)</span>
            <input
              type="text"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a few words"
            />
            {fieldErrors.title && <em role="alert">{fieldErrors.title}</em>}
          </label>

          <label className="field">
            <span>Your review</span>
            <textarea
              rows={5}
              value={body}
              maxLength={MAX_BODY}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How did it arrive? How is it doing now? Anything you wish you had known?"
            />
            <small className="rform__count">
              {body.length}/{MAX_BODY}
            </small>
            {fieldErrors.body && <em role="alert">{fieldErrors.body}</em>}
          </label>

          <div className="rform__photos">
            <span className="rform__label">Photographs (optional)</span>
            <p className="rform__hint">
              How it actually arrived is the part no description covers. Up to {MAX_IMAGES}.
            </p>

            <ul className="rform__thumbs">
              {images.map((url, index) => (
                <li key={url}>
                  <img src={url} alt={`Your photograph ${index + 1}`} loading="lazy" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((u) => u !== url))}
                    aria-label={`Remove photograph ${index + 1}`}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </li>
              ))}

              {images.length < MAX_IMAGES && (
                <li>
                  <button
                    type="button"
                    className="rform__add"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading > 0}
                  >
                    <Icon name="camera" size={20} />
                    <span>{uploading > 0 ? 'Uploading…' : 'Add'}</span>
                  </button>
                </li>
              )}
            </ul>

            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES.join(',')}
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                // Cleared so choosing the same file twice still fires a change.
                event.target.value = '';
              }}
            />
            {imageError && <em role="alert">{imageError}</em>}
          </div>

          {error && (
            <p className="rform__error" role="alert">
              {error}
            </p>
          )}

          {orderNumber && !existing && (
            <p className="rform__verified">
              <Icon name="check" size={14} /> This will show as a verified purchase from order{' '}
              {orderNumber}.
            </p>
          )}

          <div className="rform__actions">
            {/* Held back while a photograph is still uploading, or the review
                saves without the picture that is halfway to the server. */}
            <Button type="submit" size="lg" icon="check" disabled={busy || uploading > 0}>
              {busy ? 'Saving…' : existing ? 'Save changes' : 'Post review'}
            </Button>
            <button type="button" className="rform__cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
