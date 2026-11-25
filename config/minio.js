const Minio = require('minio');

// MinIO Client Configuration
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'storage.chardeevari.in',
  port: parseInt(process.env.MINIO_PORT) || 443,
  useSSL: process.env.MINIO_USE_SSL !== 'false', // Default true
  accessKey: process.env.MINIO_ACCESS_KEY || 'ecomm_minio_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'MinioSecure5332173e9bbcdd'
});

// Available buckets
const BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  USER_AVATARS: 'user-avatars',
  MERCHANT_IMAGES: 'merchant-images',
  DOCUMENTS: 'documents'
};

/**
 * Ensure bucket exists, create if not
 */
const ensureBucket = async (bucketName) => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');

      // Set public read policy for product images
      if (bucketName === BUCKETS.PRODUCT_IMAGES || bucketName === BUCKETS.MERCHANT_IMAGES) {
        const policy = {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }]
        };
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      }

      console.log(`✅ Bucket "${bucketName}" created successfully`);
    }
  } catch (error) {
    console.error(`Error ensuring bucket "${bucketName}":`, error);
    throw error;
  }
};

const publicUrl = (bucketName, objectName) =>
  `${process.env.MINIO_PUBLIC_URL || 'https://storage.chardeevari.in'}/${bucketName}/${objectName}`;

/** "<timestamp>-<random>.<ext>" object name for an uploaded file. */
const uniqueObjectName = (fileName) => {
  const fileExtension = fileName.split('.').pop();
  return `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
};

/**
 * Store a buffer under an exact object name (bucket is created if missing).
 * @returns {Promise<string>} - Public URL of the object
 */
const putPublicObject = async (bucketName, objectName, fileBuffer, contentType) => {
  await ensureBucket(bucketName);
  await minioClient.putObject(bucketName, objectName, fileBuffer, fileBuffer.length, {
    'Content-Type': contentType,
    'Cache-Control': 'max-age=31536000' // 1 year cache
  });
  return publicUrl(bucketName, objectName);
};

/**
 * Upload file to MinIO
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} bucketName - Bucket to upload to
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - Public URL of uploaded file
 */
const uploadFile = async (fileBuffer, fileName, bucketName = BUCKETS.PRODUCT_IMAGES, contentType = 'image/jpeg') => {
  try {
    const url = await putPublicObject(bucketName, uniqueObjectName(fileName), fileBuffer, contentType);
    console.log(`✅ File uploaded: ${url}`);
    return url;
  } catch (error) {
    console.error('MinIO upload error:', error);
    throw error;
  }
};

/** Split a storage URL into { bucketName, objectName }. */
const parseObjectUrl = (fileUrl) => {
  // Example: https://storage.chardeevari.in/product-images/1234-abc.jpg
  const pathParts = new URL(fileUrl).pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) {
    throw new Error('Invalid file URL format');
  }
  return { bucketName: pathParts[0], objectName: pathParts.slice(1).join('/') };
};

/**
 * Delete file from MinIO
 * @param {string} fileUrl - Full URL of the file
 * @returns {Promise<void>}
 */
const deleteFile = async (fileUrl) => {
  try {
    const { bucketName, objectName } = parseObjectUrl(fileUrl);
    await minioClient.removeObject(bucketName, objectName);
    console.log(`✅ File deleted: ${fileUrl}`);
  } catch (error) {
    console.error('MinIO delete error:', error);
    throw error;
  }
};

/**
 * Delete multiple files from MinIO
 * @param {string[]} fileUrls - Array of file URLs
 * @returns {Promise<void>}
 */
const deleteFiles = async (fileUrls) => {
  try {
    const deletePromises = fileUrls.map(url => deleteFile(url));
    await Promise.all(deletePromises);
    console.log(`✅ Deleted ${fileUrls.length} files`);
  } catch (error) {
    console.error('MinIO bulk delete error:', error);
    throw error;
  }
};

module.exports = {
  minioClient,
  BUCKETS,
  uploadFile,
  putPublicObject,
  uniqueObjectName,
  parseObjectUrl,
  deleteFile,
  deleteFiles,
  ensureBucket
};
