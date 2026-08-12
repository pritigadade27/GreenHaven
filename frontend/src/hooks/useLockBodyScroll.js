import { useEffect } from 'react';

let locks = 0;
let original = null;

export default function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    if (locks === 0) {
      original = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };
      const gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    }
    locks += 1;

    return () => {
      locks -= 1;
      if (locks === 0 && original) {
        document.body.style.overflow = original.overflow;
        document.body.style.paddingRight = original.paddingRight;
        original = null;
      }
    };
  }, [locked]);
}
