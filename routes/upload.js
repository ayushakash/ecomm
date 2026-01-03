const express = require('express');
const multer = require('multer');
const { uploadFile, deleteFile, BUCKETS } = require('../config/minio');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer to use memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

/**
 * @route   POST /api/upload/product-images
 * @desc    Upload multiple product images
 * @access  Private (Admin only)
 */
router.post('/product-images', verifyToken, requireAdmin, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Upload all files to MinIO
    const uploadPromises = req.files.map(file =>
      uploadFile(
        file.buffer,
        file.originalname,
        BUCKETS.PRODUCT_IMAGES,
        file.mimetype
      )
    );

    const urls = await Promise.all(uploadPromises);

    res.json({
      message: `${urls.length} image(s) uploaded successfully`,
      urls
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: error.message || 'Error uploading images'
    });
  }
});

/**
 * @route   POST /api/upload/single-product-image
 * @desc    Upload single product image
 * @access  Private (Admin only)
 */
router.post('/single-product-image', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const url = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      BUCKETS.PRODUCT_IMAGES,
      req.file.mimetype
    );

    res.json({
      message: 'Image uploaded successfully',
      url
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: error.message || 'Error uploading image'
    });
  }
});

/**
 * @route   POST /api/upload/merchant-image
 * @desc    Upload merchant image
 * @access  Private (Merchant or Admin)
 */
router.post('/merchant-image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const url = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      BUCKETS.MERCHANT_IMAGES,
      req.file.mimetype
    );

    res.json({
      message: 'Image uploaded successfully',
      url
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: error.message || 'Error uploading image'
    });
  }
});

/**
 * @route   POST /api/upload/user-avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/user-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const url = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      BUCKETS.USER_AVATARS,
      req.file.mimetype
    );

    res.json({
      message: 'Avatar uploaded successfully',
      url
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: error.message || 'Error uploading avatar'
    });
  }
});

/**
 * @route   DELETE /api/upload/delete
 * @desc    Delete file from MinIO
 * @access  Private (Admin only)
 */
router.delete('/delete', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'File URL is required' });
    }

    await deleteFile(url);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      message: error.message || 'Error deleting file'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File is too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Maximum is 10 files.'
      });
    }
  }
  return res.status(500).json({
    message: error.message || 'Error uploading file'
  });
});

module.exports = router;
