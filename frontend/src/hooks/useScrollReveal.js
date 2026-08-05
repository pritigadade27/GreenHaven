import { useEffect, useRef } from 'react';

/** Drives the `.reveal` animation system in animations.css. */
export default function useScrollReveal({ threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    const show = (el) => el.classList.add('is-visible');

    // Respect the OS setting rather than animating regardless — including for
    // anything that arrives after this runs.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const revealAll = () => root.querySelectorAll('.reveal').forEach(show);
      revealAll();
      const mutations = new MutationObserver(revealAll);
      mutations.observe(root, { childList: true, subtree: true });
      return () => mutations.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold, rootMargin }
    );

    /** Observe anything not already handled. Safe to call repeatedly. */
    const observeAll = () => {
      root.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => observer.observe(el));
    };

    observeAll();

    // Catch the cards and tiles rendered once the catalogue resolves.
    const mutations = new MutationObserver(observeAll);
    mutations.observe(root, { childList: true, subtree: true });

    // Safety net.
    const failsafe = setTimeout(() => {
      root.querySelectorAll('.reveal:not(.is-visible)').forEach(show);
    }, 2500);

    return () => {
      clearTimeout(failsafe);
      mutations.disconnect();
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return ref;
}
