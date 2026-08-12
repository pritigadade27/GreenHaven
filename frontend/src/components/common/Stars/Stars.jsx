import { useState } from 'react';

import Icon from '../Icon/Icon.jsx';
import './Stars.css';

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const label = (n) => `${n} star${n === 1 ? '' : 's'}`;

export default function Stars({
  value = 0,
  size = 18,
  onChange,
  name = 'rating',
  label: groupLabel = 'Rating',
}) {
  const interactive = typeof onChange === 'function';
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
