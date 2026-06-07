/**
 * Blog content. Each post renders at /blog/:slug as a full SEO article page.
 * To add a new article, append an object here — routing, sitemap (react-snap
 * include list) and the blog listing all read from this single source.
 *
 * body[] block types:
 *   { type: 'p',      text }                         -> paragraph (supports <strong> via **bold**)
 *   { type: 'h2',     text }                         -> section heading
 *   { type: 'ul',     items: [] }                    -> bullet list
 *   { type: 'table',  headers: [], rows: [[]] }      -> comparison/price table
 *   { type: 'cta',    text, label, href }            -> call-to-action box
 */

export const blogPosts = [
  {
    id: 1,
    slug: 'cement-calculation-1000-sqft-ranchi',
    title: 'How to Calculate Cement for 1000 Sq Ft Construction in Ranchi',
    metaDescription:
      'How much cement is needed for a 1000 sq ft house in Ranchi? Use this simple thumb-rule guide with bag counts, the formula, cost estimate and current Ranchi cement prices.',
    keywords:
      'cement calculation 1000 sq ft, how much cement for 1000 sq ft house, cement bags for house Ranchi, cement price in Ranchi, cement requirement calculation',
    excerpt:
      'A simple guide to calculating cement requirements for a 1000 sq ft construction in Ranchi — thumb rules, the formula, bag counts and cost.',
    category: 'Construction Guides',
    date: '2026-01-01',
    dateModified: '2026-06-07',
    readTime: '6 min read',
    body: [
      { type: 'p', text: 'Planning to build a 1000 sq ft house in Ranchi and wondering **how many bags of cement** you will need? Getting this number right helps you budget accurately and avoid both shortages and costly over-ordering. This guide gives you a quick answer, the exact formula, and current cement prices in Ranchi.' },

      { type: 'h2', text: 'Quick answer: cement for 1000 sq ft' },
      { type: 'p', text: 'As a widely used civil-engineering thumb rule, a residential building needs roughly **0.4 to 0.45 bags of cement per square foot** of built-up area (covering RCC, brickwork, plastering and flooring). For 1000 sq ft, that works out to:' },
      {
        type: 'table',
        headers: ['Construction stage', 'Approx. cement (bags)'],
        rows: [
          ['Single floor (G+0), 1000 sq ft', '400 – 450 bags'],
          ['G+1 (two floors)', '800 – 900 bags'],
          ['Per sq ft (thumb rule)', '0.4 – 0.45 bags'],
        ],
      },
      { type: 'p', text: 'These are estimates for a standard residential build. Actual quantity varies with structural design, number of columns, wall thickness and finishing.' },

      { type: 'h2', text: 'The formula explained' },
      { type: 'p', text: 'Total cement = Built-up area (sq ft) × 0.45 bags. For a 1000 sq ft single floor: 1000 × 0.45 = **450 bags**. If you are building two floors, multiply by the number of floors and add extra for the foundation footings.' },

      { type: 'h2', text: 'Factors that change the requirement' },
      {
        type: 'ul',
        items: [
          'Structural design — more columns and beams (RCC) increase cement use.',
          'Wall thickness — 9-inch walls use more mortar than 4-inch walls.',
          'Concrete grade — higher grades (M25, M30) need more cement than M20.',
          'Wastage — always add 3–5% buffer for site wastage.',
          'Foundation type — deep footings and rafts increase consumption.',
        ],
      },

      { type: 'h2', text: 'Cement price in Ranchi (2026)' },
      { type: 'p', text: 'Cement prices in Ranchi typically range from **₹350 to ₹420 per 50 kg bag**, depending on the brand (ACC, UltraTech, Ambuja, Dalmia, etc.), grade (OPC vs PPC) and order quantity. Buying in bulk for a full house usually gets you a better per-bag rate.' },
      {
        type: 'table',
        headers: ['Quantity', 'Est. cement cost (at ₹385/bag)'],
        rows: [
          ['1000 sq ft (≈ 450 bags)', '₹1,73,250'],
          ['2000 sq ft (≈ 900 bags)', '₹3,46,500'],
        ],
      },
      { type: 'p', text: '*Prices are indicative for the Ranchi market and change with demand — always confirm the live rate before ordering.' },

      { type: 'cta', text: 'Want the exact cement, steel, sand and brick quantities and cost for YOUR plot size? Use our free calculator — just enter your area.', label: 'Calculate My Materials', href: '/calculator' },

      { type: 'h2', text: 'Order cement online in Ranchi' },
      { type: 'p', text: 'Once you know your quantity, you can compare verified merchant prices and order cement online for doorstep delivery in Ranchi at Chardeevari — no need to visit multiple shops.' },
    ],
    faqs: [
      { question: 'How many bags of cement are required for a 1000 sq ft house?', answer: 'A 1000 sq ft single-floor house needs approximately 400 to 450 bags of cement, based on the thumb rule of 0.4–0.45 bags per square foot covering all construction stages.' },
      { question: 'What is the cement price in Ranchi today?', answer: 'Cement in Ranchi generally costs between ₹350 and ₹420 per 50 kg bag depending on brand, grade and quantity. Bulk orders usually get a lower per-bag rate.' },
      { question: 'Which cement is best for house construction?', answer: 'PPC (Portland Pozzolana Cement) is commonly preferred for residential construction in India for durability and workability, while OPC 53 grade is used where higher early strength is needed. Always choose ISI/BIS-marked cement.' },
      { question: 'How do I calculate cement for two floors?', answer: 'Multiply the per-floor estimate by the number of floors. For 1000 sq ft per floor over two floors, that is roughly 800–900 bags, plus extra for foundation footings.' },
    ],
  },

  {
    id: 2,
    slug: 'msand-vs-river-sand-jharkhand',
    title: 'M-Sand vs River Sand: Which is Better for Construction in Jharkhand?',
    metaDescription:
      'M-Sand vs River Sand for construction in Jharkhand — compare strength, cost, availability and quality. Find out which sand is best for your Ranchi project.',
    keywords:
      'M-Sand vs river sand, manufactured sand vs river sand, best sand for construction, M-Sand price Ranchi, river sand price Jharkhand, sand for plastering',
    excerpt:
      'A clear comparison of M-Sand and River Sand for construction in Jharkhand — strength, cost, availability and which to use where.',
    category: 'Material Comparison',
    date: '2025-12-28',
    dateModified: '2026-06-07',
    readTime: '5 min read',
    body: [
      { type: 'p', text: 'Choosing between **M-Sand (manufactured sand)** and **river sand** is one of the first decisions in any construction project in Jharkhand. With river sand becoming scarcer and costlier, M-Sand is now a popular alternative. Here is a straight comparison to help you decide.' },

      { type: 'h2', text: 'What is M-Sand and River Sand?' },
      { type: 'p', text: '**River sand** is naturally sourced from riverbeds and has smooth, rounded grains. **M-Sand** is produced by crushing hard granite stone into sand-sized particles, giving it more angular grains and a consistent quality.' },

      { type: 'h2', text: 'M-Sand vs River Sand: comparison' },
      {
        type: 'table',
        headers: ['Factor', 'M-Sand', 'River Sand'],
        rows: [
          ['Source', 'Crushed granite (manufactured)', 'Natural riverbeds'],
          ['Grain shape', 'Angular, uniform', 'Smooth, rounded'],
          ['Strength of concrete', 'Higher (better bonding)', 'Good'],
          ['Impurities/silt', 'Very low, controlled', 'Can contain silt & clay'],
          ['Water absorption', 'Slightly higher', 'Lower'],
          ['Availability in Ranchi', 'Readily available', 'Limited / seasonal'],
          ['Cost', 'Usually lower & stable', 'Higher & fluctuating'],
          ['Eco-impact', 'More sustainable', 'Riverbed mining harms ecology'],
        ],
      },

      { type: 'h2', text: 'Which should you use?' },
      {
        type: 'ul',
        items: [
          'Concrete & RCC work: M-Sand is often preferred for its strength and consistency.',
          'Plastering & finishing: River sand gives a smoother finish, though graded M-Sand also works well.',
          'Budget & availability: In Ranchi, M-Sand is usually cheaper and more reliably available.',
        ],
      },

      { type: 'h2', text: 'Sand price in Ranchi (2026)' },
      { type: 'p', text: 'Sand prices vary with season and transport distance. As a rough guide in the Ranchi area, M-Sand is typically more affordable and stable than river sand, which spikes during monsoon and mining restrictions. Always confirm the current per-unit (cubic feet / brass) rate before ordering.' },

      { type: 'cta', text: 'Not sure how much sand your project needs? Our calculator estimates sand, cement, steel and bricks for your area in seconds.', label: 'Estimate My Sand', href: '/calculator' },

      { type: 'h2', text: 'Buy quality sand in Ranchi' },
      { type: 'p', text: 'Whether you choose M-Sand or river sand, sourcing from verified suppliers ensures the right gradation and low silt content. Compare prices and order sand online for doorstep delivery in Ranchi at Chardeevari.' },
    ],
    faqs: [
      { question: 'Is M-Sand better than river sand?', answer: 'For concrete and RCC work, M-Sand often performs better due to its angular grains, higher strength and very low impurities. River sand gives a smoother finish for plastering. M-Sand is also more sustainable and usually cheaper.' },
      { question: 'Which sand is cheaper in Ranchi?', answer: 'M-Sand is generally cheaper and more price-stable in Ranchi, while river sand costs more and fluctuates with season and mining restrictions.' },
      { question: 'Can M-Sand be used for plastering?', answer: 'Yes. Properly graded, fine M-Sand can be used for plastering. Many builders use M-Sand for both concrete and plaster, though some prefer river sand for the final finish coat.' },
      { question: 'Why is river sand becoming expensive?', answer: 'River sand is a natural resource and riverbed mining is increasingly restricted for environmental reasons, reducing supply and raising prices — which is why manufactured M-Sand has become popular.' },
    ],
  },

  {
    id: 3,
    slug: 'best-tmt-bars-ranchi-2026',
    title: 'Best Quality TMT Bars Available in Ranchi 2026',
    metaDescription:
      'Looking for the best TMT bars in Ranchi? Compare TMT grades (Fe500, Fe550D), top brands, how to choose, and current TMT steel prices in Ranchi for 2026.',
    keywords:
      'best TMT bars Ranchi, TMT steel price Ranchi, TMT bars for house construction, Fe500 vs Fe550D, buy TMT bars online Ranchi, cheap steel in Ranchi',
    excerpt:
      'A buyer’s guide to choosing the best TMT bars in Ranchi — grades, top brands, how to choose and current steel prices.',
    category: 'Product Reviews',
    date: '2025-12-25',
    dateModified: '2026-06-07',
    readTime: '6 min read',
    body: [
      { type: 'p', text: 'TMT (Thermo-Mechanically Treated) bars are the backbone of any RCC structure. Choosing the right **grade and brand** directly affects the strength and safety of your building. Here is how to pick the best TMT bars in Ranchi and what to expect on price in 2026.' },

      { type: 'h2', text: 'TMT bar grades explained' },
      {
        type: 'table',
        headers: ['Grade', 'Best for'],
        rows: [
          ['Fe415', 'Older spec; more ductile, lower strength'],
          ['Fe500', 'Most common for residential homes'],
          ['Fe500D', 'Higher ductility — good for earthquake zones'],
          ['Fe550 / Fe550D', 'High-rise & heavy structural loads'],
        ],
      },
      { type: 'p', text: 'For a typical house in Ranchi, **Fe500 or Fe500D** offers the right balance of strength and ductility. Jharkhand falls in a moderate seismic zone, so the **“D” (ductile) grades** are a sensible choice.' },

      { type: 'h2', text: 'How to choose the best TMT bars' },
      {
        type: 'ul',
        items: [
          'BIS/ISI mark — always insist on IS 1786 certified bars.',
          'Brand reputation — established brands offer consistent quality.',
          'Grade match — Fe500D for homes in seismic areas like Jharkhand.',
          'Rib pattern & uniformity — proper ribs improve bonding with concrete.',
          'Corrosion resistance — important for Ranchi’s monsoon climate.',
        ],
      },

      { type: 'h2', text: 'Top TMT brands available in Ranchi' },
      { type: 'p', text: 'Commonly available TMT brands in the Ranchi market include TATA Tiscon, JSW, SAIL, Vizag, Rashmi and other reputed regional brands. Availability and price vary, so it is worth comparing rates across verified suppliers before ordering.' },

      { type: 'h2', text: 'TMT steel price in Ranchi (2026)' },
      { type: 'p', text: 'TMT steel in Ranchi typically ranges from **₹65 to ₹80 per kg** (₹65,000–₹80,000 per tonne) depending on brand, grade and quantity. Bulk orders for a full house usually attract better rates.' },
      {
        type: 'table',
        headers: ['Build size', 'Approx. steel needed', 'Est. cost (at ₹72/kg)'],
        rows: [
          ['1000 sq ft (≈ 3.3 kg/sq ft)', '≈ 3,300 kg', '≈ ₹2,37,600'],
          ['2000 sq ft', '≈ 6,600 kg', '≈ ₹4,75,200'],
        ],
      },
      { type: 'p', text: '*Steel prices are volatile — confirm the live rate before purchase.' },

      { type: 'cta', text: 'Find out exactly how much TMT steel your project needs and what it will cost — free, instant.', label: 'Calculate Steel Requirement', href: '/calculator' },

      { type: 'h2', text: 'Buy TMT bars online in Ranchi' },
      { type: 'p', text: 'Compare verified merchant prices on top TMT brands and order steel online for doorstep delivery in Ranchi at Chardeevari — quality-assured, at competitive rates.' },
    ],
    faqs: [
      { question: 'Which TMT bar is best for house construction in Ranchi?', answer: 'Fe500 or Fe500D grade TMT bars are best for most homes in Ranchi. Since Jharkhand is a moderate seismic zone, the ductile “D” grades (Fe500D) are recommended for better earthquake resistance.' },
      { question: 'What is the TMT steel price in Ranchi in 2026?', answer: 'TMT steel in Ranchi typically costs between ₹65 and ₹80 per kg (₹65,000–₹80,000 per tonne), depending on brand, grade and order quantity. Bulk orders usually get better rates.' },
      { question: 'How much steel is required for a 1000 sq ft house?', answer: 'A 1000 sq ft house needs roughly 3.3 kg of steel per sq ft, or about 3,300 kg in total. The exact amount depends on the structural design and number of floors.' },
      { question: 'What is the difference between Fe500 and Fe550D?', answer: 'Fe550/Fe550D bars have higher tensile strength suited to high-rise and heavy-load structures, while Fe500/Fe500D are ideal for residential buildings. The “D” suffix indicates higher ductility, which is better for seismic zones.' },
    ],
  },
];

export const getBlogPost = (slug) => blogPosts.find((p) => p.slug === slug) || null;

// Slugs for sitemap / prerender include lists.
export const blogSlugs = blogPosts.map((p) => p.slug);
