const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const { verifyToken, requireMerchantOrAdmin, requireAdmin, optionalAuth } = require('../middleware/auth');
const MerchantProduct = require('../models/MerchantProduct');
const Category = require('../models/Category');
const mongoose = require("mongoose");
const { getPricingCalculator } = require('../utils/pricingUtils');

const router = express.Router();

// @route   POST /api/products
/**
 * POST /products
 * - Admin: Creates a new master product (auto SKU generated in schema)
 * - Merchant: Links an existing master product to their inventory with price & stock
 */
router.post(
  "/",
  [
    verifyToken,
    requireMerchantOrAdmin,

    // Common validation
    body("category").optional().notEmpty().withMessage("Category is required"),
    body("name").optional().notEmpty().withMessage("Product name is required"),

    // Admin/Merchant-specific
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("stock")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock must be a non-negative integer"),
    body("unit")
      .optional()
      .isString()
      .withMessage("Unit must be a string"),
  ],
  async (req, res) => {
     console.log("REQ BODY", req.body);
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { category, name, description, images, specifications, tags, price, unit } = req.body;

      // ---------------- Admin Flow ----------------
      if (req.user.role === "admin") {
        // Validate category
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
          return res.status(404).json({ message: "Category not found" });
        }

        const newProduct = new Product({
          name,
          description,
          category,
          images: Array.isArray(images) ? images : images ? [images] : [],
          specifications: specifications || {},
          tags: tags || [],
          price: price || 0,   // Admin-defined selling price
          unit: unit || "",     // Admin-defined unit
          enabled: true,
        });

        const savedProduct = await newProduct.save();

        return res.status(201).json({
          message: "✅ Product created successfully in master catalog",
          product: savedProduct,
        });
      }

      // ---------------- Merchant Flow ----------------
      if (req.user.role === "merchant") {
        console.log("REQ BODY", req.body);
        const { productId, price, stock } = req.body;

        if (!productId) {
          return res
            .status(400)
            .json({ message: "Product ID (from master catalog) is required" });
        }
        if (price === undefined || stock === undefined) {
          return res
            .status(400)
            .json({ message: "Price and Stock are required" });
        }

        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found in catalog" });
        }

        const merchant = await Merchant.findById(req.user._id);
        if (!merchant) {
          return res.status(400).json({ message: "Merchant profile not found" });
        }
        console.log(merchant._id, product._id);
        let merchantProduct = await MerchantProduct.findOne({
          merchantId: merchant._id,
          productId: product._id,
        });

        if (merchantProduct) {
          merchantProduct.price = price;
          merchantProduct.stock = stock;
          merchantProduct.enabled = true;
          await merchantProduct.save();
          console.log("UPDATED", merchantProduct);
          return res.status(200).json({
            message: "✅ Merchant product updated successfully",
            merchantProduct: await merchantProduct.populate("productId"),
          });
        }

        merchantProduct = new MerchantProduct({
          merchantId: merchant._id,
          productId: product._id,
          price,
          stock,
        });

        await merchantProduct.save();

        return res.status(201).json({
          message: "✅ Product added to merchant inventory successfully",
          merchantProduct: await merchantProduct.populate("productId"),
        });
      }
    } catch (error) {
      console.error("Add product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);





// @route   GET /api/products
// @desc    Get products with filtering
// @access  Public (with optional authentication)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search, minPrice, maxPrice } = req.query;
    const skip = (page - 1) * limit;

    const role = req.user?.role || 'guest';

    if (role === 'merchant') {
  // Get merchant profile from user
  const merchant = await Merchant.findById(req.user._id);
  if (!merchant) {
    return res.status(400).json({ message: "Merchant profile not found" });
  }

  // Fetch merchant’s products
  const merchantProducts = await MerchantProduct.find({ merchantId: merchant._id })
    .populate({
      path: 'productId',
      populate: { path: 'category', select: 'name' }
    })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const products = merchantProducts.map(mp => ({
    ...mp.productId,
    myStock: mp.stock,
    price: mp.price,
    enabled: mp.enabled,
  }));

  return res.json({
    products,
    totalProducts: merchantProducts.length,
    totalPages: Math.ceil(merchantProducts.length / limit),
    currentPage: parseInt(page)
  });
} else {
      // ---- Admin / Customer flow (existing logic) ----
      const productFilter = {};
      if (category) productFilter.category = category;
      if (search) {
        productFilter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'specifications.brand': { $regex: search, $options: 'i' } },
          { 'specifications.grade': { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }
      
      // For customers and guests, only show enabled products
      if (role === 'customer' || role === 'guest') {
        productFilter.enabled = true;
      }

      // Apply price filtering
      if (minPrice || maxPrice) {
        productFilter.price = {};
        if (minPrice) productFilter.price.$gte = parseFloat(minPrice);
        if (maxPrice) productFilter.price.$lte = parseFloat(maxPrice);
      }

      // Dynamic sorting based on sortBy parameter
      let sortOptions = { createdAt: -1 }; // default sort
      if (req.query.sortBy) {
        switch (req.query.sortBy) {
          case 'name':
            sortOptions = { name: 1 };
            break;
          case 'price':
            sortOptions = { price: 1 };
            break;
          case 'createdAt':
          case 'latest':
            sortOptions = { createdAt: -1 };
            break;
          default:
            sortOptions = { createdAt: -1 };
        }
      }

      let products = await Product.find(productFilter)
        .populate('category', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // For customers and guests, filter out products that don't have any enabled merchant variants
      if (role === 'customer' || role === 'guest') {
        const productIds = products.map(p => p._id);
        const enabledMerchantProducts = await MerchantProduct.find({
          productId: { $in: productIds },
          enabled: true,
          stock: { $gt: 0 } // Also ensure there's stock available
        }).distinct('productId');
        
        products = products.filter(product => 
          enabledMerchantProducts.some(id => id.toString() === product._id.toString())
        );
      }

      const totalProducts = await Product.countDocuments(productFilter);

      // Get pricing calculator for centralized pricing logic
      const pricingCalculator = await getPricingCalculator();

      for (let product of products) {
        if (role === 'admin' || role === 'customer' || role === 'guest') {
          // Use centralized stock calculation
          product.totalStock = await pricingCalculator.getTotalStock(product._id);
          
          // Use centralized price display logic
          if (role === 'customer' || role === 'guest') {
            product.price = await pricingCalculator.getDisplayPrice(product);
          }
        }
      }

      return res.json({
        products,
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: parseInt(page)
      });
    }

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});





// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Master products for adding inventory
router.get('/master-products', verifyToken, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'specifications.brand': { $regex: search, $options: 'i' } },
        { 'specifications.grade': { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter)
      .select("_id name") // only id + name for dropdown
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      products,
      totalProducts: await Product.countDocuments(filter),
    });
  } catch (error) {
    console.error("Get master products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get pricing calculator for centralized pricing logic
    const pricingCalculator = await getPricingCalculator();

    // Calculate total stock and display price
    const totalStock = await pricingCalculator.getTotalStock(product._id);
    const displayPrice = await pricingCalculator.getDisplayPrice(product);

    const productWithStockAndPrice = {
      ...product.toObject(),
      totalStock,
      price: displayPrice
    };

    res.json(productWithStockAndPrice);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Merchant or Admin)
router.put('/:id', [
  verifyToken,
  requireMerchantOrAdmin,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const val = typeof value === 'string' ? value.trim() : value.toString();
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('Invalid category ID');
      }
      return true;
    }),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').optional().isIn(['kg', 'ton', 'bag', 'piece', 'cubic-meter', 'sq-ft']).withMessage('Invalid unit'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // ----------------- Permission check -----------------
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant || product.merchantId?.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this product' });
      }
    }
    // Admin bypasses merchant check

    // ----------------- Update allowed fields -----------------
    const allowedUpdates = [
      'name', 'description', 'category', 'price', 'unit', 'stock',
      'enabled', 'images', 'specifications', 'tags', 'minOrderQuantity', 'deliveryTime'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        // Convert price to float if provided as string
        if (field === 'price') {
          product[field] = parseFloat(req.body[field]);
        } else {
          product[field] = req.body[field];
        }
      }
    });

    await product.save();

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// @route   PUT /api/products/:id/stock
// @desc    Update product stock
// @access  Private (Merchant only)
router.put('/:id/stock', [
  verifyToken,
  requireMerchantOrAdmin,
body('stock')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') return parseInt(value, 10);
      return value;
    })
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
 body('price')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') return parseFloat(value);
      return value;
    })
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('enabled').optional({ nullable: true }).toBoolean().isBoolean().withMessage('Enabled must be true or false')
], async (req, res) => {
  try {
    console.log(req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stock, price, enabled } = req.body;

    // Find merchant
    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) return res.status(400).json({ message: "Merchant profile not found" });

    // Find merchant product
    const merchantProduct = await MerchantProduct.findOne({ 
      merchantId: merchant._id,
      productId: req.params.id
    });
    if (!merchantProduct) return res.status(404).json({ message: "Merchant product not found" });

    // Update only fields provided
    if (stock !== undefined) merchantProduct.stock = stock;
    if (price !== undefined) merchantProduct.price = price;
    if (enabled !== undefined) merchantProduct.enabled = enabled;

    await merchantProduct.save();

    res.json({
      message: "Product updated successfully",
      merchantProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});





// @route   PUT /api/products/:id/enable
// @desc    Enable/disable product
// @access  Private (Merchant or Admin)
router.put('/:id/enable', [
  verifyToken,
  requireMerchantOrAdmin,
  body('enabled').isBoolean().withMessage('Enabled must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has permission to update this product
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant || product.merchantId.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this product' });
      }
    }

    product.enabled = req.body.enabled;
    await product.save();

    res.json({
      message: `Product ${req.body.enabled ? 'enabled' : 'disabled'} successfully`,
      product
    });
  } catch (error) {
    console.error('Toggle product enable error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Merchant or Admin)
router.delete('/:id', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has permission to delete this product
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant || product.merchantId.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this product' });
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/merchant/my
// @desc    Get current merchant's products
// @access  Private (Merchant only)
router.get('/merchant/my', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    let merchantId = req.query.merchantId;

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant) {
        return res.status(400).json({ message: 'Merchant profile not found' });
      }
      merchantId = merchant._id;
    }

    const { page = 1, limit = 10, enabled } = req.query;
    
    const filter = { merchantId };
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const merchantProducts = await MerchantProduct.find(filter)
      .populate({
        path: 'productId',
        populate: { path: 'category' }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await MerchantProduct.countDocuments(filter);

    // Transform data to match expected frontend format, filtering out null products
    const products = merchantProducts
      .filter(mp => mp.productId) // Filter out entries where productId is null
      .map(mp => ({
        _id: mp.productId._id,
        name: mp.productId.name,
        description: mp.productId.description,
        category: mp.productId.category,
        images: mp.productId.images,
        specifications: mp.productId.specifications,
        tags: mp.productId.tags,
        unit: mp.productId.unit,
        price: mp.price,              // Merchant's price
        myStock: mp.stock,            // Merchant's stock
        enabled: mp.enabled,          // Merchant's enabled status
        merchantProductId: mp._id     // Reference to MerchantProduct
      }));

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get merchant products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Add new category
router.post("/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = new Category({ name, description });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
