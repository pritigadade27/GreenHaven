import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** React Router keeps the scroll position when the route changes, which makes a new page appear to open half way down. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return undefined;
    }

    // A hash is user-supplied via the URL bar and is not necessarily a valid CSS selector — '#1' and '#foo bar' both make querySelector throw.
    const find = () => {
      try {
        return document.querySelector(hash);
      } catch {
        return document.getElementById(hash.slice(1));
      }
    };

    // Honour the same preference the CSS does: scrollIntoView with behavior:'smooth' otherwise.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scroll, then settle.
    const timers = [];

    /** Where the page should end up, computed rather than delegated. */
    const wantedScrollY = (target) => {
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const top = target.getBoundingClientRect().top + window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return Math.max(0, Math.min(top - padding, max));
    };

    const aim = (behavior) => {
      const target = find();
      if (!target) return;

      const wanted = wantedScrollY(target);
      // Already there, to within a few pixels.
      if (Math.abs(window.scrollY - wanted) < 8) return;

      window.scrollTo({ top: wanted, behavior });
    };

    // First attempt once the destination page has painted its sections.
    timers.push(setTimeout(() => aim(still ? 'instant' : 'smooth'), 80));
    // Then correct for whatever reflowed underneath it.
    timers.push(setTimeout(() => aim('instant'), 700));
    timers.push(setTimeout(() => aim('instant'), 1400));

    return () => timers.forEach(clearTimeout);
  }, [pathname, hash]);

  return null;
}
