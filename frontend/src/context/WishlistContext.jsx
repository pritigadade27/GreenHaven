import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJson, writeJson } from '../utils/storage.js';
import { useCatalogue } from './CatalogueContext.jsx';
import useBasketSync from '../hooks/useBasketSync.js';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'greenhaven.wishlist';

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() =>
    readJson(STORAGE_KEY, [], (v) => Array.isArray(v) && v.every((i) => i && typeof i === 'object'))
  );

  useEffect(() => {
    writeJson(STORAGE_KEY, items);
  }, [items]);

  const { getPlantBySlug, ready: catalogueReady } = useCatalogue();

  const restoreFromServer = useCallback(
    (slugs) => {
      if (!Array.isArray(slugs) || slugs.length === 0) return;
      setItems((current) => {
        const merged = [...current];
        slugs.forEach((slug) => {
          if (merged.some((item) => item.slug === slug)) return;
          const product = getPlantBySlug(slug);
          if (product) merged.push(product);
        });
        return merged;
      });
    },
    [getPlantBySlug]
  );

  const toPayload = useCallback((list) => ({ slugs: list.map((item) => item.slug) }), []);

  useBasketSync({
    path: '/basket/wishlist',
    local: items,
    onRestore: restoreFromServer,
    toPayload,
    enabled: catalogueReady,
  });

  const toggleWishlist = useCallback((product) => {
    setItems((current) =>
      current.some((item) => item.id === product.id)
        ? current.filter((item) => item.id !== product.id)
        : [...current, product]
    );
  }, []);

  const value = useMemo(
    () => ({
      items,
      totalItems: items.length,
      isWishlisted: (id) => items.some((item) => item.id === id),
      toggleWishlist,
      removeFromWishlist: (id) => setItems((c) => c.filter((item) => item.id !== id)),
      clearWishlist: () => setItems([]),
    }),
    [items, toggleWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
