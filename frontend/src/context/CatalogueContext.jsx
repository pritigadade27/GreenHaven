import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import request from '../services/api.js';
import { resolveImage } from '../utils/productImages.js';

const CatalogueContext = createContext(null);

/** The catalogue, loaded from MySQL. */
export function CatalogueProvider({ children }) {
  const [state, setState] = useState({ products: [], categories: [], badges: {}, ready: false, error: '' });

  useEffect(() => {
    let alive = true;

    Promise.all([fetchEveryProduct(), request('/categories'), request('/badges')])
      .then(([products, categories, badges]) => {
        if (!alive) return;
        setState({
          products: products.map(adapt),
          categories: categories.map((c) => ({
            slug: c.slug,
            name: c.name,
            blurb: c.blurb,
            count: c.plantCount,
          })),
          badges: Object.fromEntries(badges.map((b) => [b.code, b])),
          ready: true,
          error: '',
        });
      })
      .catch((err) => {
        if (alive) setState((s) => ({ ...s, ready: true, error: err.message }));
      });

    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(() => {
    const { products, categories, badges, ready, error } = state;
    return {
      ready,
      error,
      CATALOGUE: products,
      CATEGORIES: categories,
      BADGES: badges,
      // Merchandise carries `isMerchandise`; the plant-only lists exclude it.
      ALL_PLANTS: products.filter((p) => !p.isMerchandise),
      PLANTS: products.filter((p) => !p.isMerchandise),
      getPlantBySlug: (slug) => products.find((p) => p.slug === slug),
      countInCategory: (slug) => products.filter((p) => p.category === slug).length,
      getFeatured: () => products.filter((p) => p.featured),
      getBestSellers: () => products.filter((p) => p.bestSeller),
      getRelated: (plant, limit = 4) =>
        products
          .filter((p) => p.category === plant?.category && p.slug !== plant?.slug)
          .slice(0, limit),
    };
  }, [state]);

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue() {
  const ctx = useContext(CatalogueContext);
  if (!ctx) throw new Error('useCatalogue must be used inside <CatalogueProvider>');
  return ctx;
}

/**
 * Fetches the whole catalogue, one page at a time.
 *
 * The API caps a page at 100 rows on purpose, so a crafted request cannot ask
 * for the entire table in one go. Asking for 500 silently returned 100 — the
 * shop showed 100 of 154 products and every category count was wrong, with no
 * error anywhere. Respect the cap and page through it instead of raising it.
 */
async function fetchEveryProduct() {
  const SIZE = 100;
  const first = await request(`/plants?page=0&size=${SIZE}`);
  const products = [...first.content];

  for (let page = 1; page < first.totalPages; page += 1) {
    // Sequential rather than parallel: three requests against a local API is
    // nothing, and it keeps the order stable and the server unhurried.
    const next = await request(`/plants?page=${page}&size=${SIZE}`);
    products.push(...next.content);
  }

  return products;
}

/** API shape -> the shape the components already expect. */
function adapt(dto) {
  return {
    ...dto,
    short: dto.shortDescription ?? dto.short ?? '',
    tip: dto.careTip ?? dto.tip ?? '',
    image: resolveImage(dto.image),
    badges: dto.badges ?? [],
    isMerchandise: Boolean(dto.merchandise ?? dto.isMerchandise),
  };
}
