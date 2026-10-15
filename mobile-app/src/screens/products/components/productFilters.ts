import i18n from '../../../i18n';
import type { Product, ProductQuery } from '../../../types/models';
import { getStartingPrice } from '../../../utils/pricing';

/**
 * Sort choices used by Home and ProductList.
 * Server sorts name, latest and price ascending. "price-high" has no server sort,
 * so it is sorted client-side on the loaded rows, as on web ProductList.
 */
export type SortOption = 'name' | 'latest' | 'price-low' | 'price-high';

export interface PriceRange {
  /** Raw input text; '' = unbounded. */
  min: string;
  max: string;
}

export const EMPTY_PRICE_RANGE: PriceRange = { min: '', max: '' };

const SORT_LABEL_KEYS: Record<SortOption, string> = {
  name: 'products:sort.name',
  latest: 'products:sort.latest',
  'price-low': 'products:sort.priceLow',
  'price-high': 'products:sort.priceHigh',
};

/** Translated sort label; resolved at call time so language switches apply. */
export const sortLabel = (option: SortOption): string => i18n.t(SORT_LABEL_KEYS[option]);

/** Web Home price presets; label via priceRangeLabel(preset). */
export const PRICE_PRESETS: ReadonlyArray<PriceRange> = [
  { min: '', max: '500' },
  { min: '500', max: '1000' },
  { min: '1000', max: '5000' },
  { min: '5000', max: '' },
];

const SERVER_SORT: Record<SortOption, NonNullable<ProductQuery['sortBy']>> = {
  name: 'name',
  latest: 'latest',
  'price-low': 'price',
  'price-high': 'latest',
};

const toNumber = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
};

/** Query fields for the chosen sort and price range. */
export const filterQuery = (sort: SortOption, range: PriceRange): Pick<ProductQuery, 'sortBy' | 'minPrice' | 'maxPrice'> => ({
  sortBy: SERVER_SORT[sort],
  minPrice: toNumber(range.min),
  maxPrice: toNumber(range.max),
});

/** Client-side price ordering on the loaded rows (web getSortedProducts). Other sorts keep server order. */
export const sortProducts = (products: Product[], sort: SortOption): Product[] => {
  if (sort !== 'price-low' && sort !== 'price-high') return products;
  const direction = sort === 'price-low' ? 1 : -1;
  return [...products].sort((a, b) => direction * ((getStartingPrice(a) || 0) - (getStartingPrice(b) || 0)));
};

export const hasPriceFilter = (range: PriceRange) => !!(range.min.trim() || range.max.trim());

/** "₹500 – ₹1000" / "Under ₹500" style label for the active range. */
export const priceRangeLabel = (range: PriceRange): string => {
  const min = range.min.trim();
  const max = range.max.trim();
  if (min && max) return `₹${min} – ₹${max}`;
  if (max) return i18n.t('products:price.under', { amount: max });
  if (min) return i18n.t('products:price.above', { amount: min });
  return i18n.t('products:price.label');
};
