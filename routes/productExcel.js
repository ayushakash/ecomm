const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Merchant = require('../models/Merchant');
const MerchantProduct = require('../models/MerchantProduct');
const { verifyToken, requireAdmin, requireMerchantOrAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const UNITS = Product.schema.path('unit').enumValues;
const GST_RATES = Product.schema.path('gstRate').options.enum;
const GST_TYPES = Product.schema.path('gstType').enumValues;

// Column header → field key. Headers are matched case-insensitively, ignoring "*" and spaces.
const PRODUCT_COLUMNS = [
  ['SKU', 'sku', 18], ['Name*', 'name', 32], ['Description*', 'description', 40], ['Category*', 'category', 22],
  ['Brand', 'brand', 16], ['Grade', 'grade', 12], ['Unit', 'unit', 12], ['Price', 'price', 10], ['MRP', 'mrp', 10],
  ['GST Rate', 'gstRate', 10], ['GST Type', 'gstType', 12], ['Weight (kg)', 'weight', 12], ['Bulk Min Qty', 'bulkMinQty', 12],
  ['Tags', 'tags', 24], ['Images', 'images', 40], ['Enabled', 'enabled', 10]
];
const VARIANT_COLUMNS = [
  ['Product SKU*', 'productSku', 18], ['Product Name', 'productName', 32], ['Variant Label*', 'label', 16],
  ['Price*', 'price', 10], ['Stock', 'stock', 10], ['Variant SKU', 'sku', 18]
];
const CATEGORY_COLUMNS = [['Name*', 'name', 28], ['Description', 'description', 50]];
const STOCK_COLUMNS = [
  ['Product SKU*', 'sku', 18], ['Product Name', 'productName', 32], ['Category', 'category', 22], ['Unit', 'unit', 12],
  ['Variant Label', 'variant', 16], ['Price', 'price', 10], ['Stock', 'stock', 10], ['Enabled', 'enabled', 10]
];

const normHeader = (h) => String(h || '').replace(/[*\s]/g, '').toLowerCase();
const normKey = (s) => String(s || '').trim().toLowerCase();

const cellText = (cell) => {
  const v = cell?.value;
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (v.hyperlink) return String(v.text ?? v.hyperlink);
    return String(v.result ?? v.text ?? v.richText?.map((r) => r.text).join('') ?? '');
  }
  return String(v);
};

/** Rows of `{ _row, [key]: string }` from a sheet whose first row is the header. Unknown columns are ignored. */
function sheetRows(worksheet, columns) {
  if (!worksheet) return [];
  const byHeader = new Map(columns.map(([header, key]) => [normHeader(header), key]));
  const colKeys = [];
  worksheet.getRow(1).eachCell((cell, col) => { colKeys[col] = byHeader.get(normHeader(cellText(cell))); });
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const out = { _row: rowNumber };
    let any = false;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = colKeys[col];
      if (!key) return;
      const text = cellText(cell).trim();
      if (text) { out[key] = text; any = true; }
    });
    if (any) rows.push(out);
  });
  return rows;
}

const findSheet = (workbook, name) =>
  workbook.worksheets.find((ws) => normKey(ws.name) === normKey(name));

function addSheet(workbook, name, columns, rows) {
  const ws = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map(([header, key, width]) => ({ header, key, width }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  rows.forEach((r) => ws.addRow(r));
  return ws;
}

/** Dropdown validation on a column for rows 2..max so typed values stay inside the schema enums. */
function listValidation(ws, columnKey, values, max = 2000) {
  const col = ws.getColumn(columnKey);
  const formula = `"${values.join(',')}"`;
  for (let r = 2; r <= max; r++) {
    ws.getCell(r, col.number).dataValidation = {
      type: 'list', allowBlank: true, formulae: [formula],
      showErrorMessage: true, errorTitle: 'Invalid value', error: `Use one of: ${values.join(', ')}`
    };
  }
}

async function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

async function loadWorkbook(file) {
  if (!file) throw new ImportError('Choose an Excel (.xlsx) file');
  if (!/\.xlsx$/i.test(file.originalname)) throw new ImportError('Only Excel .xlsx files are supported');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer);
  } catch {
    throw new ImportError('Could not read the file. Save it as Excel Workbook (.xlsx) and try again.');
  }
  return workbook;
}

class ImportError extends Error {}

const parseNumber = (raw, { field, min = 0, integer = false }, errors, sheet, row) => {
  if (raw === undefined) return undefined;
  const n = Number(String(raw).replace(/[,₹\s]/g, ''));
  if (!Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) {
    errors.push({ sheet, row, message: `${field} must be ${integer ? 'a whole number' : 'a number'} ≥ ${min} (got "${raw}")` });
    return undefined;
  }
  return n;
};

const parseBool = (raw, field, errors, sheet, row) => {
  if (raw === undefined) return undefined;
  const v = normKey(raw);
  if (['yes', 'y', 'true', '1', 'enabled', 'active'].includes(v)) return true;
  if (['no', 'n', 'false', '0', 'disabled', 'inactive'].includes(v)) return false;
  errors.push({ sheet, row, message: `${field} must be Yes or No (got "${raw}")` });
  return undefined;
};

const splitList = (raw) => (raw ? raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : undefined);
const yesNo = (b) => (b === false ? 'No' : 'Yes');

/* ───────────────────────────── Admin: master catalog ───────────────────────────── */

/**
 * @route  GET /api/product-excel/catalog/export
 * @desc   Workbook with Products, Variants and Categories sheets (also the import template)
 * @access Admin
 */
router.get('/catalog/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find().populate('category', 'name').sort({ name: 1 }).lean(),
      Category.find().sort({ name: 1 }).lean()
    ]);

    const workbook = new ExcelJS.Workbook();
    const productSheet = addSheet(workbook, 'Products', PRODUCT_COLUMNS, products.map((p) => ({
      sku: p.sku, name: p.name, description: p.description, category: p.category?.name || '',
      brand: p.specifications?.brand || '', grade: p.specifications?.grade || '', unit: p.unit,
      price: p.price, mrp: p.mrp, gstRate: p.gstRate, gstType: p.gstType, weight: p.weight, bulkMinQty: p.bulkMinQty,
      tags: (p.tags || []).join(', '), images: (p.images || []).join(', '), enabled: yesNo(p.enabled)
    })));
    listValidation(productSheet, 'unit', UNITS);
    listValidation(productSheet, 'gstRate', GST_RATES);
    listValidation(productSheet, 'gstType', GST_TYPES);
    listValidation(productSheet, 'enabled', ['Yes', 'No']);

    addSheet(workbook, 'Variants', VARIANT_COLUMNS, products.flatMap((p) => (p.variants || []).map((v) => ({
      productSku: p.sku, productName: p.name, label: v.label, price: v.price, stock: v.stock, sku: v.sku || ''
    }))));
    addSheet(workbook, 'Categories', CATEGORY_COLUMNS, categories.map((c) => ({ name: c.name, description: c.description || '' })));

    const help = workbook.addWorksheet('Instructions');
    help.getColumn(1).width = 110;
    [
      'HOW TO IMPORT PRODUCTS',
      '1. Categories: every category used in Products must exist in the app or be listed in the Categories sheet (new ones are created). Matching ignores upper/lower case.',
      '2. Products: rows with an SKU that already exists are UPDATED. Rows with a new SKU or a blank SKU are CREATED (blank SKU → generated automatically).',
      '   Blank cells keep the current value when updating. Name, Description and Category are required for new products.',
      `   Unit: ${UNITS.join(', ')}  |  GST Rate: ${GST_RATES.join(', ')}  |  GST Type: ${GST_TYPES.join(', ')}  |  Enabled: Yes / No`,
      '   Tags and Images: separate several values with commas.',
      '3. Variants: link each row to its product with Product SKU (or the exact product Name for a new product without SKU).',
      '   If a product has ANY row in Variants, its variant list is replaced by exactly those rows. Products with no rows keep their variants.',
      '   Variant labels must be unique per product.',
      '4. Upload the file and click "Check file" first. Nothing is saved while any row has an error.'
    ].forEach((line, i) => { help.getCell(i + 1, 1).value = line; if (i === 0) help.getCell(1, 1).font = { bold: true }; });

    await sendWorkbook(res, workbook, `products-${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    console.error('Catalog export error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Export failed' });
  }
});

/** Validate the catalog workbook and build the write plan without touching the database. */
async function planCatalogImport(workbook) {
  const errors = [];
  const productSheet = findSheet(workbook, 'Products');
  if (!productSheet) throw new ImportError('Sheet "Products" not found. Start from the exported file.');

  const productRows = sheetRows(productSheet, PRODUCT_COLUMNS);
  const variantRows = sheetRows(findSheet(workbook, 'Variants'), VARIANT_COLUMNS);
  const categoryRows = sheetRows(findSheet(workbook, 'Categories'), CATEGORY_COLUMNS);

  // Categories: existing ones by lowercase name, plus new ones from the sheet.
  const existingCategories = await Category.find().lean();
  const categoryByKey = new Map(existingCategories.map((c) => [normKey(c.name), c]));
  const newCategories = new Map();
  const categoryUpdates = [];
  for (const row of categoryRows) {
    if (!row.name) { errors.push({ sheet: 'Categories', row: row._row, message: 'Name is required' }); continue; }
    const key = normKey(row.name);
    const existing = categoryByKey.get(key);
    if (existing) {
      if (row.description !== undefined && row.description !== (existing.description || '')) {
        categoryUpdates.push({ _id: existing._id, description: row.description });
      }
    } else if (newCategories.has(key)) {
      errors.push({ sheet: 'Categories', row: row._row, message: `Category "${row.name}" is listed twice` });
    } else {
      newCategories.set(key, { name: row.name.trim(), description: row.description });
    }
  }

  // Products.
  const skus = productRows.map((r) => r.sku).filter(Boolean);
  const existingProducts = await Product.find({ sku: { $in: skus } });
  const productBySku = new Map(existingProducts.map((p) => [p.sku, p]));
  const seenSkus = new Map();
  const seenNewNames = new Map();
  const plans = []; // { row, doc (existing) | null, fields, categoryKey, variants: null|[] }

  for (const row of productRows) {
    const S = 'Products';
    const r = row._row;
    const before = errors.length;
    if (row.sku) {
      if (seenSkus.has(row.sku)) errors.push({ sheet: S, row: r, message: `SKU "${row.sku}" also on row ${seenSkus.get(row.sku)}` });
      seenSkus.set(row.sku, r);
    }
    const doc = row.sku ? productBySku.get(row.sku) || null : null;
    if (!doc) {
      if (!row.name) errors.push({ sheet: S, row: r, message: 'Name is required for a new product' });
      if (!row.description) errors.push({ sheet: S, row: r, message: 'Description is required for a new product' });
      if (!row.category) errors.push({ sheet: S, row: r, message: 'Category is required for a new product' });
      if (!row.sku && row.name) {
        const k = normKey(row.name);
        if (seenNewNames.has(k)) errors.push({ sheet: S, row: r, message: `New product "${row.name}" without SKU also on row ${seenNewNames.get(k)}; give each an SKU` });
        seenNewNames.set(k, r);
      }
    }

    let categoryKey;
    if (row.category) {
      categoryKey = normKey(row.category);
      if (!categoryByKey.has(categoryKey) && !newCategories.has(categoryKey)) {
        errors.push({ sheet: S, row: r, message: `Category "${row.category}" does not exist. Add it to the Categories sheet or fix the spelling.` });
      }
    }
    if (row.unit !== undefined && !UNITS.includes(normKey(row.unit))) {
      errors.push({ sheet: S, row: r, message: `Unit "${row.unit}" is invalid. Use: ${UNITS.join(', ')}` });
    }
    const gstRate = parseNumber(row.gstRate, { field: 'GST Rate' }, errors, S, r);
    if (gstRate !== undefined && !GST_RATES.includes(gstRate)) {
      errors.push({ sheet: S, row: r, message: `GST Rate ${gstRate} is invalid. Use: ${GST_RATES.join(', ')}` });
    }
    if (row.gstType !== undefined && !GST_TYPES.includes(normKey(row.gstType))) {
      errors.push({ sheet: S, row: r, message: `GST Type "${row.gstType}" is invalid. Use: ${GST_TYPES.join(', ')}` });
    }
    const fields = {
      name: row.name, description: row.description,
      brand: row.brand, grade: row.grade,
      unit: row.unit !== undefined ? normKey(row.unit) : undefined,
      price: parseNumber(row.price, { field: 'Price' }, errors, S, r),
      mrp: parseNumber(row.mrp, { field: 'MRP' }, errors, S, r),
      gstRate,
      gstType: row.gstType !== undefined ? normKey(row.gstType) : undefined,
      weight: parseNumber(row.weight, { field: 'Weight' }, errors, S, r),
      bulkMinQty: parseNumber(row.bulkMinQty, { field: 'Bulk Min Qty', integer: true }, errors, S, r),
      tags: splitList(row.tags), images: splitList(row.images),
      enabled: parseBool(row.enabled, 'Enabled', errors, S, r)
    };
    if (errors.length === before) plans.push({ row: r, sku: row.sku, name: row.name, doc, fields, categoryKey, variants: null });
  }

  // Variants: grouped per product, matched by SKU (sheet or DB) or by name of a new product without SKU.
  const planBySku = new Map(plans.filter((p) => p.sku).map((p) => [p.sku, p]));
  const planByNewName = new Map(plans.filter((p) => !p.sku && p.name).map((p) => [normKey(p.name), p]));
  const variantOnlySkus = variantRows.map((v) => v.productSku).filter((s) => s && !planBySku.has(s) && !seenSkus.has(s));
  const variantOnlyDocs = await Product.find({ sku: { $in: variantOnlySkus } });
  for (const doc of variantOnlyDocs) {
    const plan = { row: null, sku: doc.sku, name: doc.name, doc, fields: {}, categoryKey: undefined, variants: null };
    plans.push(plan);
    planBySku.set(doc.sku, plan);
  }

  const allVariantSkus = new Set((await Product.find({}, 'variants.sku sku').lean())
    .flatMap((p) => (p.variants || []).filter((v) => v.sku).map((v) => `${p.sku}\u0000${v.sku}`)));
  const variantSkuOwner = new Map();
  for (const key of allVariantSkus) { const [owner, vs] = key.split('\u0000'); variantSkuOwner.set(vs, owner); }
  const seenVariantSkus = new Map();

  for (const row of variantRows) {
    const S = 'Variants';
    const r = row._row;
    let plan;
    if (row.productSku) plan = planBySku.get(row.productSku);
    else if (row.productName) plan = planByNewName.get(normKey(row.productName));
    if (!plan) {
      const ref = row.productSku || row.productName;
      if (!ref) errors.push({ sheet: S, row: r, message: 'Product SKU is required' });
      else if (row.productSku && seenSkus.has(row.productSku)) continue; // its product row has errors, already reported
      else errors.push({ sheet: S, row: r, message: `Product "${ref}" not found in the Products sheet or the catalog` });
      continue;
    }
    if (!row.label) { errors.push({ sheet: S, row: r, message: 'Variant Label is required' }); continue; }
    const price = parseNumber(row.price, { field: 'Price' }, errors, S, r);
    if (row.price === undefined) errors.push({ sheet: S, row: r, message: 'Price is required' });
    const stock = parseNumber(row.stock, { field: 'Stock', integer: true }, errors, S, r);
    plan.variants = plan.variants || [];
    if (plan.variants.some((v) => normKey(v.label) === normKey(row.label))) {
      errors.push({ sheet: S, row: r, message: `Variant "${row.label}" is listed twice for ${plan.sku || plan.name}` });
      continue;
    }
    if (row.sku) {
      const owner = variantSkuOwner.get(row.sku);
      if (seenVariantSkus.has(row.sku)) errors.push({ sheet: S, row: r, message: `Variant SKU "${row.sku}" also on row ${seenVariantSkus.get(row.sku)}` });
      else if (owner && owner !== plan.sku) errors.push({ sheet: S, row: r, message: `Variant SKU "${row.sku}" already belongs to product ${owner}` });
      seenVariantSkus.set(row.sku, r);
    }
    if (price !== undefined) plan.variants.push({ label: row.label.trim(), price, stock: stock ?? 0, sku: row.sku });
  }

  const usedNewCategories = new Set(plans.map((p) => p.categoryKey).filter((k) => newCategories.has(k)));
  return {
    errors,
    plans,
    categoryByKey,
    newCategories: [...newCategories].map(([key, c]) => ({ key, ...c })),
    categoryUpdates,
    summary: {
      productsToCreate: plans.filter((p) => !p.doc).length,
      productsToUpdate: plans.filter((p) => p.doc).length,
      productsWithVariants: plans.filter((p) => p.variants).length,
      variantRows: plans.reduce((n, p) => n + (p.variants?.length || 0), 0),
      categoriesToCreate: newCategories.size,
      categoriesUnusedButCreated: newCategories.size - usedNewCategories.size,
      categoriesToUpdate: categoryUpdates.length
    }
  };
}

function applyProductFields(doc, fields, categoryId) {
  const set = (path, value) => { if (value !== undefined) doc.set(path, value); };
  set('name', fields.name);
  set('description', fields.description);
  set('specifications.brand', fields.brand);
  set('specifications.grade', fields.grade);
  ['unit', 'price', 'mrp', 'gstRate', 'gstType', 'weight', 'bulkMinQty', 'tags', 'images', 'enabled']
    .forEach((k) => set(k, fields[k]));
  if (categoryId) doc.category = categoryId;
}

/** Replace variants with the sheet list, keeping the _id of variants whose label already existed (carts reference it). */
function applyVariants(doc, variants) {
  const byLabel = new Map((doc.variants || []).map((v) => [normKey(v.label), v]));
  doc.variants = variants.map((v) => {
    const existing = byLabel.get(normKey(v.label));
    return { ...(existing ? { _id: existing._id } : {}), label: v.label, price: v.price, stock: v.stock, sku: v.sku };
  });
}

/**
 * @route  POST /api/product-excel/catalog/import?dryRun=true   (multipart field "file": .xlsx)
 * @desc   Validate (dryRun) or apply the Products/Variants/Categories workbook. Applies nothing if any row is invalid.
 * @access Admin
 */
router.post('/catalog/import', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const workbook = await loadWorkbook(req.file);
    const plan = await planCatalogImport(workbook);
    const dryRun = req.query.dryRun === 'true';
    if (plan.errors.length || dryRun) {
      return res.status(plan.errors.length ? 422 : 200).json({ success: !plan.errors.length, dryRun, summary: plan.summary, errors: plan.errors });
    }

    for (const c of plan.newCategories) {
      const created = await Category.create({ name: c.name, description: c.description });
      plan.categoryByKey.set(c.key, created);
    }
    for (const u of plan.categoryUpdates) await Category.updateOne({ _id: u._id }, { description: u.description });

    const failed = [];
    let created = 0;
    let updated = 0;
    for (const p of plan.plans) {
      try {
        const doc = p.doc || new Product({ sku: p.sku || undefined });
        applyProductFields(doc, p.fields, p.categoryKey ? plan.categoryByKey.get(p.categoryKey)._id : undefined);
        if (p.variants) applyVariants(doc, p.variants);
        await doc.save(); // save(), not insertMany: runs the SKU generator and schema validation
        p.doc ? updated++ : created++;
      } catch (err) {
        failed.push({ sheet: 'Products', row: p.row, message: `${p.sku || p.name}: ${err.message}` });
      }
    }
    res.status(failed.length ? 207 : 200).json({ success: !failed.length, created, updated, categoriesCreated: plan.newCategories.length, summary: plan.summary, errors: failed });
  } catch (err) {
    if (err instanceof ImportError) return res.status(400).json({ success: false, message: err.message });
    console.error('Catalog import error:', err);
    res.status(500).json({ success: false, message: 'Import failed' });
  }
});

/* ───────────────────────────── Merchant stock & prices ───────────────────────────── */

/** Merchant whose stock is being read/written: self for merchants, `merchantId` (query/body) for admins. */
async function resolveMerchant(req) {
  if (req.user.role === 'merchant') return req.user;
  const merchantId = req.query.merchantId || req.body?.merchantId;
  if (!merchantId || !mongoose.isValidObjectId(merchantId)) throw new ImportError('merchantId is required');
  const merchant = await Merchant.findById(merchantId);
  if (!merchant) throw new ImportError('Merchant not found');
  return merchant;
}

/**
 * @route  GET /api/product-excel/stock/export?merchantId=&scope=mine|all
 * @desc   One row per product (variant label blank) and per variant. scope=all adds catalog products the merchant doesn't sell yet.
 * @access Merchant (self) or Admin (any merchant)
 */
router.get('/stock/export', verifyToken, requireMerchantOrAdmin, async (req, res) => {
  try {
    const merchant = await resolveMerchant(req);
    const links = await MerchantProduct.find({ merchantId: merchant._id }).lean();
    const linkByProduct = new Map(links.map((l) => [String(l.productId), l]));
    const productFilter = req.query.scope === 'all' ? { enabled: true } : { _id: { $in: links.map((l) => l.productId) } };
    const products = await Product.find(productFilter).populate('category', 'name').sort({ name: 1 }).lean();

    const rows = [];
    for (const p of products) {
      const link = linkByProduct.get(String(p._id));
      const base = { sku: p.sku, productName: p.name, category: p.category?.name || '', unit: p.unit };
      rows.push({ ...base, variant: '', price: link?.price ?? '', stock: link?.stock ?? '', enabled: link ? yesNo(link.enabled) : '' });
      for (const v of p.variants || []) {
        const vp = link?.variantPricing?.find((x) => normKey(x.label) === normKey(v.label));
        rows.push({ ...base, variant: v.label, price: vp?.price ?? '', stock: vp?.stock ?? '', enabled: '' });
      }
    }

    const workbook = new ExcelJS.Workbook();
    const ws = addSheet(workbook, 'Stock', STOCK_COLUMNS, rows);
    listValidation(ws, 'enabled', ['Yes', 'No'], Math.max(rows.length + 1, 2));
    const help = workbook.addWorksheet('Instructions');
    help.getColumn(1).width = 110;
    [
      'HOW TO UPDATE STOCK AND PRICES',
      '• Edit Price, Stock and Enabled only. Product SKU and Variant Label identify the row — do not change them.',
      '• A row with a blank Variant Label is the product itself; rows with a label are its variants (label must match the catalog).',
      '• Products you do not sell yet are added when you fill Price or Stock on their row; rows left blank are skipped.',
      '• Blank cells keep the current value. Enabled (Yes/No) is read from the product row only.',
      '• Upload the file and click "Check file" first. Nothing is saved while any row has an error.'
    ].forEach((line, i) => { help.getCell(i + 1, 1).value = line; if (i === 0) help.getCell(1, 1).font = { bold: true }; });

    const slug = String(merchant.businessName || 'merchant').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    await sendWorkbook(res, workbook, `stock-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    if (err instanceof ImportError) return res.status(400).json({ message: err.message });
    console.error('Stock export error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Export failed' });
  }
});

async function planStockImport(workbook, merchant) {
  const errors = [];
  const sheet = findSheet(workbook, 'Stock') || workbook.worksheets[0];
  if (!sheet) throw new ImportError('The file has no sheets');
  const rows = sheetRows(sheet, STOCK_COLUMNS);
  const S = sheet.name;

  const products = await Product.find({ sku: { $in: [...new Set(rows.map((r) => r.sku).filter(Boolean))] } }).lean();
  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const links = await MerchantProduct.find({ merchantId: merchant._id, productId: { $in: products.map((p) => p._id) } });
  const linkByProduct = new Map(links.map((l) => [String(l.productId), l]));

  const changes = new Map(); // productId → { product, link, base:{}, variants: Map(label → {price,stock}) }
  const seen = new Map();
  for (const row of rows) {
    const r = row._row;
    if (!row.sku) { errors.push({ sheet: S, row: r, message: 'Product SKU is required' }); continue; }
    const product = productBySku.get(row.sku);
    if (!product) { errors.push({ sheet: S, row: r, message: `SKU "${row.sku}" is not in the catalog` }); continue; }

    let label = '';
    if (row.variant) {
      const variant = (product.variants || []).find((v) => normKey(v.label) === normKey(row.variant));
      if (!variant) {
        const known = (product.variants || []).map((v) => v.label).join(', ') || 'none';
        errors.push({ sheet: S, row: r, message: `Variant "${row.variant}" does not exist for ${row.sku}. Known variants: ${known}` });
        continue;
      }
      label = variant.label; // canonical spelling from the catalog
    }
    const key = `${row.sku}\u0000${normKey(label)}`;
    if (seen.has(key)) { errors.push({ sheet: S, row: r, message: `${row.sku}${label ? ` / ${label}` : ''} also on row ${seen.get(key)}` }); continue; }
    seen.set(key, r);

    const before = errors.length;
    const price = parseNumber(row.price, { field: 'Price' }, errors, S, r);
    const stock = parseNumber(row.stock, { field: 'Stock', integer: true }, errors, S, r);
    const enabled = label ? undefined : parseBool(row.enabled, 'Enabled', errors, S, r);
    if (errors.length !== before || (price === undefined && stock === undefined && enabled === undefined)) continue;

    const id = String(product._id);
    if (!changes.has(id)) changes.set(id, { product, link: linkByProduct.get(id) || null, base: {}, variants: new Map() });
    const c = changes.get(id);
    if (label) c.variants.set(label, { price, stock });
    else Object.assign(c.base, { price, stock, enabled });
  }

  const list = [...changes.values()];
  return {
    errors,
    changes: list,
    summary: {
      rows: rows.length,
      productsToAdd: list.filter((c) => !c.link).length,
      productsToUpdate: list.filter((c) => c.link).length,
      variantRows: list.reduce((n, c) => n + c.variants.size, 0)
    }
  };
}

/**
 * @route  POST /api/product-excel/stock/import?merchantId=&dryRun=true   (multipart field "file": .xlsx)
 * @desc   Validate (dryRun) or apply the Stock sheet to the merchant's MerchantProduct rows
 * @access Merchant (self) or Admin (any merchant)
 */
router.post('/stock/import', verifyToken, requireMerchantOrAdmin, upload.single('file'), async (req, res) => {
  try {
    const merchant = await resolveMerchant(req);
    const workbook = await loadWorkbook(req.file);
    const plan = await planStockImport(workbook, merchant);
    const dryRun = req.query.dryRun === 'true';
    if (plan.errors.length || dryRun) {
      return res.status(plan.errors.length ? 422 : 200).json({ success: !plan.errors.length, dryRun, summary: plan.summary, errors: plan.errors });
    }

    let added = 0;
    let updated = 0;
    for (const c of plan.changes) {
      const link = c.link || new MerchantProduct({ merchantId: merchant._id, productId: c.product._id });
      if (c.base.price !== undefined) link.price = c.base.price;
      if (c.base.stock !== undefined) link.stock = c.base.stock;
      if (c.base.enabled !== undefined) link.enabled = c.base.enabled;
      for (const [label, v] of c.variants) {
        const existing = link.variantPricing.find((x) => normKey(x.label) === normKey(label));
        if (existing) {
          if (v.price !== undefined) existing.price = v.price;
          if (v.stock !== undefined) existing.stock = v.stock;
        } else {
          const catalogPrice = c.product.variants.find((x) => x.label === label)?.price ?? 0;
          link.variantPricing.push({ label, price: v.price ?? catalogPrice, stock: v.stock ?? 0 });
        }
      }
      await link.save();
      c.link ? updated++ : added++;
    }
    res.json({ success: true, added, updated, summary: plan.summary, errors: [] });
  } catch (err) {
    if (err instanceof ImportError) return res.status(400).json({ success: false, message: err.message });
    console.error('Stock import error:', err);
    res.status(500).json({ success: false, message: 'Import failed' });
  }
});

module.exports = router;
