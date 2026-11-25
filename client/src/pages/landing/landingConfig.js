// SEO landing pages for high-intent Ranchi material searches ("cement rate
// ranchi", "sariya rate", "balu rate", "eent", "gitti"). Each entry drives
// <MaterialLanding>. `category` is matched (case-insensitive) against the live
// category list to pull real products; null = every category.
// Keep slugs in sync with the routes in App.js, reactSnap.include (package.json)
// and STATIC_PATHS in routes/sitemap.js.
// Meta (title/description/keywords) lives here; every visible string (H1, intro,
// guide, FAQ — also emitted as FAQPage schema) comes from the `landing` i18n
// namespace under pages.<key>.
//
// seoDescription(from) receives the live lowest rate ("₹330/bag") once products
// load (they do at prerender), or undefined.
//
// guideSlug: the matching /blog/<slug> buying guide (anchor text: landing
// i18n pages.<key>.guideLink), linked from the landing and product pages.

const AREA = 'Kadru, Harmu, Ashok Nagar, Doranda';

export const LANDING_CONFIGS = {
  cement: {
    key: 'cement',
    slug: 'cement-price-ranchi',
    category: 'Cement',
    breadcrumb: 'Cement Rate in Ranchi',
    guideSlug: 'cement-calculation-1000-sqft-ranchi',
    seoTitle: 'Cement Rate in Ranchi Today – ACC, Dalmia, Concreto | Chardeevari',
    seoDescription: (from) =>
      `Today's cement rate in Ranchi: ACC, Dalmia, Concreto${from ? ` from ${from}` : ''}. 60-min delivery in ${AREA}. Cash on delivery.`,
    keywords:
      'cement rate Ranchi, cement price today Ranchi, सीमेंट रेट रांची, ACC cement rate Ranchi, Dalmia cement price Ranchi, Concreto cement Ranchi, cement shop Kadru',
  },

  steel: {
    key: 'steel',
    slug: 'tmt-steel-price-ranchi',
    category: 'Steel',
    breadcrumb: 'Sariya Rate in Ranchi',
    guideSlug: 'best-tmt-bars-ranchi-2026',
    seoTitle: 'Sariya Rate in Ranchi Today – TMT Bar Price | Chardeevari',
    seoDescription: (from) =>
      `Sariya (TMT bar) rate in Ranchi today: Rungta TMT 8–16 mm${from ? ` from ${from}` : ''}. 60-min delivery in ${AREA}. Cash on delivery.`,
    keywords:
      'sariya rate Ranchi, saria rate today Ranchi, TMT bar price Ranchi, सरिया रेट रांची, Rungta TMT Ranchi, 8mm 10mm 12mm sariya price',
  },

  sand: {
    key: 'sand',
    slug: 'sand-supplier-ranchi',
    category: 'Sand',
    breadcrumb: 'Balu Rate in Ranchi',
    guideSlug: 'msand-vs-river-sand-jharkhand',
    seoTitle: 'Balu Rate in Ranchi Today – River Sand Delivery | Chardeevari',
    seoDescription: (from) =>
      `Balu (river sand) rate in Ranchi today${from ? `: ${from}` : ''}. Tempo-load delivery in about 60 min in ${AREA}. Cash on delivery.`,
    keywords:
      'balu rate Ranchi, बालू रेट रांची, river sand price Ranchi, sand delivery Ranchi, balu tempo rate, sand supplier Kadru Harmu',
  },

  bricks: {
    key: 'bricks',
    slug: 'bricks-supplier-ranchi',
    category: 'Bricks',
    breadcrumb: 'Brick (Eent) Price in Ranchi',
    seoTitle: 'Brick Price in Ranchi – Grey Cement Eent Rate | Chardeevari',
    seoDescription: (from) =>
      `Grey cement brick (eent) price in Ranchi${from ? `: ${from}` : ''}. 60-min delivery in ${AREA}. Cash on delivery.`,
    keywords:
      'brick price Ranchi, eent rate Ranchi, ईंट रेट रांची, cement bricks Ranchi, grey bricks price, bricks delivery Ranchi',
  },

  gitti: {
    key: 'gitti',
    slug: 'gitti-rate-ranchi',
    category: 'aggregate',
    breadcrumb: 'Gitti Rate in Ranchi',
    seoTitle: 'Gitti Rate in Ranchi Today – Stone Chips ½″ ¾″ | Chardeevari',
    seoDescription: (from) =>
      `Gitti (stone chips) rate in Ranchi today, ½″ and ¾″${from ? `, from ${from}` : ''}. 60-min delivery in ${AREA}. Cash on delivery.`,
    keywords:
      'gitti rate Ranchi, गिट्टी रेट रांची, stone chips price Ranchi, 20mm gitti price, aggregate price Ranchi, gitti auto load rate',
  },

  all: {
    key: 'all',
    slug: 'construction-materials-ranchi',
    category: null,
    breadcrumb: 'Building Material in Ranchi',
    seoTitle: 'Building Material in Ranchi – Cement, Sariya, Balu | Chardeevari',
    seoDescription: () =>
      `Building material in Ranchi: cement, sariya, balu, eent and gitti at today's rate. 60-min delivery in ${AREA}. Cash on delivery.`,
    keywords:
      'building material Ranchi, building material shop Ranchi, construction materials Ranchi, cement sariya balu Ranchi, building material near me Kadru',
  },
};

/** Landing config for a live category name (e.g. "cement", "aggregate"), or undefined. */
export const landingForCategory = (categoryName) => {
  const name = String(categoryName || '').toLowerCase();
  return Object.values(LANDING_CONFIGS).find((c) => c.category && c.category.toLowerCase() === name);
};
