/**
 * One-off: give product images uploaded before responsive variants existed
 * their resized WebP copies, so the site can serve them with srcset.
 *
 * For every product image stored in the MinIO product-images bucket outside
 * "r/", it copies the original to r/<same name> plus 160/400/800 px WebP
 * variants (services/ProductImageService.js) and points product.images at the
 * new URL. Old objects are left in place (search engines and the Meta catalogue
 * may still reference them). Product updatedAt is not touched — the rate pages
 * show it as the "last revised" price date.
 *
 * Dry run by default (lists what would change). Write with --apply:
 *   MONGODB_URI=... MINIO_ENDPOINT=... MINIO_ACCESS_KEY=... MINIO_SECRET_KEY=... \
 *     node scripts/backfillProductImageVariants.js [--apply]
 * Point it at a staging DB/bucket first; it is not run as part of deploys.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { minioClient, BUCKETS, parseObjectUrl } = require('../config/minio');
const { RESPONSIVE_DIR, buildVariants, storeWithVariants } = require('../services/ProductImageService');

const APPLY = process.argv.includes('--apply');
const STORAGE_ORIGIN = new URL(process.env.MINIO_PUBLIC_URL || 'https://storage.chardeevari.in').origin;

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

/** Object in our product-images bucket that has no variants yet, else null. */
const legacyObject = (url) => {
  let parsed;
  try {
    if (new URL(url).origin !== STORAGE_ORIGIN) return null;
    parsed = parseObjectUrl(url);
  } catch {
    return null;
  }
  const { bucketName, objectName } = parsed;
  if (bucketName !== BUCKETS.PRODUCT_IMAGES || objectName.startsWith(RESPONSIVE_DIR)) return null;
  return parsed;
};

/** Copy one legacy image into r/ with variants; returns the new URL. */
const migrate = async ({ bucketName, objectName }) => {
  const stat = await minioClient.statObject(bucketName, objectName);
  const buffer = await streamToBuffer(await minioClient.getObject(bucketName, objectName));
  const contentType = stat.metaData?.['content-type'] || 'application/octet-stream';
  const variants = await buildVariants(buffer);
  return storeWithVariants(buffer, RESPONSIVE_DIR + objectName, contentType, variants);
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-ecommerce');
  console.log(APPLY ? 'APPLY mode: writing to MinIO and MongoDB' : 'Dry run (pass --apply to write)');

  const products = await Product.find({ 'images.0': { $exists: true } }).select('name images').lean();
  const migrated = new Map(); // old URL -> new URL (one image may be shared by products)
  let failed = 0;
  let updatedProducts = 0;

  for (const product of products) {
    let changed = false;
    const images = [];
    for (const url of product.images) {
      const legacy = legacyObject(url);
      if (!legacy) {
        images.push(url);
        continue;
      }
      if (!APPLY) {
        console.log(`would migrate  ${product.name}: ${url}`);
        images.push(url);
        continue;
      }
      try {
        if (!migrated.has(url)) migrated.set(url, await migrate(legacy));
        images.push(migrated.get(url));
        changed = true;
        console.log(`migrated       ${product.name}: ${url} -> ${migrated.get(url)}`);
      } catch (error) {
        failed += 1;
        images.push(url); // keep the working original URL
        console.error(`FAILED         ${product.name}: ${url} (${error.message})`);
      }
    }
    if (changed) {
      await Product.updateOne({ _id: product._id }, { $set: { images } }, { timestamps: false });
      updatedProducts += 1;
    }
  }

  console.log(`Done. ${migrated.size} image(s) migrated, ${updatedProducts} product(s) updated, ${failed} failure(s).`);
  await mongoose.disconnect();
  if (failed) process.exitCode = 1;
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
