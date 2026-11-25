/**
 * Maps an /api/products product to the `product` / `itemList` entries that
 * SEO.js turns into schema.org Product + Offer (or ProductGroup + hasVariant).
 * Prices are exactly the admin-set prices the product page shows.
 */
import { effectivePrice, priceUnit } from './rates';

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

/** Admin-priced variants, in catalogue order. */
export const pricedVariants = (product) =>
  (product?.variants || []).filter((v) => Number(v?.price) > 0);

/**
 * SEO.js product shape, or null when the product has no sellable price
 * (Product schema without an offer is invalid, so it is omitted entirely).
 * - 2+ priced variants → `variants: [{ label, price, unit, sku, inStock }]` (ProductGroup)
 * - 1 priced variant   → plain `price` of that variant (+ `size`)
 * - no variants        → plain `price` (product.price)
 */
export const toSchemaProduct = (product) => {
  if (!product) return null;
  const variants = pricedVariants(product);
  const inStock = (product.totalStock ?? product.stock ?? 0) > 0
    || (product.variants || []).some((v) => v.stock > 0);
  const base = {
    name: product.name,
    description: product.description || `${product.name} delivered in Ranchi by Chardeevari.`,
    images: product.images || [],
    sku: product.sku,
    brand: brandOf(product),
    category: categoryNameOf(product),
    inStock,
    url: `/products/${product._id}`,
  };
  if (variants.length > 1) {
    return {
      ...base,
      variants: variants.map((v) => ({
        label: v.label,
        price: Number(v.price),
        unit: priceUnit(product, v),
        sku: v.sku,
        inStock: v.stock > 0,
      })),
    };
  }
  if (variants.length === 1) {
    const [v] = variants;
    return {
      ...base,
      price: Number(v.price),
      unit: priceUnit(product, v),
      size: v.label,
    };
  }
  const price = effectivePrice(product);
  return price ? { ...base, price, unit: priceUnit(product) } : null;
};
