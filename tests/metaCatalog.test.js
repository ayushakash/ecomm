/**
 * Meta Commerce Catalog feed tests — GET /api/meta/catalog-feed
 *
 * The feed is polled by Meta Commerce Manager, so the contract is byte-level:
 *  - Row 1 must be Meta's 31-column catalog_products.csv template header.
 *  - ids are the Mongo product _id — stable across polls AND matching the
 *    Meta Pixel's content_ids (client sends product._id), which dynamic ads
 *    require. Variants grouped via item_group_id = parent _id.
 *  - Prices use the storefront display logic, formatted "N.NN INR".
 *  - Availability mirrors customer-facing stock (enabled merchant-product rows
 *    of approved & active merchants only).
 *  - Fields with commas/quotes/newlines must survive CSV escaping as ONE row.
 */

const request = require('supertest');
const app = require('../server');
const Product = require('../models/Product');
const MerchantProduct = require('../models/MerchantProduct');
const Category = require('../models/Category');
const { setGSTMode, createMerchant } = require('./helpers/fixtures');

// ─── CSV helpers ──────────────────────────────────────────────────────────────

// Minimal RFC 4180 line parser: handles quoted fields and doubled quotes.
// The route collapses newlines inside fields, so one line === one record.
function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function fetchFeed() {
  const res = await request(app).get('/api/meta/catalog-feed').expect(200);
  const lines = res.text.replace(/\n$/, '').split('\n');
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
  return { res, lines, header, rows };
}

const rowById = (rows, id) => rows.find((r) => r.id === id);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

async function getCategory() {
  let category = await Category.findOne({ name: 'Feed Category' });
  if (!category) category = await Category.create({ name: 'Feed Category' });
  return category;
}

// .save() so the sku pre-save hook fires when no sku is given.
async function makeProduct(overrides = {}) {
  const category = await getCategory();
  const product = new Product({
    name: 'Feed Cement',
    description: 'Feed test product',
    category: category._id,
    price: 100,
    enabled: true,
    ...overrides,
  });
  await product.save();
  return product;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/meta/catalog-feed', () => {
  it('serves public CSV with the 31-column Meta template header', async () => {
    await makeProduct({ sku: 'HDR-1' });

    const { res, lines, header } = await fetchFeed();

    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(lines[0].startsWith('id,title,description,availability')).toBe(true);
    expect(header).toHaveLength(31);
    // Meta parses positionally — the leading columns must be in template order.
    expect(header.slice(0, 8)).toEqual([
      'id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link',
    ]);
    // Every data row must carry exactly as many cells as the header.
    expect(parseCsvLine(lines[1])).toHaveLength(31);
  });

  it('includes enabled products and excludes disabled ones', async () => {
    const visible = await makeProduct({ name: 'Visible Cement' });
    await makeProduct({ name: 'Hidden Cement', enabled: false });

    const { res, rows } = await fetchFeed();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(String(visible._id));
    expect(res.text).not.toContain('Hidden Cement');
  });

  it('keeps the row id stable (product _id, matches pixel content_ids) across polls', async () => {
    const product = await makeProduct();

    const first = await fetchFeed();
    const second = await fetchFeed();

    expect(first.rows).toHaveLength(1);
    expect(first.rows[0].id).toBe(String(product._id));
    expect(second.rows[0].id).toBe(String(product._id));
  });

  it('prices rows from the admin display price, formatted "N.NN INR"', async () => {
    // Pin settings explicitly: admin price display, no GST added on top.
    await setGSTMode('no-gst');
    const whole = await makeProduct({ price: 450, gstType: 'exclusive' });
    const frac = await makeProduct({ price: 129.5, gstType: 'exclusive' });

    const { rows } = await fetchFeed();

    expect(rowById(rows, String(whole._id)).price).toBe('450.00 INR');
    expect(rowById(rows, String(frac._id)).price).toBe('129.50 INR');
  });

  it('links each row to the storefront product page', async () => {
    const product = await makeProduct();

    const { rows } = await fetchFeed();

    expect(rowById(rows, String(product._id)).link).toBe(`https://chardeevari.in/products/${product._id}`);
  });

  it('passes absolute image URLs through and prefixes relative paths', async () => {
    const abs = await makeProduct({ images: ['https://cdn.example.com/p/cement.jpg'] });
    const rel = await makeProduct({ images: ['/uploads/cement.jpg'] });

    const { rows } = await fetchFeed();

    expect(rowById(rows, String(abs._id)).image_link).toBe('https://cdn.example.com/p/cement.jpg');
    expect(rowById(rows, String(rel._id)).image_link).toBe('https://chardeevari.in/uploads/cement.jpg');
  });

  it('escapes commas, quotes and newlines into a single logical CSV row', async () => {
    const product = await makeProduct({
      name: 'Cement, OPC 53 Grade',
      description: 'The "best" cement\nfor slabs\r\nand columns',
    });

    const { res, lines, rows } = await fetchFeed();

    // Newlines were collapsed — still exactly header + one record.
    expect(lines).toHaveLength(2);
    expect(parseCsvLine(lines[1])).toHaveLength(31);

    // Meta's parser consumes these exact bytes: quoted fields, doubled quotes.
    expect(res.text).toContain('"Cement, OPC 53 Grade"');
    expect(res.text).toContain('"The ""best"" cement for slabs and columns"');

    // And they round-trip through a real CSV parse.
    const row = rowById(rows, String(product._id));
    expect(row.title).toBe('Cement, OPC 53 Grade');
    expect(row.description).toBe('The "best" cement for slabs and columns');
  });

  it('emits one row per variant, grouped under the parent _id, at variant prices', async () => {
    const { merchant } = await createMerchant();
    const product = await makeProduct({
      name: 'Steel TMT',
      sku: 'TMT-500',
      price: 0,
      variants: [
        { label: '8mm', price: 250, sku: 'TMT-500-8' }, // variant sku is NOT used as feed id
        { label: '10 mm', price: 350 },
      ],
    });
    await MerchantProduct.create({
      merchantId: merchant._id,
      productId: product._id,
      enabled: true,
      variantPricing: [
        { label: '8mm', price: 200, stock: 7 },
        { label: '10 mm', price: 300, stock: 0 },
      ],
    });

    const { rows } = await fetchFeed();
    expect(rows).toHaveLength(2);

    const v8 = rowById(rows, `${product._id}-8mm`);
    const v10 = rowById(rows, `${product._id}-10-mm`);
    expect(v8).toBeDefined();
    expect(v10).toBeDefined();

    expect(v8.item_group_id).toBe(String(product._id));
    expect(v10.item_group_id).toBe(String(product._id));
    expect(v8.title).toBe('Steel TMT (8mm)');
    expect(v10.title).toBe('Steel TMT (10 mm)');
    // Variant rows use the catalog variant price (not merchant variantPricing).
    expect(v8.price).toBe('250.00 INR');
    expect(v10.price).toBe('350.00 INR');

    // Per-label merchant stock drives availability of each variant row.
    expect(v8.availability).toBe('in stock');
    expect(v8.quantity_to_sell_on_facebook).toBe('7');
    expect(v10.availability).toBe('out of stock');
  });

  it('derives availability from stock held by approved, active merchants only', async () => {
    const { merchant: approved } = await createMerchant();
    const { merchant: pending } = await createMerchant({ activeStatus: 'pending' });

    const stocked = await makeProduct();
    const bare = await makeProduct();
    const pendingStocked = await makeProduct();

    await MerchantProduct.create({
      merchantId: approved._id, productId: stocked._id, stock: 25, enabled: true,
    });
    await MerchantProduct.create({
      merchantId: pending._id, productId: pendingStocked._id, stock: 50, enabled: true,
    });

    const { rows } = await fetchFeed();

    const inStock = rowById(rows, String(stocked._id));
    expect(inStock.availability).toBe('in stock');
    expect(inStock.quantity_to_sell_on_facebook).toBe('25');

    expect(rowById(rows, String(bare._id)).availability).toBe('out of stock');
    // Stock behind a non-approved merchant must not count.
    expect(rowById(rows, String(pendingStocked._id)).availability).toBe('out of stock');
  });

  it('returns a header-only CSV when no products exist', async () => {
    const { res, lines, rows } = await fetchFeed();

    expect(rows).toHaveLength(0);
    expect(lines).toHaveLength(1);
    expect(lines[0].startsWith('id,title,description,availability')).toBe(true);
    expect(res.text.endsWith('\n')).toBe(true);
  });
});
