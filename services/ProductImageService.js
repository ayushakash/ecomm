/**
 * Responsive product images.
 *
 * Uploaded product photos are stored as-is (full resolution for zoom, Google
 * Images and the Meta catalogue) plus resized WebP copies for srcset:
 *
 *   product-images/r/<name>.<ext>        original
 *   product-images/r/<name>-160w.webp    \
 *   product-images/r/<name>-400w.webp     } VARIANT_WIDTHS, never upscaled
 *   product-images/r/<name>-800w.webp    /
 *
 * The "r/" prefix is the contract with the web client
 * (client/src/utils/productImage.js): only URLs under it get a srcset, so
 * images uploaded before variants existed keep working until backfilled
 * (scripts/backfillProductImageVariants.js).
 */
const sharp = require('sharp');
const {
  minioClient,
  BUCKETS,
  putPublicObject,
  uniqueObjectName,
  parseObjectUrl,
  deleteFile
} = require('../config/minio');

const VARIANT_WIDTHS = [160, 400, 800];
const RESPONSIVE_DIR = 'r/';
const WEBP_QUALITY = 75;

const variantObjectName = (objectName, width) => objectName.replace(/\.[^./]+$/, '') + `-${width}w.webp`;

const isResponsiveObject = (bucketName, objectName) =>
  bucketName === BUCKETS.PRODUCT_IMAGES && objectName.startsWith(RESPONSIVE_DIR) && !/-\d+w\.webp$/.test(objectName);

/**
 * Resize an image to every VARIANT_WIDTHS entry as WebP.
 * Throws if sharp cannot decode the input.
 * @returns {Promise<Array<{ width: number, buffer: Buffer }>>}
 */
const buildVariants = async (input) => {
  const source = sharp(input).rotate(); // apply EXIF orientation
  return Promise.all(
    VARIANT_WIDTHS.map(async (width) => ({
      width,
      buffer: await source
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
    }))
  );
};

/** Store an original under `objectName` (in r/) and its WebP variants. */
const storeWithVariants = async (buffer, objectName, contentType, variants) => {
  const bucket = BUCKETS.PRODUCT_IMAGES;
  await Promise.all(
    variants.map(({ width, buffer: variant }) =>
      putPublicObject(bucket, variantObjectName(objectName, width), variant, 'image/webp')
    )
  );
  // Original last: its URL is only handed out once every variant exists.
  return putPublicObject(bucket, objectName, buffer, contentType);
};

/**
 * Upload a product photo with its resized variants.
 * Files sharp cannot read are stored without variants (no srcset, still shown).
 * @returns {Promise<string>} - Public URL of the original
 */
const uploadProductImage = async (buffer, originalName, contentType) => {
  let variants;
  try {
    variants = await buildVariants(buffer);
  } catch (error) {
    console.warn(`Product image "${originalName}" not resizable (${error.message}); stored without variants`);
    return putPublicObject(BUCKETS.PRODUCT_IMAGES, uniqueObjectName(originalName), buffer, contentType);
  }
  const url = await storeWithVariants(buffer, RESPONSIVE_DIR + uniqueObjectName(originalName), contentType, variants);
  console.log(`✅ Product image uploaded with ${variants.length} variants: ${url}`);
  return url;
};

/** Delete a stored file; product originals in r/ take their variants with them. */
const deleteImage = async (fileUrl) => {
  const { bucketName, objectName } = parseObjectUrl(fileUrl);
  if (isResponsiveObject(bucketName, objectName)) {
    await minioClient.removeObjects(
      bucketName,
      VARIANT_WIDTHS.map((width) => variantObjectName(objectName, width))
    );
  }
  await deleteFile(fileUrl);
};

module.exports = {
  VARIANT_WIDTHS,
  RESPONSIVE_DIR,
  variantObjectName,
  buildVariants,
  storeWithVariants,
  uploadProductImage,
  deleteImage
};
