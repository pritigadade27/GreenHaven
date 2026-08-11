import { useState } from 'react';

import Icon from '../Icon/Icon.jsx';
import './Stars.css';

/** 0.5, 1, 1.5 … 5 — every value a reviewer may give, in order. */
const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const label = (n) => `${n} star${n === 1 ? '' : 's'}`;

/**
 * A row of stars.
 *
 * Read-only by default. Pass `onChange` and it becomes a radio group the
 * keyboard can drive — arrow keys and Tab both work, because a rating control
 * that only responds to a mouse excludes people for no reason.
 *
 * Ratings are given and drawn to the half star: 4.3 reads as four and a half
 * rather than being rounded to four, which is what shoppers expect and what
 * every other shop does.
 */
export default function Stars({
  value = 0,
  size = 18,
  onChange,
  name = 'rating',
  label: groupLabel = 'Rating',
}) {
  const interactive = typeof onChange === 'function';
  // What the pointer is over, so the row previews the rating under the cursor.
  // With halves this is not decoration: the left and right halves of one star
  // mean different things and nothing else says which one you are on.
  const [hovered, setHovered] = useState(null);

  if (interactive) {
    const shown = hovered ?? value;
    return (
      <fieldset
        className="stars stars--input"
        onMouseLeave={() => setHovered(null)}
      >
        <legend className="sr-only">{groupLabel}</legend>
        {[1, 2, 3, 4, 5].map((n) => {
          const half = shown === n - 0.5;
          return (
            <span key={n} className="stars__slot">
              <Icon name="star" size={size} filled={n <= shown} />
              {half && (
                <span className="stars__half">
                  <Icon name="star" size={size} filled />
                </span>
              )}

              {/* Two hit areas over each star, left half and right. They carry
                  the radios, so the control is a real radio group underneath
                  and the arrow keys step through it half a star at a time. */}
              {[n - 0.5, n].map((step) => (
                <label
                  key={step}
                  className={`stars__pick ${step === n ? 'is-right' : 'is-left'}`}
                  title={label(step)}
                  onMouseEnter={() => setHovered(step)}
                >
                  <input
                    type="radio"
                    name={name}
                    value={step}
                    checked={value === step}
                    onChange={() => onChange(step)}
                    onFocus={() => setHovered(step)}
                    onBlur={() => setHovered(null)}
                  />
                  <span className="sr-only">{label(step)}</span>
                </label>
              ))}
            </span>
          );
        })}
      </fieldset>
    );
  }

  const rounded = Math.round(value * 2) / 2;

  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        // A half star is the filled glyph clipped down the middle, laid over
        // the empty one — no second icon and no fractional path maths.
        const half = rounded === n - 0.5;
        return (
          <span key={n} className={`stars__one ${half ? 'is-half' : ''}`} aria-hidden="true">
            <Icon name="star" size={size} filled={n <= rounded} />
            {half && (
              <span className="stars__half">
                <Icon name="star" size={size} filled />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export { STEPS };
