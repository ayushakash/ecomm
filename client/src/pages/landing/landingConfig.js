// SEO landing pages for high-intent Ranchi/Jharkhand material searches.
// Each entry drives <MaterialLanding>. `category` is matched (case-insensitive)
// against the live category list to pull real products; null = show everything.
// Keep slugs in sync with the routes in App.js, reactSnap.include (package.json),
// and STATIC_PATHS in routes/sitemap.js.

export const LANDING_CONFIGS = {
  cement: {
    slug: 'cement-price-ranchi',
    category: 'Cement',
    h1: 'Cement Price in Ranchi — Buy Cement Online',
    seoTitle: 'Cement Price in Ranchi Today | Buy Cement Online | Chardeevari',
    seoDescription:
      'Check today\'s cement price in Ranchi and order cement online — ACC, Bangur, Konark & more. Same-day doorstep delivery across Ranchi and Jharkhand from our own fleet.',
    keywords:
      'cement price in Ranchi, cement price today Ranchi, buy cement online Ranchi, cement dealers Ranchi, ACC cement Ranchi, OPC PPC cement Ranchi, cement supplier Jharkhand',
    intro: [
      'Buy genuine, branded cement online in Ranchi at transparent prices and get it delivered to your site the same day — through our own delivery fleet, not third-party transporters.',
      'Compare live prices on OPC and PPC cement from trusted brands, order by the bag or in bulk, and pay on delivery. Building a wall, a slab or a full house, we deliver across Ranchi and nearby Jharkhand.',
    ],
    faqs: [
      { question: 'What is the cement price in Ranchi today?', answer: 'Cement prices change with brand and demand. The live per-bag price for every brand we stock is shown on the product cards above — that is the current Ranchi rate, inclusive of delivery options at checkout.' },
      { question: 'Do you deliver cement to my site in Ranchi?', answer: 'Yes. We deliver to sites across Ranchi and surrounding Jharkhand areas using our own fleet, usually the same day for in-stock items.' },
      { question: 'Can I order cement in bulk for a construction project?', answer: 'Yes. Bulk orders get better rates — tap the "Bulk?" option on any product or contact us, and we will arrange site delivery and pricing.' },
      { question: 'Which cement is best for house construction?', answer: 'PPC is commonly used for general house construction (plaster, brickwork) while OPC 43/53 grade is preferred for slabs and structural work. Our calculator can estimate how many bags your project needs.' },
    ],
  },

  steel: {
    slug: 'tmt-steel-price-ranchi',
    category: 'Steel',
    h1: 'TMT Steel Price in Ranchi — Buy Sariya Online',
    seoTitle: 'TMT Steel Price in Ranchi | Buy Sariya / TMT Bars Online | Chardeevari',
    seoDescription:
      'Today\'s TMT steel (sariya) price in Ranchi — buy 8mm, 10mm, 12mm & more TMT bars online with same-day site delivery across Ranchi and Jharkhand from our own fleet.',
    keywords:
      'TMT steel price Ranchi, sariya price Ranchi, TMT bars online Ranchi, 8mm 10mm 12mm TMT Ranchi, steel dealers Ranchi, TMT supplier Jharkhand, Tata Tiscon Jindal TMT Ranchi',
    intro: [
      'Order TMT steel bars (sariya) online in Ranchi at live, transparent prices — available in common sizes like 8mm, 10mm and 12mm for footings, columns, beams and slabs.',
      'Pick your size, see the per-piece or per-ton rate, and get it delivered to your site through our own fleet. Bulk tonnage orders are welcome with better pricing.',
    ],
    faqs: [
      { question: 'What is the TMT steel / sariya price in Ranchi today?', answer: 'TMT prices move with the market and the bar size. The current rate for every size we stock is shown on the product cards above for Ranchi delivery.' },
      { question: 'Which TMT bar sizes can I buy?', answer: 'We stock the sizes most used in residential and commercial construction — typically 8mm, 10mm and 12mm. Select your size on the product page before adding to cart.' },
      { question: 'Do you deliver TMT steel to construction sites in Ranchi?', answer: 'Yes — same-day site delivery across Ranchi and nearby Jharkhand using our own fleet, including bulk tonnage orders.' },
      { question: 'How much steel do I need for my house?', answer: 'A rough thumb-rule is around 4 kg of steel per sq.ft of built-up area, but it varies with design. Use our material calculator for an estimate tailored to your project.' },
    ],
  },

  bricks: {
    slug: 'bricks-supplier-ranchi',
    category: 'Bricks',
    h1: 'Bricks Supplier in Ranchi — Order Bricks Online',
    seoTitle: 'Bricks Supplier in Ranchi | Buy Red Bricks Online | Chardeevari',
    seoDescription:
      'Buy red bricks online in Ranchi from a trusted supplier — order by the piece or in bulk with same-day site delivery across Ranchi and Jharkhand from our own fleet.',
    keywords:
      'bricks supplier Ranchi, buy bricks online Ranchi, red bricks price Ranchi, brick dealers Ranchi, bricks for construction Jharkhand, bulk bricks Ranchi',
    intro: [
      'Order quality red bricks online in Ranchi at clear per-piece prices, with same-day delivery to your site through our own fleet.',
      'Whether you need a few thousand bricks for a boundary wall or a large bulk load for a full build, you can order online and pay on delivery.',
    ],
    faqs: [
      { question: 'What is the price of bricks in Ranchi?', answer: 'The current per-piece brick price for Ranchi is shown on the product cards above and updates with availability.' },
      { question: 'Can I order bricks in bulk?', answer: 'Yes. Bulk brick orders get better per-piece pricing and scheduled site delivery — use the bulk option or contact us with your quantity.' },
      { question: 'How many bricks do I need for a 1000 sq ft house?', answer: 'A common estimate is roughly 8 bricks per sq.ft of wall, but it depends on wall thickness and design. Our calculator gives a project-specific estimate.' },
      { question: 'Do you deliver bricks across Ranchi?', answer: 'Yes — same-day site delivery across Ranchi and nearby Jharkhand using our own delivery fleet.' },
    ],
  },

  sand: {
    slug: 'sand-supplier-ranchi',
    category: 'Sand',
    h1: 'Sand Supplier in Ranchi — Buy River & M-Sand',
    seoTitle: 'Sand Supplier in Ranchi | Buy River Sand & M-Sand Online | Chardeevari',
    seoDescription:
      'Buy river sand and M-sand online in Ranchi at transparent prices — order by the unit or in bulk with same-day site delivery across Ranchi and Jharkhand from our own fleet.',
    keywords:
      'sand supplier Ranchi, buy sand online Ranchi, river sand price Ranchi, M-sand Ranchi, manufactured sand Jharkhand, bulk sand delivery Ranchi',
    intro: [
      'Order construction sand online in Ranchi — river sand for plaster and finishing, and M-sand (manufactured sand) for concrete work — at transparent prices.',
      'Choose your quantity, see the live rate, and get it delivered to your site the same day through our own fleet. Bulk loads are available for larger projects.',
    ],
    faqs: [
      { question: 'What is the sand price in Ranchi today?', answer: 'The current rate for each sand type we supply is shown on the product cards above for Ranchi delivery.' },
      { question: 'What is the difference between river sand and M-sand?', answer: 'River sand is natural and often used for plastering and finishing; M-sand (manufactured/crushed sand) is engineered and widely used for concrete and masonry. Both are used in house construction.' },
      { question: 'Do you deliver sand in bulk across Ranchi?', answer: 'Yes — bulk sand delivery to sites across Ranchi and nearby Jharkhand through our own fleet, usually same day.' },
      { question: 'How much sand do I need for my construction?', answer: 'Sand quantity depends on the work (plaster, concrete, brickwork). Use our material calculator for an estimate based on your built-up area.' },
    ],
  },

  all: {
    slug: 'construction-materials-ranchi',
    category: null,
    h1: 'Construction Materials in Ranchi — Cement, Steel, Sand & Bricks',
    seoTitle: 'Construction Materials in Ranchi | Cement, Steel, Sand, Bricks | Chardeevari',
    seoDescription:
      'Buy all your construction materials online in Ranchi — cement, TMT steel, sand, bricks and aggregates — with same-day doorstep delivery across Ranchi and Jharkhand from our own fleet.',
    keywords:
      'construction materials Ranchi, building materials Ranchi, building material supplier Ranchi, cement steel sand bricks Ranchi, construction material shop near me Ranchi, building materials delivery Jharkhand',
    intro: [
      'Chardeevari is your online building-materials store for Ranchi — order cement, TMT steel (sariya), sand, bricks and aggregates in one place, at transparent prices.',
      'Everything is delivered to your site through our own fleet, often the same day, with bulk pricing for larger projects and pay-on-delivery. One platform for every material your construction needs.',
    ],
    faqs: [
      { question: 'What construction materials can I buy online in Ranchi?', answer: 'You can order cement, TMT steel (sariya), sand, bricks and aggregates online, by the unit or in bulk, with delivery across Ranchi and nearby Jharkhand.' },
      { question: 'Do you deliver building materials to my site?', answer: 'Yes — we deliver to sites across Ranchi and surrounding Jharkhand using our own fleet, usually the same day for in-stock items.' },
      { question: 'Can I get bulk pricing for a full construction project?', answer: 'Yes. Bulk orders across cement, steel, sand and bricks get better rates and scheduled site delivery — order online or contact us with your requirement.' },
      { question: 'How do I estimate how much material I need?', answer: 'Use our free material calculator — enter your built-up area and it estimates the cement, steel, sand, bricks and aggregate your project needs.' },
    ],
  },
};
