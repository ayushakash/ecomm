/**
 * Responsive <img> props for product photos.
 *
 * Product photos uploaded through the admin are stored under
 * product-images/r/<name>.<ext> together with <name>-<width>w.webp copies
 * (backend services/ProductImageService.js — keep VARIANT_WIDTHS in sync).
 * Other URLs (older uploads, external links, placeholders) get no srcset.
 */
export const VARIANT_WIDTHS = [160, 400, 800];

const RESPONSIVE_URL = /^(.*\/product-images\/r\/[^/?#]+)\.[a-z0-9]+$/i;

/** Rendered widths, for `sizes`. */
export const IMAGE_SIZES = {
  // ProductCard grid: 2 columns below lg, 3 at lg, 4 at xl (max ~300 px).
  card: '(min-width: 1280px) 300px, (min-width: 1024px) 33vw, 50vw',
  // ProductDetail main image: full width below lg, half of the max-w-7xl page above.
  main: '(min-width: 1024px) 600px, 100vw',
  thumb: '80px',
};

/**
 * `{ src, srcSet, sizes }` for a product photo; srcSet/sizes only when the
 * resized variants exist. Spread onto <img>.
 */
export function productImageProps(url, sizes) {
  const match = typeof url === 'string' ? url.match(RESPONSIVE_URL) : null;
  if (!match) return { src: url };
  // srcSet/sizes before src, so the browser never starts on the full-size file.
  return {
    srcSet: VARIANT_WIDTHS.map((w) => `${match[1]}-${w}w.webp ${w}w`).join(', '),
    sizes,
    src: url,
  };
}
