// Turns live /api/products data into "aaj ka rate" rows for the rate tables on
// the landing pages and /aaj-ka-rate. Prices are exactly what the product cards
// show (variant price for sized products, otherwise product.price).

/** Products with no base price (placeholders such as unpriced variants) are not quoted. */
export const isRateable = (product) => Number(product?.price) > 0;

// "1/2 inch - Auto Load" -> { size: '1/2 inch', unit: 'auto load' }; "Tempo Load" -> { size: '', unit: 'tempo load' }
const splitLoadLabel = (label) => {
  const m = String(label).match(/^(.*?)[\s-]*(\b\w+\s+load)$/i);
  return m ? { size: m[1].trim(), unit: m[2].toLowerCase() } : null;
};

/** One row per priced product/variant: { id, productId, name, size, unit, price, category }. */
export const rateRows = (products = []) =>
  products.filter(isRateable).flatMap((p) => {
    const category = p.category?.name || '';
    const variants = (p.variants || []).filter((v) => Number(v.price) > 0);
    if (!variants.length) {
      return [{ id: p._id, productId: p._id, name: p.name, size: '', unit: p.unit || '', price: Number(p.price), category }];
    }
    return variants.map((v) => {
      const load = splitLoadLabel(v.label);
      return {
        id: `${p._id}-${v._id || v.label}`,
        productId: p._id,
        name: p.name,
        size: load ? load.size : v.label || '',
        unit: load ? load.unit : p.unit || '',
        price: Number(v.price),
        category,
      };
    });
  });

/** "₹1,700" (Indian grouping, paise only when present). */
export const formatINR = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Latest updatedAt across the products — the date the shown rates were last revised. */
export const lastRevised = (products = []) => {
  const times = products.filter(isRateable).map((p) => Date.parse(p.updatedAt)).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)) : null;
};

/** "18 Nov 2026" in IST, so the prerendered and hydrated text match. */
export const formatRateDate = (date, lang = 'en') =>
  date
    ? date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '';

/** Display order of category groups; unknown categories follow in API order. */
export const CATEGORY_ORDER = ['cement', 'steel', 'sand', 'bricks', 'aggregate'];

const categoryRank = (category) => {
  const i = CATEGORY_ORDER.indexOf(String(category).toLowerCase());
  return i === -1 ? CATEGORY_ORDER.length : i;
};

/** [{ category, rows }] grouped and ordered by CATEGORY_ORDER. */
export const groupByCategory = (rows = []) => {
  const groups = [];
  rows.forEach((r) => {
    let g = groups.find((x) => x.category.toLowerCase() === r.category.toLowerCase());
    if (!g) groups.push((g = { category: r.category, rows: [] }));
    g.rows.push(r);
  });
  return groups.sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
};

/** "₹330–₹360" (or "₹360" when every row has the same price). */
export const priceRange = (rows = []) => {
  if (!rows.length) return '';
  const prices = rows.map((r) => r.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatINR(min) : `${formatINR(min)}–${formatINR(max)}`;
};

/** "₹330/bag" for one row; `unitLabel` translates the unit. */
export const rowPrice = (row, unitLabel = (u) => u) =>
  `${formatINR(row.price)}${row.unit ? `/${unitLabel(row.unit)}` : ''}`;

/** "ACC HPC cement ₹330/bag; Rungta Steel TMT Bar 8mm ₹330/piece" */
export const rateList = (rows = [], unitLabel) =>
  rows.map((r) => `${r.name}${r.size ? ` ${r.size}` : ''} ${rowPrice(r, unitLabel)}`).join('; ');

/** Lowest-priced row, or undefined. */
export const cheapestRow = (rows = []) =>
  rows.reduce((min, r) => (!min || r.price < min.price ? r : min), undefined);
