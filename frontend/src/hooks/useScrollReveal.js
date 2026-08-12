import { useCallback, useEffect, useState } from 'react';

export default function useScrollReveal({ threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = {}) {
  const [root, setRoot] = useState(null);
  const ref = useCallback((node) => setRoot(node), []);

  useEffect(() => {
    if (!root) return undefined;

    const show = (el) => el.classList.add('is-visible');

    // Skip animation when reduced motion
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

    const observeAll = () => {
      root.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => observer.observe(el));
    };

    observeAll();

    const mutations = new MutationObserver(observeAll);
    mutations.observe(root, { childList: true, subtree: true });

    // Failsafe reveal after delay
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
