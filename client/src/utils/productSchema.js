/**
 * Maps an /api/products product to the `product` / `itemList` entries that
 * SEO.js turns into schema.org Product + Offer. Prices are exactly what the
 * product page shows (single price, or the range of variant prices).
 */

// Brands we stock, as they appear in product names (catalogue has no brand field).
const KNOWN_BRANDS = [
  ['dalmia', 'Dalmia Cement'],
  ['acc', 'ACC'],
  ['concreto', 'Concreto'],
  ['bangur', 'Bangur Cement'],
  ['konark', 'Konark Cement'],
  ['rungta', 'Rungta'],
  ['kamdhenu', 'Kamdhenu'],
];

/** Brand for a product: explicit spec field, else a known brand in its name. */
export const brandOf = (product) => {
  const explicit = product?.specifications?.brand;
  if (explicit) return explicit;
  const words = String(product?.name || '').toLowerCase().split(/[^a-z0-9]+/);
  return KNOWN_BRANDS.find(([token]) => words.includes(token))?.[1];
};

/** Category name whether the category is populated or a plain string. */
export const categoryNameOf = (product) =>
  product?.category?.name || (typeof product?.category === 'string' ? product.category : undefined);

/**
 * SEO.js product shape, or null when the product has no sellable price
 * (Product schema without an offer is invalid, so it is omitted entirely).
 */
export const toSchemaProduct = (product) => {
  if (!product) return null;
  const variantPrices = (product.variants || []).map((v) => Number(v.price)).filter((p) => p > 0);
  const inStock = (product.totalStock ?? product.stock ?? 0) > 0
    || (product.variants || []).some((v) => v.stock > 0);
  const base = {
    name: product.name,
    description: product.description || `${product.name} delivered in Ranchi by Chardeevari.`,
    images: product.images || [],
    sku: product.sku,
    brand: brandOf(product),
    category: categoryNameOf(product),
    unit: product.unit,
    inStock,
    url: `/products/${product._id}`,
  };
  if (variantPrices.length) {
    return {
      ...base,
      lowPrice: Math.min(...variantPrices),
      highPrice: Math.max(...variantPrices),
      offerCount: variantPrices.length,
    };
  }
  return product.price > 0 ? { ...base, price: product.price } : null;
};
