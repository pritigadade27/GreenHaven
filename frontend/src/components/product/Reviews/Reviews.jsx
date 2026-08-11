import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../../common/Button/Button.jsx';
import Icon from '../../common/Icon/Icon.jsx';
import Stars from '../../common/Stars/Stars.jsx';
import ConfirmDialog from '../../common/ConfirmDialog/ConfirmDialog.jsx';
import ReviewForm from './ReviewForm.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { reviewApi } from '../../../services/api.js';
import './Reviews.css';

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/**
 * The photographs on a review, if there are any.
 *
 * Thumbnails rather than full-width images: several reviews with pictures
 * would otherwise turn the list into a scroll no one reads to the end of.
 */
function Photos({ images, onOpen }) {
  if (!images?.length) return null;
  return (
    <ul className="review__photos">
      {images.map((url, index) => (
        <li key={url}>
          <button type="button" onClick={() => onOpen({ images, index })}>
            <img src={url} alt={`Customer photograph ${index + 1}`} loading="lazy" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * One photograph, enlarged.
 *
 * Worth the extra component because the detail people want from a review
 * picture — how full the pot was, what the leaves looked like on arrival — is
 * exactly what a 72px thumbnail cannot show.
 */
function Lightbox({ images, index, onClose }) {
  const [at, setAt] = useState(index);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setAt((n) => (n + 1) % images.length);
      if (event.key === 'ArrowLeft') setAt((n) => (n - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [images.length, onClose]);

  return (
    <div
      className="rlight"
      role="dialog"
      aria-modal="true"
      aria-label="Customer photograph"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button type="button" className="rlight__close" onClick={onClose} aria-label="Close">
        <Icon name="close" size={22} />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          className="rlight__step rlight__step--prev"
          onClick={() => setAt((n) => (n - 1 + images.length) % images.length)}
          aria-label="Previous photograph"
        >
          <Icon name="chevronRight" size={22} />
        </button>
      )}

      <img src={images[at]} alt={`Customer photograph ${at + 1} of ${images.length}`} />

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="rlight__step rlight__step--next"
            onClick={() => setAt((n) => (n + 1) % images.length)}
            aria-label="Next photograph"
          >
            <Icon name="chevronRight" size={22} />
          </button>
          <span className="rlight__count">
            {at + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Ratings and reviews for one product.
 *
 * Everything shown here comes from the API, not from the catalogue's seeded
 * numbers: the average, the count and the star breakdown are all computed from
 * reviews people actually wrote.
 */
export default function Reviews({ slug, name }) {
  const { isSignedIn, ready } = useAuth();

  const [data, setData] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState('');
  const [writing, setWriting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [page, setPage] = useState(0);
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(
    (which = 0) =>
      reviewApi
        .list(slug, which)
        .then((result) => {
          setData(result);
          setPage(which);
          return result;
        })
        .catch((err) => {
          setError(err.message);
          return null;
        }),
    [slug]
  );

  useEffect(() => {
    setData(null);
    setEligibility(null);
    load(0);
  }, [load]);

  // Asked separately, and only when signed in: an anonymous reader has nothing
  // to check and should not be sent a 403 for reading a product page.
  const checkEligibility = useCallback(() => {
    if (!isSignedIn) return Promise.resolve(null);
    return reviewApi
      .eligibility(slug)
      .then((result) => {
        setEligibility(result);
        return result;
      })
      .catch(() => null);
  }, [isSignedIn, slug]);

  useEffect(() => {
    if (ready) checkEligibility();
  }, [ready, checkEligibility]);

  const refresh = async () => {
    await load(0);
    await checkEligibility();
  };

  async function remove() {
    const target = removing;
    setRemoving(null);
    try {
      await reviewApi.remove(target.id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  const summary = data?.summary;
  const total = summary?.total ?? 0;
  const mine = eligibility?.existing;

  return (
    <section className="reviews section" id="reviews">
      <div className="container">
        <header className="reviews__head">
          <div>
            <span className="section__eyebrow">What customers say</span>
            <h2 className="section__title">Ratings &amp; reviews</h2>
          </div>

          {/* Only a customer who has had this plant delivered sees a way in. */}
          {eligibility?.canReview && (
            <Button icon="star" onClick={() => setWriting(true)}>
              Write a review
            </Button>
          )}
        </header>

        {error && (
          <p className="reviews__error" role="alert">
            <Icon name="shield" size={16} /> {error}
          </p>
        )}

        {data === null ? (
          <div className="reviews__skeletons" aria-hidden="true">
            <span className="skeleton" style={{ height: 168 }} />
            <span className="skeleton" style={{ height: 108 }} />
            <span className="skeleton" style={{ height: 108 }} />
          </div>
        ) : (
          <div className="reviews__grid">
            {/* ---- the numbers ---- */}
            <aside className="reviews__summary">
              {total === 0 ? (
                <div className="reviews__none">
                  <Icon name="star" size={34} />
                  <h3>No reviews yet</h3>
                  <p>Be the first to tell other gardeners how {name} settled in.</p>
                </div>
              ) : (
                <>
                  <div className="reviews__score">
                    <strong>{Number(summary.average).toFixed(1)}</strong>
                    <Stars value={Number(summary.average)} size={20} />
                    <span>
                      {total} rating{total === 1 ? '' : 's'}
                    </span>
                  </div>

                  <ul className="reviews__bars">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = summary.breakdown[star] ?? 0;
                      const share = total === 0 ? 0 : Math.round((count / total) * 100);
                      return (
                        <li key={star}>
                          <span className="reviews__bar-label">
                            {star} <Icon name="star" size={12} filled />
                          </span>
                          <span className="reviews__bar" aria-hidden="true">
                            <i style={{ width: `${share}%` }} />
                          </span>
                          <span className="reviews__bar-count">{count}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {/* Why the button is or is not there. Saying so beats hiding it. */}
              {ready && !isSignedIn && (
                <p className="reviews__note">
                  <Link to="/login">Sign in</Link> to review a plant you have received.
                </p>
              )}
              {eligibility && !eligibility.canReview && !eligibility.alreadyReviewed && (
                <p className="reviews__note">{eligibility.reason}</p>
              )}
            </aside>

            {/* ---- what people wrote ---- */}
            <div className="reviews__list">
              {mine && (
                <article className="review review--mine">
                  <header className="review__head">
                    <div>
                      <Stars value={mine.rating} size={16} />
                      {mine.title && <h3>{mine.title}</h3>}
                    </div>
                    <span className="review__badge review__badge--mine">Your review</span>
                  </header>
                  <p className="review__body">{mine.body}</p>
                  <Photos images={mine.images} onOpen={setLightbox} />
                  <footer className="review__foot">
                    <span>
                      {formatDate(mine.createdAt)}
                      {mine.updatedAt && <em> &middot; edited</em>}
                    </span>
                    <span className="review__actions">
                      <button type="button" onClick={() => setEditing(mine)}>
                        <Icon name="edit" size={14} /> Edit
                      </button>
                      <button type="button" onClick={() => setRemoving(mine)}>
                        <Icon name="trash" size={14} /> Delete
                      </button>
                    </span>
                  </footer>
                </article>
              )}

              {data.reviews
                .filter((review) => !review.mine)
                .map((review) => (
                  <article key={review.id} className="review">
                    <header className="review__head">
                      <div>
                        <Stars value={review.rating} size={16} />
                        {review.title && <h3>{review.title}</h3>}
                      </div>
                      {review.verifiedPurchase && (
                        <span className="review__badge">
                          <Icon name="check" size={13} /> Verified purchase
                        </span>
                      )}
                    </header>
                    <p className="review__body">{review.body}</p>
                    <Photos images={review.images} onOpen={setLightbox} />
                    <footer className="review__foot">
                      <span>
                        <strong>{review.author}</strong> &middot; {formatDate(review.createdAt)}
                        {review.updatedAt && <em> &middot; edited</em>}
                      </span>
                    </footer>
                  </article>
                ))}

              {total === 0 && !mine && (
                <p className="reviews__empty">
                  Once someone has received this plant and written about it, their review will
                  appear here.
                </p>
              )}

              {data.totalPages > 1 && (
                <div className="reviews__pager">
                  <button type="button" disabled={page === 0} onClick={() => load(page - 1)}>
                    Newer
                  </button>
                  <span>
                    Page {page + 1} of {data.totalPages}
                  </span>
                  <button type="button" disabled={!data.hasMore} onClick={() => load(page + 1)}>
                    Older
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(writing || editing) && (
        <ReviewForm
          slug={slug}
          productName={name}
          existing={editing}
          orderNumber={eligibility?.orderNumber}
          onClose={() => {
            setWriting(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setWriting(false);
            setEditing(null);
            await refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete your review?"
        message="It will be removed from this product page and the rating will be recalculated without it. You can write a new one afterwards."
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
      />

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}
