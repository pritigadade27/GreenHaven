import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ProductCard from '../../components/product/ProductCard/ProductCard.jsx';
import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import { useCatalogue } from '../../context/CatalogueContext.jsx';
import { formatPrice } from '../../utils/format.js';
import './Shop.css';

const SORTS = {
  featured: { label: 'Featured', fn: (a, b) => Number(!!b.featured) - Number(!!a.featured) },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  rating: { label: 'Best rated', fn: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  popular: { label: 'Most reviewed', fn: (a, b) => (b.reviews ?? 0) - (a.reviews ?? 0) },
  name: { label: 'A – Z', fn: (a, b) => a.name.localeCompare(b.name) },
};

export default function Shop() {
  const { CATALOGUE, CATEGORIES, ready, error } = useCatalogue();

  const MAX_PRICE = useMemo(
    () => (CATALOGUE.length ? Math.max(...CATALOGUE.map((p) => p.price)) : 5999),
    [CATALOGUE]
  );
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const newArrivalOnly = params.get('newArrival') === 'true';

  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [petSafeOnly, setPetSafeOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [light, setLight] = useState('');
  const [sort, setSort] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOGUE.filter((p) => {
      if (category && p.category !== category) return false;
      if (petSafeOnly && p.petSafety !== 'safe') return false;
      if (difficulty && p.difficulty !== difficulty) return false;
      if (light && p.light !== light) return false;
      if (p.price > maxPrice) return false;
      if (inStockOnly && !(p.stock > 0)) return false;
      if (newArrivalOnly && !p.newArrival) return false;
      if (!q) return true;
      return [p.name, p.botanical, p.short, p.category]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    }).sort(SORTS[sort].fn);
  }, [CATALOGUE, query, category, petSafeOnly, difficulty, light, maxPrice,
      inStockOnly, newArrivalOnly, sort]);

  const PAGE_SIZE = 24;
  const [page, setPage] = useState(1);
  const gridRef = useRef(null);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [CATALOGUE, query, category, petSafeOnly, difficulty, light, maxPrice,
      inStockOnly, newArrivalOnly, sort]);

  const goToPage = (next) => {
    setPage(next);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeCount =
    (category ? 1 : 0) +
    (petSafeOnly ? 1 : 0) +
    (difficulty ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (newArrivalOnly ? 1 : 0) +
    (light ? 1 : 0) +
    (maxPrice < MAX_PRICE ? 1 : 0);

  const clearAll = () => {
    setParams(query ? { q: query } : {}, { replace: true });
    setMaxPrice(MAX_PRICE);
    setPetSafeOnly(false);
    setInStockOnly(false);
    setDifficulty('');
    setLight('');
  };

  return (
    <>
      <h1 className="sr-only">
        {category
          ? `Shop ${CATEGORIES.find((c) => c.slug === category)?.name ?? category}`
          : 'Shop all plants and garden supplies'}
      </h1>

      <section className="shop section">
        <div className="container shop__layout">
          <aside className={`shop__filters ${filtersOpen ? 'is-open' : ''}`}>
            <div className="shop__filters-head">
              <h2>Filters {activeCount > 0 && <span>{activeCount}</span>}</h2>
              {activeCount > 0 && (
                <button type="button" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>

            <div className="filter-group">
              <h3>Category</h3>
              <ul>
                <li>
                  <button
                    type="button"
                    className={!category ? 'is-active' : ''}
                    onClick={() => setParam('category', '')}
                  >
                    Everything <em>{CATALOGUE.length}</em>
                  </button>
                </li>
                {CATEGORIES.map((c) => {
                  const count = CATALOGUE.filter((p) => p.category === c.slug).length;
                  if (!count) return null;
                  return (
                    <li key={c.slug}>
                      <button
                        type="button"
                        className={category === c.slug ? 'is-active' : ''}
                        onClick={() => setParam('category', c.slug)}
                      >
                        {c.name} <em>{count}</em>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="filter-group">
              <h3>Maximum price</h3>
              <input
                type="range"
                min={199}
                max={MAX_PRICE}
                step={50}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                aria-label="Maximum price"
              />
              <div className="filter-range">
                <span>Up to</span>
                <strong>{formatPrice(maxPrice)}</strong>
                {maxPrice >= MAX_PRICE && <span>&mdash; everything</span>}
              </div>
            </div>

            <div className="filter-group">
              <h3>Availability</h3>
              <label className="filter-check">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                <span>In stock only</span>
              </label>
              <label className="filter-check">
                <input
                  type="checkbox"
                  checked={newArrivalOnly}
                  onChange={(e) => setParam('newArrival', e.target.checked ? 'true' : '')}
                />
                <span>New arrivals only</span>
              </label>
            </div>

            <div className="filter-group">
              <h3>Pet safety</h3>
              <label className="filter-check">
                <input
                  type="checkbox"
                  checked={petSafeOnly}
                  onChange={(e) => setPetSafeOnly(e.target.checked)}
                />
                <span>Only show pet-safe plants</span>
              </label>
            </div>

            <div className="filter-group">
              <h3>Care level</h3>
              <ul className="filter-pills">
                {['Easy', 'Moderate', 'Expert'].map((level) => (
                  <li key={level}>
                    <button
                      type="button"
                      className={difficulty === level ? 'is-active' : ''}
                      onClick={() => setDifficulty(difficulty === level ? '' : level)}
                    >
                      {level}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="filter-group">
              <h3>Light in your room</h3>
              <ul className="filter-pills">
                {[
                  ['low', 'Low light'],
                  ['medium', 'Bright indirect'],
                  ['high', 'Full sun'],
                ].map(([value, label]) => (
                  <li key={value}>
                    <button
                      type="button"
                      className={light === value ? 'is-active' : ''}
                      onClick={() => setLight(light === value ? '' : value)}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="shop__results">
            <div className="shop__bar">
              <div className="shop__search">
                <Icon name="search" size={18} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setParam('q', e.target.value)}
                  placeholder="Search plants, pots, seeds&hellip;"
                  aria-label="Search"
                />
              </div>

              <button
                type="button"
                className="shop__filter-toggle"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <Icon name="filter" size={17} />
                Filters {activeCount > 0 && `(${activeCount})`}
              </button>

              <label className="shop__sort">
                <span>Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {Object.entries(SORTS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="shop__count">
              {ready ? results.length : '—'}{' '}
              {results.length === 1 ? 'product' : 'products'}
              {query && <> matching &ldquo;{query}&rdquo;</>}
              {pageCount > 1 && (
                <>
                  {' '}
                  &middot; page {safePage} of {pageCount}
                </>
              )}
            </p>

            {!ready ? (
              <div className="shop__grid" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="shop__skeleton">
                    <span className="skeleton" style={{ aspectRatio: '4 / 3.4' }} />
                    <span className="skeleton" style={{ height: 14, width: '45%' }} />
                    <span className="skeleton" style={{ height: 20, width: '80%' }} />
                    <span className="skeleton" style={{ height: 14, width: '60%' }} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="shop__empty">
                <Icon name="close" size={44} />
                <h3>The catalogue could not be loaded</h3>
                <p>{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="shop__grid" ref={gridRef}>
                  {visible.map((plant) => (
                    <ProductCard key={plant.id} plant={plant} />
                  ))}
                </div>

                {pageCount > 1 && (
                  <nav className="shop__pages" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                    >
                      <Icon name="chevronRight" size={16} />
                    </button>

                    {Array.from({ length: pageCount }, (_, i) => i + 1)
                      .filter(
                        (n) =>
                          n === 1 ||
                          n === pageCount ||
                          Math.abs(n - safePage) <= 1
                      )
                      .map((n, i, shownPages) => (
                        <span key={n}>
                          {i > 0 && n - shownPages[i - 1] > 1 && (
                            <span className="shop__gap" aria-hidden="true">
                              &hellip;
                            </span>
                          )}
                          <button
                            type="button"
                            className={n === safePage ? 'is-current' : ''}
                            aria-current={n === safePage ? 'page' : undefined}
                            onClick={() => goToPage(n)}
                          >
                            {n}
                          </button>
                        </span>
                      ))}

                    <button
                      type="button"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage === pageCount}
                      aria-label="Next page"
                    >
                      <Icon name="chevronRight" size={16} />
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <div className="shop__empty">
                <Icon name="leaf" size={44} />
                <h3>Nothing matches that yet</h3>
                <p>
                  Try widening the price range or clearing a filter &mdash; the catalogue runs to{' '}
                  {CATALOGUE.length} products, so something in here will suit.
                </p>
                <Button variant="outline" onClick={clearAll}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
