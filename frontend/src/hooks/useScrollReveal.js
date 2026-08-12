import { useCallback, useEffect, useState } from 'react';

/**
 * Drives the `.reveal` animation system in animations.css.
 *
 * Returns a CALLBACK ref, not a ref object, and that is the whole point. A
 * component that returns null on its first render — NewArrivals waits for the
 * catalogue to arrive before it renders anything — has no element for a ref
 * object to point at when the effect first runs. With a plain ref the effect
 * saw null, bailed out, and never ran again, because its dependencies were
 * stable primitives. The section eventually rendered with nothing observing it
 * and stayed at opacity 0 for good: a permanently blank band down the page.
 *
 * A callback ref fires whenever the element attaches or detaches, so the effect
 * re-runs the moment the section really exists.
 */
export default function useScrollReveal({ threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = {}) {
  const [root, setRoot] = useState(null);
  const ref = useCallback((node) => setRoot(node), []);

  useEffect(() => {
    if (!root) return undefined;

    const show = (el) => el.classList.add('is-visible');

    // Respect the OS setting rather than animating regardless — including for
    // anything that arrives later.
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

    // Last resort: anything still hidden after this is shown regardless. Re-armed
    // on every batch of new nodes, because a single one-shot timer fires before
    // late-arriving content exists and then never helps it.
    let failsafe = setTimeout(() => {
      root.querySelectorAll('.reveal:not(.is-visible)').forEach(show);
    }, 2500);

    const rearm = new MutationObserver(() => {
      clearTimeout(failsafe);
      failsafe = setTimeout(() => {
        root.querySelectorAll('.reveal:not(.is-visible)').forEach(show);
      }, 2500);
    });
    rearm.observe(root, { childList: true, subtree: true });

    return () => {
      clearTimeout(failsafe);
      mutations.disconnect();
      rearm.disconnect();
      observer.disconnect();
    };
  }, [root, threshold, rootMargin]);

  return ref;
}
