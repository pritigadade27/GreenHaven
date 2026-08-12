import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

import { readJson, writeJson } from '../utils/storage.js';
import { useCatalogue } from './CatalogueContext.jsx';
import useBasketSync from '../hooks/useBasketSync.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'greenhaven.cart';

const isCart = (value) =>
  Array.isArray(value) &&
  value.every(
    (line) =>
      line &&
      typeof line === 'object' &&
      typeof line.id !== 'undefined' &&
      Number.isFinite(Number(line.price)) &&
      Number.isFinite(Number(line.quantity))
  );

function init() {
  return readJson(STORAGE_KEY, [], isCart).map((line) => ({
    ...line,
    price: Number(line.price),
    quantity: Math.max(1, Math.round(Number(line.quantity))),
  }));
}

const capped = (quantity, line) => {
  const ceiling = Number.isFinite(line?.stock) && line.stock > 0 ? line.stock : 99;
  return Math.max(1, Math.min(Math.round(quantity), ceiling));
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { product, quantity } = action;
      const existing = state.find((line) => line.id === product.id);
      if (existing) {
        return state.map((line) =>
          line.id === product.id
            ? { ...line, quantity: capped(line.quantity + quantity, line) }
            : line
        );
      }
      return [...state, { ...product, quantity: capped(quantity, product) }];
    }

    case 'REMOVE':
      return state.filter((line) => line.id !== action.id);

    case 'SET_QUANTITY':
      if (action.quantity < 1) return state.filter((line) => line.id !== action.id);
      return state.map((line) =>
        line.id === action.id ? { ...line, quantity: capped(action.quantity, line) } : line
      );

    case 'MERGE_SERVER': {
      const merged = [...state];
      action.lines.forEach(({ slug, quantity }) => {
        const product = action.lookup(slug);
        if (!product) return;
        const existing = merged.find((line) => line.slug === slug);
        if (existing) {
          existing.quantity = capped(Math.max(existing.quantity, quantity), existing);
        } else {
          merged.push({
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.image,
            stock: product.stock,
            quantity: capped(quantity, product),
          });
        }
      });
      return merged;
    }

    case 'CLEAR':
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    writeJson(STORAGE_KEY, items);
  }, [items]);

  const { getPlantBySlug, ready: catalogueReady } = useCatalogue();

  const restoreFromServer = useCallback(
    (remote) => {
      if (!Array.isArray(remote) || remote.length === 0) return;
      dispatch({ type: 'MERGE_SERVER', lines: remote, lookup: getPlantBySlug });
    },
    [getPlantBySlug]
  );

  const toPayload = useCallback(
    (lines) => ({ items: lines.map((l) => ({ slug: l.slug, quantity: l.quantity })) }),
    []
  );

  useBasketSync({
    path: '/basket/cart',
    local: items,
    onRestore: restoreFromServer,
    toPayload,
    enabled: catalogueReady,
  });

  const value = useMemo(() => {
    const totalItems = items.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0);

    return {
      items,
      totalItems,
      subtotal,
      isInCart: (id) => items.some((line) => line.id === id),
      maxFor: (id) => {
        const line = items.find((l) => l.id === id);
        return Number.isFinite(line?.stock) && line.stock > 0 ? line.stock : 99;
      },
      addToCart: (product, quantity = 1) => dispatch({ type: 'ADD', product, quantity }),
      removeFromCart: (id) => dispatch({ type: 'REMOVE', id }),
      setQuantity: (id, quantity) => dispatch({ type: 'SET_QUANTITY', id, quantity }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
