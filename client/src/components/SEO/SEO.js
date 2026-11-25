import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  BUSINESS_ALT_NAMES,
  BUSINESS_CITY,
  BUSINESS_EMAIL,
  BUSINESS_GEO,
  BUSINESS_HOURS,
  BUSINESS_MAPS_URL,
  BUSINESS_NAME,
  BUSINESS_PHONE_SCHEMA,
  BUSINESS_POSTCODE,
  BUSINESS_REGION,
  BUSINESS_STREET,
  SERVICE_AREAS,
} from '../../config/contact';
import { PLAY_STORE_URL } from '../../config/app';

// Configurable via env so OG images / canonical / JSON-LD point at the real site.
export const SITE_URL = (process.env.REACT_APP_SITE_URL || 'https://chardeevari.in').replace(/\/$/, '');
// One entity for the business, referenced by @id from every other node
// (WebSite publisher, Product seller, BlogPosting publisher).
export const BUSINESS_ID = `${SITE_URL}/#business`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const DEFAULT_IMAGE = '/og-image.jpg'; // 1200×630
const DELIVERY_RADIUS_M = 5000;

const SAME_AS = [
  BUSINESS_MAPS_URL,
  'https://www.facebook.com/chardeevari.in',
  'https://www.instagram.com/chardeevari.in/',
  PLAY_STORE_URL,
  'https://www.linkedin.com/company/chardeevari',
  'https://www.openstreetmap.org/node/14338761989',
];

/** Delivery area: the four localities plus the ~5 km radius around the store. */
export const AREA_SERVED = [
  ...SERVICE_AREAS.map((area) => ({ '@type': 'Place', name: `${area}, ${BUSINESS_CITY}` })),
  {
    '@type': 'GeoCircle',
    geoMidpoint: { '@type': 'GeoCoordinates', latitude: BUSINESS_GEO.latitude, longitude: BUSINESS_GEO.longitude },
    geoRadius: DELIVERY_RADIUS_M,
  },
];

const absolute = (src) => (/^https?:\/\//.test(src) ? src : `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`);

const BUSINESS_NODE = {
  '@type': 'HardwareStore',
  '@id': BUSINESS_ID,
  name: BUSINESS_NAME,
  alternateName: BUSINESS_ALT_NAMES,
  description:
    'Building-materials delivery in Ranchi: cement, TMT sariya, balu (river sand), grey cement bricks and gitti (stone chips), delivered in about 60 minutes by partner stores within about 5 km of Kadru, Harmu, Ashok Nagar and Doranda. Cash on delivery.',
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo512.png`, width: 512, height: 512 },
  image: `${SITE_URL}${DEFAULT_IMAGE}`,
  telephone: BUSINESS_PHONE_SCHEMA,
  email: BUSINESS_EMAIL,
  address: {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS_STREET,
    addressLocality: BUSINESS_CITY,
    addressRegion: BUSINESS_REGION,
    postalCode: BUSINESS_POSTCODE,
    addressCountry: 'IN',
  },
  geo: { '@type': 'GeoCoordinates', latitude: BUSINESS_GEO.latitude, longitude: BUSINESS_GEO.longitude },
  hasMap: BUSINESS_MAPS_URL,
  areaServed: AREA_SERVED,
  openingHoursSpecification: BUSINESS_HOURS.map(({ days, opens, closes }) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: days,
    opens,
    closes,
  })),
  paymentAccepted: 'Cash',
  currenciesAccepted: 'INR',
  priceRange: '₹₹',
  knowsLanguage: ['en', 'hi'],
  sameAs: SAME_AS,
};

const WEBSITE_NODE = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: BUSINESS_NAME,
  alternateName: BUSINESS_ALT_NAMES,
  url: `${SITE_URL}/`,
  inLanguage: 'en-IN',
  publisher: { '@id': BUSINESS_ID },
};

/** Price quotes are refreshed on every rebuild; valid for 30 days from render. */
const priceValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;
const BRAND_SUFFIX_RE = new RegExp(`\\s*\\|\\s*${BUSINESS_NAME}\\s*$`);

/** Title without a trailing " | Chardeevari" (also the BlogPosting headline). */
const baseTitle = (title) => title.replace(BRAND_SUFFIX_RE, '');

/** Brand suffix only when the result still fits in MAX_TITLE characters. */
export const fullTitleOf = (title) => {
  const base = baseTitle(title);
  const branded = `${base} | ${BUSINESS_NAME}`;
  return base.includes(BUSINESS_NAME) || branded.length > MAX_TITLE ? base : branded;
};

/** Clips at a word boundary so the snippet ends cleanly (≤ MAX_DESCRIPTION chars). */
export const clampDescription = (text) => {
  if (!text || text.length <= MAX_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_DESCRIPTION - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 100 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
};

/** Offer for one admin price (incl. GST) per `unit`. */
const offerNode = ({ price, unit, inStock }, url) => ({
  '@type': 'Offer',
  price,
  priceCurrency: 'INR',
  availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
  itemCondition: 'https://schema.org/NewCondition',
  url,
  priceValidUntil: priceValidUntil(),
  seller: { '@id': BUSINESS_ID },
  areaServed: AREA_SERVED,
  priceSpecification: {
    '@type': 'UnitPriceSpecification',
    price,
    priceCurrency: 'INR',
    valueAddedTaxIncluded: true,
    ...(unit && { unitText: unit }),
  },
});

/**
 * Product + Offer, or ProductGroup + hasVariant (one Product/Offer per sized
 * variant). `product` comes from toSchemaProduct():
 * { name, description, images[], sku, brand, category, inStock,
 *   price, unit, size? | variants[{ label, price, unit, sku, inStock }] }
 * — prices as shown (admin price, incl. GST).
 */
const productNode = (product, url) => {
  const image = (product.images?.length ? product.images : [DEFAULT_IMAGE]).map(absolute);
  const shared = {
    name: product.name,
    description: product.description,
    image,
    ...(product.brand && { brand: { '@type': 'Brand', name: product.brand } }),
    ...(product.category && { category: product.category }),
  };
  if (product.variants?.length) {
    const groupId = product.sku || url;
    return {
      '@type': 'ProductGroup',
      '@id': `${url}#product`,
      ...shared,
      ...(product.sku && { sku: product.sku }),
      productGroupID: groupId,
      variesBy: 'https://schema.org/size',
      url,
      hasVariant: product.variants.map((v, i) => ({
        '@type': 'Product',
        '@id': `${url}#variant-${i + 1}`,
        name: `${product.name} ${v.label}`,
        description: product.description,
        image,
        ...(v.sku && { sku: v.sku }),
        size: v.label,
        inProductGroupWithID: groupId,
        offers: offerNode(v, url),
      })),
    };
  }
  return {
    '@type': 'Product',
    '@id': `${url}#product`,
    ...shared,
    ...(product.sku && { sku: product.sku }),
    ...(product.size && { size: product.size }),
    offers: offerNode(product, url),
  };
};

const SEO = ({
  title = 'Construction Materials in Ranchi - Cement, Sariya, Balu, Bricks, Gitti',
  description = 'Cement, TMT sariya, balu, grey cement bricks and gitti delivered in about 60 minutes near Kadru, Harmu, Ashok Nagar and Doranda, Ranchi. Cash on delivery.',
  keywords = 'cement price in Ranchi, cement dealer Ranchi, TMT sariya rate Ranchi, balu price Ranchi, cement bricks Ranchi, gitti rate Ranchi, building materials Kadru, building materials Harmu, building materials Doranda, building materials Ashok Nagar',
  image = DEFAULT_IMAGE,
  // Canonical: always SITE_URL + path. Never window.location.href — it bakes the
  // react-snap prerender origin (localhost:45678) into static HTML and lets
  // query strings (?category=...) declare themselves canonical.
  url = typeof window !== 'undefined' ? `${SITE_URL}${window.location.pathname.replace(/(.)\/+$/, '$1')}` : `${SITE_URL}/`,
  type = 'website',
  noindex = false,
  product = null, // see productNode()
  itemList = null, // [{ ...productNode fields, url }] -> ItemList of Products (rate tables)
  breadcrumbs = null, // [{ name, path }] -> BreadcrumbList (only with 2+ levels)
  faqs = null, // [{ question, answer }] -> FAQPage schema
  article = null // { datePublished, dateModified, author } -> BlogPosting schema
}) => {
  const fullTitle = fullTitleOf(title);
  const metaDescription = clampDescription(description);
  const imageUrl = absolute(image);

  const graph = [BUSINESS_NODE, WEBSITE_NODE];

  if (product) graph.push(productNode(product, url));

  if (itemList && itemList.length) {
    graph.push({
      '@type': 'ItemList',
      itemListElement: itemList.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: productNode(item, absolute(item.url)),
      })),
    });
  }

  if (breadcrumbs && breadcrumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absolute(crumb.path),
      })),
    });
  }

  // FAQ rich results are limited to gov/health sites; kept for answer engines.
  if (faqs && faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  if (article) {
    graph.push({
      '@type': 'BlogPosting',
      headline: baseTitle(title),
      description: metaDescription,
      image: imageUrl,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      author: { '@type': 'Organization', name: article.author || BUSINESS_NAME },
      publisher: { '@id': BUSINESS_ID },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    });
  }

  return (
    // defer={false}: apply head tags synchronously. The default rAF-deferred
    // flush races react-snap's snapshot — pages randomly miss all SEO tags.
    <Helmet defer={false}>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords} />

      {/* Robots Meta — not-found / account pages stay out of the index */}
      {noindex ? (
        <meta name="robots" content="noindex, follow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Canonical URL (none on noindex pages) */}
      {!noindex && <link rel="canonical" href={url} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={imageUrl} />
      {image === DEFAULT_IMAGE && <meta property="og:image:width" content="1200" />}
      {image === DEFAULT_IMAGE && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content={BUSINESS_NAME} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Geographic Meta Tags for Local SEO */}
      <meta name="geo.region" content="IN-JH" />
      <meta name="geo.placename" content={BUSINESS_CITY} />
      <meta name="geo.position" content={`${BUSINESS_GEO.latitude};${BUSINESS_GEO.longitude}`} />
      <meta name="ICBM" content={`${BUSINESS_GEO.latitude}, ${BUSINESS_GEO.longitude}`} />

      {/* Mobile Meta Tags */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Structured Data (JSON-LD): one linked graph per page */}
      <script type="application/ld+json">
        {JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}
      </script>
    </Helmet>
  );
};

export default SEO;
