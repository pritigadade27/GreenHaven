import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return undefined;
    }

    const find = () => {
      try {
        return document.querySelector(hash);
      } catch {
        return document.getElementById(hash.slice(1));
      }
    };

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timers = [];

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
      if (Math.abs(window.scrollY - wanted) < 8) return;

      window.scrollTo({ top: wanted, behavior });
    };

    timers.push(setTimeout(() => aim(still ? 'instant' : 'smooth'), 80));
    timers.push(setTimeout(() => aim('instant'), 700));
    timers.push(setTimeout(() => aim('instant'), 1400));

    return () => timers.forEach(clearTimeout);
  }, [pathname, hash]);

  return null;
}
