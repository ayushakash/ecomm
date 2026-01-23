const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const Address = require('../models/Address');
const { verifyToken, requireCustomer, requireMerchantOrAdmin, requireAdmin } = require('../middleware/auth');
const MerchantProduct = require('../models/MerchantProduct');
const { getPricingCalculator } = require('../utils/pricingUtils');
const OrderLogService = require('../services/OrderLogService');
const AbandonedCartService = require('../services/AbandonedCartService');
const { cleanOrderResponse } = require('../utils/orderCleanup');

const router = express.Router();

/**
 * ---------------------------
 * CALCULATE CART TOTALS (for checkout preview)
 * ---------------------------
 */
router.post('/calculate-cart-totals', [
  verifyToken,
  requireCustomer,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { items, customerArea, addressId } = req.body;

    // Get pricing calculator with current settings
    const pricingCalculator = await getPricingCalculator();

    // Get cityId from address for city-specific pricing
    let cityId = null;
    if (addressId) {
      const address = await Address.findById(addressId);
      if (address && address.city) {
        const CityMaster = require('../models/CityMaster');
        const cityMaster = await CityMaster.findOne({
          cityName: { $regex: new RegExp(`^${address.city}$`, 'i') }
        });
        if (cityMaster) {
          cityId = cityMaster._id.toString();
        }
      }
    }

    const cartItems = [];
    const MerchantProduct = require('../models/MerchantProduct');

    // Calculate prices for each item
    for (const item of items) {
      const product = await Product.findById(item.productId).populate('category', 'name');
      if (!product) return res.status(400).json({ message: `Product ${item.productId} not found` });
      if (!product.enabled) return res.status(400).json({ message: `Product ${product.name} is not available` });

      // Get base price (considering city-specific pricing if applicable)
      let basePrice = product.price;
      if (cityId && product.cityPricing && product.cityPricing.length > 0) {
        const cityPrice = product.cityPricing.find(
          cp => cp.cityId.toString() === cityId.toString() && cp.isAvailable
        );
        if (cityPrice) {
          basePrice = cityPrice.price;
        }
      }

      // Get merchant base price (for split GST calculation)
      let merchantPrice = basePrice * 0.8; // Default fallback
      const merchantProduct = await MerchantProduct.findOne({
        productId: product._id,
        enabled: true,
        stock: { $gt: 0 }
      }).sort({ price: 1 }); // Get lowest merchant price

      if (merchantProduct && merchantProduct.price) {
        merchantPrice = merchantProduct.price;
      }

      // Calculate GST and final price
      const gstRate = product.gstRate || 18;
      const gstType = product.gstType || 'exclusive';
      const gstCalc = pricingCalculator.calculateProductGST(basePrice, gstRate, gstType);

      // Get display price for showing to customer
      const displayPrice = await pricingCalculator.getDisplayPrice(product, cityId);

      // Get GST mode to determine which prices to pass to calculateOrderTotals
      const gstMode = pricingCalculator.settings.gstMode || 'no-gst';

      // In inclusive mode, calculateSplitGST expects GST-inclusive prices
      let priceForCalculation, merchantPriceForCalculation;

      if (gstMode === 'inclusive') {
        // Pass GST-inclusive prices to calculateOrderTotals
        priceForCalculation = displayPrice; // ₹708 (includes GST)
        merchantPriceForCalculation = Math.round(merchantPrice * (1 + gstRate / 100) * 100) / 100; // ₹590 (includes GST)
      } else {
        // Pass exclusive prices (current behavior for exclusive/no-gst modes)
        priceForCalculation = basePrice; // ₹600 (exclusive)
        merchantPriceForCalculation = merchantPrice; // ₹500 (exclusive)
      }

      cartItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: displayPrice,
        totalPrice: displayPrice * item.quantity, // Total amount customer pays
        price: priceForCalculation,             // Price for calculations (inclusive in inclusive mode)
        merchantPrice: merchantPriceForCalculation, // Merchant price for split GST calculation
        gstRate: gstRate,
        gstType: gstType,
        weight: product.weight || 0
      });
    }

    // Calculate totals
    const customerData = {
      distance: req.user.distance || 0,
      area: customerArea || req.user.area
    };

    const totals = pricingCalculator.calculateOrderTotals(cartItems, customerData);

    // Return breakdown for checkout display
    res.json({
      success: true,
      items: cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      subtotalBeforeGST: totals.subtotalBeforeGST,
      subtotal: totals.subtotal,
      tax: totals.tax,
      deliveryCharges: totals.deliveryCharges,
      platformFee: totals.platformFee,
      totalAmount: totals.totalAmount,
      gstBreakdown: totals.gstBreakdown,        // Include split GST breakdown
      deliverySplit: totals.deliverySplit,      // Include delivery split
      platformFeeBreakdown: totals.platformFeeBreakdown,
      breakdown: totals.breakdown
    });
  } catch (error) {
    console.error('Calculate cart totals error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * ---------------------------
 * CREATE ORDER
 * ---------------------------
 */
router.post('/', [
  verifyToken,
  requireCustomer,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('customerPhone').trim().notEmpty().withMessage('Phone number is required'),
  body('customerAddress').trim().notEmpty().withMessage('Address is required'),
  body('paymentMethod').optional().isIn(['cod', 'online', 'bank-transfer']).withMessage('Invalid payment method'),
  body('deliveryInstructions').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { items, customerPhone, customerAddress, customerArea, paymentMethod = 'cod', deliveryInstructions, deliveryLocation, addressId, deliveryAddressDetails } = req.body;

    console.log('Received order data:', {
      customerPhone,
      customerAddress,
      customerArea,
      paymentMethod,
      deliveryInstructions,
      addressId,
      deliveryLocation
    });

    // Get pricing calculator with current settings
    const pricingCalculator = await getPricingCalculator();

    // Get cityId from address for city-specific pricing
    let cityId = null;
    if (addressId) {
      const address = await Address.findById(addressId);
      if (address && address.city) {
        // Try to find matching city in CityMaster
        const CityMaster = require('../models/CityMaster');
        const cityMaster = await CityMaster.findOne({
          cityName: { $regex: new RegExp(`^${address.city}$`, 'i') }
        });
        if (cityMaster) {
          cityId = cityMaster._id.toString();
        }
      }
    }

    const orderItems = [];
    let totalWeight = 0;

    // Validate items and calculate prices
    for (const item of items) {
      const product = await Product.findById(item.productId).populate('category', 'name');
      if (!product) return res.status(400).json({ message: `Product ${item.productId} not found` });
      if (!product.enabled) return res.status(400).json({ message: `Product ${product.name} is not available` });

      // Check total available stock using centralized validation
      const totalStock = await pricingCalculator.getTotalStock(item.productId);
      if (totalStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${totalStock}, Requested: ${item.quantity}`
        });
      }

      // Get base price (considering city-specific pricing if applicable)
      let basePrice = product.price;

      // Check for city-specific pricing (highest priority)
      if (cityId && product.cityPricing && product.cityPricing.length > 0) {
        const cityPrice = product.cityPricing.find(
          cp => cp.cityId.toString() === cityId.toString() && cp.isAvailable
        );
        if (cityPrice) {
          basePrice = cityPrice.price;
        }
      } else {
        // Use priceDisplayMode to determine base price
        switch (pricingCalculator.settings.priceDisplayMode) {
          case 'merchant':
            const merchantProduct = await MerchantProduct.findOne({
              productId: product._id,
              enabled: true,
              stock: { $gt: 0 }
            }).sort({ price: 1 });
            if (merchantProduct) basePrice = merchantProduct.price;
            break;
          case 'lowest':
            const lowestPrice = await MerchantProduct.findOne({
              productId: product._id,
              enabled: true,
              stock: { $gt: 0 }
            }).sort({ price: 1 });
            if (lowestPrice) basePrice = Math.min(product.price, lowestPrice.price);
            break;
          default:
            basePrice = product.price;
        }
      }

      // Get merchant base price (for split GST calculation)
      let merchantPrice = basePrice * 0.8; // Default fallback
      const merchantProductForPrice = await MerchantProduct.findOne({
        productId: product._id,
        enabled: true,
        stock: { $gt: 0 }
      }).sort({ price: 1 }); // Get lowest merchant price

      if (merchantProductForPrice && merchantProductForPrice.price) {
        merchantPrice = merchantProductForPrice.price;
      }

      const gstRate = product.gstRate || 18;

      // Get display price for showing to customer (affected by display mode)
      const displayPrice = await pricingCalculator.getDisplayPrice(product, cityId);

      // Get GST mode to determine which prices to pass to calculateOrderTotals
      const gstMode = pricingCalculator.settings.gstMode || 'no-gst';

      // In inclusive mode, calculateSplitGST expects GST-inclusive prices
      // In exclusive/no-gst modes, it expects exclusive prices
      let priceForCalculation, merchantPriceForCalculation;

      if (gstMode === 'inclusive') {
        // Pass GST-inclusive prices to calculateOrderTotals
        priceForCalculation = displayPrice; // ₹708 (includes GST)
        merchantPriceForCalculation = Math.round(merchantPrice * (1 + gstRate / 100) * 100) / 100; // ₹590 (includes GST)
      } else {
        // Pass exclusive prices (current behavior for exclusive/no-gst modes)
        priceForCalculation = basePrice; // ₹600 (exclusive)
        merchantPriceForCalculation = merchantPrice; // ₹500 (exclusive)
      }

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: displayPrice, // Price shown to customer (changes with display mode)
        totalPrice: displayPrice * item.quantity, // Total amount customer pays (inclusive of GST in inclusive mode)
        merchantUnitPrice: merchantPrice, // Merchant's base cost per unit (exclusive)
        merchantTotalPrice: merchantPrice * item.quantity, // Merchant's total base cost (exclusive)
        sku: product.sku,
        unit: product.unit,
        weight: product.weight || 0,
        price: priceForCalculation, // Price for calculations (inclusive in inclusive mode, exclusive otherwise)
        merchantPrice: merchantPriceForCalculation, // Merchant price for split GST calculation
        gstRate: gstRate,
        assignedMerchantId: null, // assigned later
        itemStatus: 'pending'
      });

      totalWeight += (product.weight || 0) * item.quantity;
    }

    // Calculate totals using centralized pricing
    const customerData = {
      distance: req.user.distance || 0, // This could come from user profile or be calculated
      area: customerArea || deliveryLocation?.area || req.user.area // Use customerArea from request, fallback to delivery area or user area
    };
    
    const totals = pricingCalculator.calculateOrderTotals(orderItems, customerData);

    // Handle address creation/update - ensure we always have an addressId
    let finalAddressId = addressId;

    if (deliveryAddressDetails && !addressId) {
      // Create new address if no addressId provided (web app scenario)
      try {
        const newAddress = new Address({
          ...deliveryAddressDetails,
          user: req.user._id,
          title: deliveryAddressDetails.title || 'Order Address',
          addressType: deliveryAddressDetails.addressType || 'other',
          deliveryInstructions: deliveryInstructions || deliveryAddressDetails.deliveryInstructions,
          isDefault: false
        });
        const createdAddress = await newAddress.save();
        finalAddressId = createdAddress._id;
      } catch (addressError) {
        console.error('Address creation error:', addressError);
        return res.status(400).json({ message: 'Failed to create delivery address' });
      }
    } else if (!finalAddressId && (deliveryLocation || customerAddress)) {
      // Create address from deliveryLocation or customer address if no addressId
      try {
        const addressData = deliveryLocation ? {
          fullName: deliveryLocation.receiverName || req.user.name,
          phoneNumber: deliveryLocation.receiverPhone || customerPhone,
          addressLine1: deliveryLocation.address || customerAddress,
          area: deliveryLocation.area || req.user.area,
          city: deliveryLocation.city || '',
          state: deliveryLocation.state || '',
          pincode: deliveryLocation.pincode || '',
          coordinates: deliveryLocation.coordinates || [0, 0]
        } : {
          fullName: req.user.name,
          phoneNumber: customerPhone,
          addressLine1: customerAddress,
          area: req.user.area,
          city: '',
          state: '',
          pincode: '',
          coordinates: [0, 0]
        };

        const newAddress = new Address({
          ...addressData,
          user: req.user._id,
          title: 'Order Address',
          addressType: 'other',
          deliveryInstructions: deliveryInstructions || '',
          isDefault: false
        });
        const createdAddress = await newAddress.save();
        finalAddressId = createdAddress._id;
      } catch (addressError) {
        console.error('Address creation error:', addressError);
        return res.status(400).json({ message: 'Failed to create delivery address' });
      }
    }

    // Ensure we have an address ID
    if (!finalAddressId) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    // Generate order number
    const orderCount = await Order.countDocuments() + 1;
    const orderNumber = `ORD${String(orderCount).padStart(6, '0')}`;

    // Use customerArea from request body, fallback to other sources
    let finalCustomerArea = customerArea || req.user.area;
    if (deliveryLocation?.area) {
      finalCustomerArea = deliveryLocation.area;
    } else if (deliveryAddressDetails?.area) {
      finalCustomerArea = deliveryAddressDetails.area;
    }

    console.log('Creating order with customerArea:', finalCustomerArea);

    // Fetch address details to get coordinates
    let finalDeliveryLocation;
    if (finalAddressId) {
      const address = await Address.findById(finalAddressId);
      if (address) {
        // Convert coordinates from {latitude, longitude} to [longitude, latitude] GeoJSON format
        let coordinates = [0, 0];
        if (address.coordinates && address.coordinates.longitude && address.coordinates.latitude) {
          coordinates = [address.coordinates.longitude, address.coordinates.latitude];
        }

        finalDeliveryLocation = {
          type: 'Point',
          coordinates: coordinates,
          address: `${address.addressLine1}, ${address.addressLine2 || ''}, ${address.landmark || ''}, ${address.area}, ${address.city}, ${address.state} - ${address.pincode}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, ''),
          area: address.area,
          pincode: address.pincode,
          city: address.city,
          state: address.state,
          isCurrentLocation: deliveryLocation?.isCurrentLocation || false,
          receiverName: address.fullName,
          receiverPhone: address.phoneNumber
        };
      }
    } else if (deliveryLocation && deliveryLocation.coordinates) {
      // Fallback to deliveryLocation if provided
      finalDeliveryLocation = {
        type: 'Point',
        coordinates: Array.isArray(deliveryLocation.coordinates) ? deliveryLocation.coordinates : [0, 0],
        address: deliveryLocation.address || customerAddress,
        area: deliveryLocation.area || customerArea,
        pincode: deliveryLocation.pincode || '',
        city: deliveryLocation.city || '',
        state: deliveryLocation.state || '',
        isCurrentLocation: deliveryLocation.isCurrentLocation || false,
        receiverName: deliveryLocation.receiverName || req.user.name,
        receiverPhone: deliveryLocation.receiverPhone || customerPhone
      };
    }

    const order = new Order({
      orderNumber,
      customerId: req.user._id,
      customerName: req.user.name,
      customerPhone,
      customerAddress,
      customerArea: finalCustomerArea,
      deliveryAddressId: finalAddressId, // Always have an address ID now
      deliveryLocation: finalDeliveryLocation,
      items: orderItems,
      subtotal: totals.subtotal,
      subtotalBeforeGST: totals.subtotalBeforeGST, // Base amount before GST
      tax: totals.tax,
      deliveryCharge: totals.deliveryCharges,
      platformFee: totals.platformFee || 0,
      totalAmount: totals.totalAmount,
      paymentMethod,
      deliveryInstructions,
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      pricingBreakdown: totals.breakdown, // Store pricing settings used
      gstBreakdown: totals.gstBreakdown,  // Store split GST breakdown
      deliverySplit: totals.deliverySplit  // Store delivery fee split
    });

    await order.save();

    // Send immediate response with cleaned order (but preserve internal data in DB)
    res.status(201).json({
      message: 'Order placed successfully',
      order: cleanOrderResponse(order),
      // Include pricing breakdown in response for order confirmation
      pricingBreakdown: totals
    });

    // Handle all heavy operations in background (async, non-blocking)
    setImmediate(async () => {
      try {
        // Stock will be reserved when merchant accepts the order, not at placement
        // await reserveStockForOrder(order);

        // Background logging
        await OrderLogService.logOrderEvent(
          'order_created',
          order,
          {
            userId: req.user._id,
            userType: 'customer',
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone || customerPhone
          },
          req,
          {
            metadata: {
              itemCount: orderItems.length,
              totalWeight: totalWeight,
              paymentMethod: paymentMethod
            }
          }
        );

        // Background abandoned cart conversion
        await AbandonedCartService.markAsConverted(req.user._id, order._id);
      } catch (backgroundError) {
        console.error('Background operation failed during order creation:', backgroundError);
      }
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * ---------------------------
 * GET ORDERS (with role filters)
 * ---------------------------
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let filter = {};

    // Filter based on role
    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (merchant) {
        // Only include orders where items are assigned to this merchant
        // AND the delivery address is in the same city as the merchant
        filter['items.assignedMerchantId'] = merchant._id;

        // CRITICAL FIX: Also filter by merchant's city to prevent cross-city orders
        if (merchant.city) {
          // Get all addresses in the same city as the merchant
          const cityAddresses = await Address.find({
            city: { $regex: new RegExp(`^${merchant.city}$`, 'i') }
          }).distinct('_id');

          // Only show orders with delivery addresses in the same city
          filter.deliveryAddressId = { $in: cityAddresses };
        }
      }
    }

    if (status) {
      filter['items.itemStatus'] = status; // match the updated field name
    }

    // Fetch orders with pagination
    const orders = await Order.find(filter)
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .populate('items.assignedMerchantId', 'name businessName contact area')
      .populate('deliveryAddressId', 'fullName phoneNumber addressLine1 addressLine2 landmark area city state pincode addressType title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    // For merchants, only show items assigned to them (filter already applied above)
    let resultOrders = orders;
    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      const { calculateMerchantPayout } = require('../utils/merchantPayoutUtils');

      // Use Promise.all to await async payout calculations
      const ordersWithPayouts = await Promise.all(
        orders.map(async (order) => {
          const filteredItems = order.items.filter(item => {
            // Only show items assigned to this merchant
            return item.assignedMerchantId?._id.equals(merchant._id);
          });

          const orderObj = { ...order.toObject(), items: filteredItems };

          // ✅ Use stored payout from database (single source of truth)
          const payout = order.merchantPayouts?.find(
            p => p.merchantId.toString() === merchant._id.toString()
          );

          if (payout) {
            console.log(`✅ Using STORED payout for order ${order.orderNumber}`);
          } else {
            console.log(`⚠️ No payout found for order ${order.orderNumber} - merchant may not be assigned`);
          }

          console.log(`💰 Payout for order ${order.orderNumber}:`, JSON.stringify(payout, null, 2));
          if (payout) {
            orderObj.merchantPayout = payout;
          }

          return orderObj;
        })
      );

      resultOrders = ordersWithPayouts.filter(order => order.items.length > 0); // Only return orders with relevant items
    }

    const cleanedOrders = cleanOrderResponse(resultOrders);
    console.log('📤 Sending', cleanedOrders.length, 'orders. First order merchantPayout:', cleanedOrders[0]?.merchantPayout ? 'EXISTS ✅' : 'MISSING ❌');

    res.json({
      orders: cleanedOrders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


/**
 * ---------------------------
 * GET ORDER BY ID
 * ---------------------------
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name images')
      .populate('items.assignedMerchantId', 'name businessName contact area')
      .populate('deliveryAddressId', 'fullName phoneNumber addressLine1 addressLine2 landmark area city state pincode addressType title');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant || !order.items.some(i => i.merchantId?.toString() === merchant._id.toString())) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    res.json({ order: cleanOrderResponse(order) });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * ASSIGN MERCHANT TO ITEM
 * ---------------------------
 */
router.put('/:orderId/items/:itemId/assign', [
  verifyToken,
  requireMerchantOrAdmin,
], async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    let merchantId;

    if (req.user.role === 'merchant') {
      // merchant assigns only themselves
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant) {
        return res.status(400).json({ message: 'Merchant not found' });
      }
      merchantId = merchant._id;
    } else if (req.user.role === 'admin') {
      // admin can choose merchant freely
      if (!req.body.merchantId) {
        return res.status(400).json({ message: 'merchantId is required for admin assignment' });
      }
      merchantId = req.body.merchantId;
    }

    const order = await assignMerchantToItem(orderId, itemId, merchantId, { validateMerchant: true });

    // Send immediate response with cleaned order
    res.json({ message: "Merchant assigned successfully", order: cleanOrderResponse(order) });

    // Handle logging in background (async, non-blocking)
    setImmediate(async () => {
      try {
        // Get merchant phone from merchant record if user is a merchant
        let userPhone = req.user.phone;
        if (req.user.role === 'merchant') {
          const merchantUser = await Merchant.findById(req.user._id);
          if (merchantUser && merchantUser.contact?.phone) {
            userPhone = merchantUser.contact.phone;
          }
        }

        await OrderLogService.logOrderEvent(
          'order_assigned',
          order,
          {
            userId: req.user._id,
            userType: req.user.role,
            merchantName: req.user.name,
            merchantEmail: req.user.email,
            merchantPhone: userPhone
          },
          req,
          {
            previousStatus: 'pending',
            metadata: {
              merchantId: merchantId,
              itemId: itemId,
              assignedBy: req.user.role
            }
          }
        );
      } catch (backgroundError) {
        console.error('Background operation failed during merchant assignment:', backgroundError);
      }
    });
  } catch (error) {
    console.error("Assign item error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * ---------------------------
 * BULK ASSIGN MERCHANT TO ITEMS
 * ---------------------------
 */
router.put('/:orderId/items/bulk-assign', [
  verifyToken,
  requireMerchantOrAdmin,
  body('itemIds').isArray({ min: 1 }).withMessage('At least one item ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { orderId } = req.params;
    const { itemIds } = req.body;

    console.log(`\n🔵 BULK ASSIGN REQUEST:`, JSON.stringify({
      orderId,
      itemIds,
      merchantRole: req.user.role,
      merchantId: req.user._id
    }, null, 2));

    let merchantId;

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant) {
        return res.status(400).json({ message: 'Merchant not found' });
      }
      merchantId = merchant._id;
    } else if (req.user.role === 'admin') {
      if (!req.body.merchantId) {
        return res.status(400).json({ message: 'merchantId is required for admin assignment' });
      }
      merchantId = req.body.merchantId;
    }

    let order;
    const assignedItems = [];
    const failedItems = [];

    // Assign all items
    for (const itemId of itemIds) {
      try {
        order = await assignMerchantToItem(orderId, itemId, merchantId, { validateMerchant: true });
        assignedItems.push(itemId);
      } catch (error) {
        console.error(`Failed to assign item ${itemId}:`, error.message);
        failedItems.push({ itemId, error: error.message });
        // Continue with other items even if one fails
      }
    }

    if (assignedItems.length === 0) {
      return res.status(400).json({
        message: 'Failed to assign any items',
        failedItems
      });
    }

    // Send immediate response with cleaned order
    res.json({
      message: `${assignedItems.length} item(s) assigned successfully${failedItems.length > 0 ? `, ${failedItems.length} failed` : ''}`,
      order: cleanOrderResponse(order),
      assignedItemsCount: assignedItems.length,
      totalItemsCount: itemIds.length,
      failedItems: failedItems.length > 0 ? failedItems : undefined
    });

    // Handle logging in background
    setImmediate(async () => {
      try {
        let userPhone = req.user.phone;
        if (req.user.role === 'merchant') {
          const merchantUser = await Merchant.findById(req.user._id);
          if (merchantUser && merchantUser.contact?.phone) {
            userPhone = merchantUser.contact.phone;
          }
        }

        await OrderLogService.logOrderEvent(
          'order_assigned',
          order,
          {
            userId: req.user._id,
            userType: req.user.role,
            merchantName: req.user.name,
            merchantEmail: req.user.email,
            merchantPhone: userPhone
          },
          req,
          {
            previousStatus: 'pending',
            metadata: {
              merchantId: merchantId,
              itemIds: assignedItems,
              bulkAssignment: true,
              assignedBy: req.user.role
            }
          }
        );
      } catch (backgroundError) {
        console.error('Background operation failed during bulk assignment:', backgroundError);
      }
    });
  } catch (error) {
    console.error("Bulk assign items error:", error);
    res.status(500).json({ message: error.message });
  }
});


/**
 * ---------------------------
 * UPDATE ITEM STATUS
 * ---------------------------
 */
router.put('/:orderId/items/:itemId/status', [
  verifyToken,
  requireMerchantOrAdmin,
  body('status').isIn(['pending', 'assigned', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('note').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { orderId, itemId } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (req.user.role === 'merchant') {
      const merchant = await Merchant.findById(req.user._id);
      if (!merchant || item.assignedMerchantId?.toString() !== merchant._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const previousStatus = item.itemStatus;
    item.itemStatus = status;
    if (note) {
      order.statusHistory.push({ status, timestamp: new Date(), note });
    }

    // Set expected delivery time when merchant confirms order (90 minutes from confirmation)
    if (status === 'processing' && previousStatus !== 'processing') {
      const confirmationTime = new Date();
      const expectedDeliveryTime = new Date(confirmationTime.getTime() + 90 * 60 * 1000); // 90 minutes
      order.expectedDeliveryDate = expectedDeliveryTime;
      console.log('⏰ Setting Expected Delivery Time:', {
        orderNumber: order.orderNumber,
        itemId: itemId,
        confirmationTime: confirmationTime.toISOString(),
        expectedDeliveryTime: expectedDeliveryTime.toISOString(),
        minutesAdded: 90
      });
    }

    // Set delivery date immediately for instant response
    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
    }

    // Save order immediately and send response with cleaned order
    await order.save();
    res.json({ message: 'Item status updated successfully', order: cleanOrderResponse(order) });

    // Handle all heavy operations in background (async, non-blocking)
    setImmediate(async () => {
      try {
        // Stock is already reduced when merchant accepts the order, not on delivery
        // if (status === 'delivered') {
        //   await handleStockReductionOnDelivery(orderId, itemId);
        // }

        // Background logging
        let eventType;
        switch(status) {
          case 'processing':
            eventType = 'order_accepted';
            break;
          case 'shipped':
            eventType = 'order_shipped';
            break;
          case 'delivered':
            eventType = 'order_delivered';
            break;
          case 'cancelled':
            eventType = 'order_cancelled';
            break;
          default:
            eventType = 'order_status_updated';
        }

        await OrderLogService.logOrderEvent(
          eventType,
          order,
          {
            userId: req.user._id,
            userType: req.user.role,
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone
          },
          req,
          {
            previousStatus: previousStatus,
            metadata: {
              itemId: itemId,
              note: note,
              statusChangedBy: req.user.role
            }
          }
        );
      } catch (backgroundError) {
        console.error('Background operation failed:', backgroundError);
        // Don't throw - this runs after response is sent
      }
    });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * BULK UPDATE ITEM STATUS
 * ---------------------------
 */
router.put('/:orderId/items/bulk-status', [
  verifyToken,
  requireMerchantOrAdmin,
  body('itemIds').isArray({ min: 1 }).withMessage('At least one item ID is required'),
  body('status').isIn(['pending', 'assigned', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('note').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { orderId } = req.params;
    const { itemIds, status, note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const merchant = req.user.role === 'merchant' ? await Merchant.findById(req.user._id) : null;
    const updatedItems = [];

    // Update all items
    for (const itemId of itemIds) {
      const item = order.items.id(itemId);
      if (!item) {
        console.warn(`Item ${itemId} not found in order ${orderId}`);
        continue;
      }

      // Verify merchant authorization
      if (req.user.role === 'merchant') {
        if (!merchant || item.assignedMerchantId?.toString() !== merchant._id.toString()) {
          console.warn(`Merchant not authorized for item ${itemId}`);
          continue;
        }
      }

      item.itemStatus = status;
      updatedItems.push(itemId);
    }

    if (updatedItems.length === 0) {
      return res.status(400).json({ message: 'No items were updated' });
    }

    if (note) {
      order.statusHistory.push({ status, timestamp: new Date(), note });
    }

    // Set delivery date if all items are delivered
    if (status === 'delivered' && order.items.every(i => i.itemStatus === 'delivered')) {
      order.actualDeliveryDate = new Date();
    }

    // Save order immediately and send response with cleaned order
    await order.save();
    res.json({
      message: `${updatedItems.length} item(s) updated successfully`,
      order: cleanOrderResponse(order),
      updatedItemsCount: updatedItems.length,
      totalItemsCount: itemIds.length
    });

    // Handle all heavy operations in background (async, non-blocking)
    setImmediate(async () => {
      try {
        // Stock is already reduced when merchant accepts the order, not on delivery
        // if (status === 'delivered') {
        //   for (const itemId of updatedItems) {
        //     await handleStockReductionOnDelivery(orderId, itemId);
        //   }
        // }

        // Background logging
        let eventType;
        switch(status) {
          case 'processing':
            eventType = 'order_accepted';
            break;
          case 'shipped':
            eventType = 'order_shipped';
            break;
          case 'delivered':
            eventType = 'order_delivered';
            break;
          case 'cancelled':
            eventType = 'order_cancelled';
            break;
          default:
            eventType = 'order_status_updated';
        }

        await OrderLogService.logOrderEvent(
          eventType,
          order,
          {
            userId: req.user._id,
            userType: req.user.role,
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone
          },
          req,
          {
            previousStatus: 'various',
            metadata: {
              itemIds: updatedItems,
              note: note,
              bulkUpdate: true,
              statusChangedBy: req.user.role
            }
          }
        );
      } catch (backgroundError) {
        console.error('Background operation failed:', backgroundError);
      }
    });
  } catch (error) {
    console.error('Bulk update item status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * CANCEL ORDER (Customer)
 * ---------------------------
 */
router.put('/:id/cancel', [verifyToken, requireCustomer], async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only allow cancellation if order is not delivered or already cancelled
    if (order.orderStatus === 'delivered') {
      return res.status(400).json({ message: 'Cannot cancel a delivered order' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Cancel all items immediately
    for (const item of order.items) {
      item.itemStatus = 'cancelled'; // Fixed: was item.status, should be item.itemStatus
    }

    await order.save();
    res.json({ message: 'Order cancelled successfully', order: cleanOrderResponse(order) });

    // Handle stock restoration and logging in background
    setImmediate(async () => {
      try {
        // Background stock restoration
        for (const item of order.items) {
          // Restore stock to assigned merchant (if any)
          if (item.assignedMerchantId) {
            const merchantProduct = await MerchantProduct.findOne({
              merchantId: item.assignedMerchantId,
              productId: item.productId
            });

            if (merchantProduct) {
              merchantProduct.stock += item.quantity;
              await merchantProduct.save();
              console.log(`✅ Stock restored: ${item.quantity} units of ${item.productName} to merchant ${item.assignedMerchantId}`);
            }
          }
        }

        // Background logging
        await OrderLogService.logOrderEvent(
          'order_cancelled',
          order,
          {
            userId: req.user._id,
            userType: 'customer',
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone
          },
          req,
          {
            previousStatus: 'pending',
            metadata: {
              cancelledBy: 'customer',
              stockRestored: true
            }
          }
        );
      } catch (backgroundError) {
        console.error('Background operation failed during cancellation:', backgroundError);
      }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * ADMIN CANCEL ORDER
 * ---------------------------
 */
router.put('/admin/:id/cancel', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only allow cancellation if order is not delivered or already cancelled
    if (order.orderStatus === 'delivered') {
      return res.status(400).json({ message: 'Cannot cancel a delivered order' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Cancel all items immediately
    for (const item of order.items) {
      item.itemStatus = 'cancelled';
    }

    await order.save();
    res.json({ message: 'Order cancelled successfully by admin', order: cleanOrderResponse(order) });

    // Handle stock restoration and logging in background
    setImmediate(async () => {
      try {
        // Background stock restoration
        for (const item of order.items) {
          // Restore stock to assigned merchant (if any)
          if (item.assignedMerchantId) {
            const merchantProduct = await MerchantProduct.findOne({
              merchantId: item.assignedMerchantId,
              productId: item.productId
            });

            if (merchantProduct) {
              merchantProduct.stock += item.quantity;
              await merchantProduct.save();
              console.log(`✅ Stock restored: ${item.quantity} units of ${item.productName} to merchant ${item.assignedMerchantId}`);
            }
          }
        }

        // Background logging
        await OrderLogService.logOrderEvent(
          'order_cancelled',
          order,
          {
            userId: req.user._id,
            userType: 'admin',
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone
          },
          req,
          {
            previousStatus: order.orderStatus,
            metadata: {
              cancelledBy: 'admin',
              stockRestored: true,
              adminId: req.user._id
            }
          }
        );
      } catch (backgroundError) {
        console.error('Background operation failed during admin cancellation:', backgroundError);
      }
    });
  } catch (error) {
    console.error('Admin cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * ADMIN DASHBOARD & ANALYTICS
 * ---------------------------
 */

// Enhanced Admin Dashboard with Today's Analytics
router.get('/admin/dashboard', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const User = require('../models/User');
    const Merchant = require('../models/Merchant');
    const Product = require('../models/Product');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this week's date range
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    thisWeek.setHours(0, 0, 0, 0);

    // Basic counts
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalMerchants = await User.countDocuments({ role: 'merchant' });
    const activeMerchants = await Merchant.countDocuments({ activeStatus: 'approved' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Today's metrics
    const todaysOrders = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todaysRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.itemStatus": "delivered",
        "createdAt": { $gte: today, $lt: tomorrow }
      }},
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    const todaysNewUsers = await User.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todaysNewMerchants = await Merchant.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // This week's metrics
    const weeklyOrders = await Order.countDocuments({
      createdAt: { $gte: thisWeek }
    });

    const weeklyRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.itemStatus": "delivered",
        "createdAt": { $gte: thisWeek }
      }},
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    // Platform revenue (all time)
    const platformRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    // Real-time order statuses
    const pendingOrdersCount = await Order.countDocuments({ orderStatus: 'pending' });
    const processingOrdersCount = await Order.countDocuments({ orderStatus: 'processing' });
    const deliveredOrdersCount = await Order.countDocuments({ orderStatus: 'delivered' });

    // Pending items awaiting merchant assignment
    const unassignedItemsCount = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.assignedMerchantId": { $exists: false },
        "items.itemStatus": "pending"
      } },
      { $count: "count" }
    ]);

    // Pending merchant approvals
    const pendingMerchants = await Merchant.countDocuments({ activeStatus: 'pending' });

    // Pending user approvals (if any approval system exists)
    const pendingUsers = await User.countDocuments({ status: 'pending' });

    // Low stock products (stock < 10)
    const lowStockProducts = await Product.countDocuments({ 
      $expr: { $lt: ["$totalStock", 10] }
    });

    // Active merchants (recently active)
    const recentlyActiveMerchants = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.assignedMerchantId": { $ne: null },
        "createdAt": { $gte: thisWeek }
      }},
      { $group: { _id: "$items.assignedMerchantId" } },
      { $count: "count" }
    ]);

    // Most selling products
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    // Top merchants by revenue
    const topMerchants = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered", "items.assignedMerchantId": { $ne: null } } },
      {
        $group: {
          _id: "$items.assignedMerchantId",
          totalRevenue: { $sum: "$items.totalPrice" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'merchants',
          localField: '_id',
          foreignField: '_id',
          as: 'merchantInfo'
        }
      },
      { $unwind: '$merchantInfo' }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { 
        "items.itemStatus": "delivered",
        "createdAt": { $gte: sixMonthsAgo }
      }},
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$items.totalPrice" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json({
      summary: {
        // All-time metrics
        totalUsers,
        totalCustomers,
        totalMerchants,
        activeMerchants,
        totalProducts,
        totalOrders,
        platformRevenue: platformRevenue[0]?.total || 0,
        
        // Today's metrics
        todaysOrders,
        todaysRevenue: todaysRevenue[0]?.total || 0,
        todaysNewUsers,
        todaysNewMerchants,
        
        // Weekly metrics
        weeklyOrders,
        weeklyRevenue: weeklyRevenue[0]?.total || 0,
        
        // Real-time status counts
        pendingOrders: pendingOrdersCount,
        processingOrders: processingOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        unassignedItems: unassignedItemsCount[0]?.count || 0,
        activeThisWeek: recentlyActiveMerchants[0]?.count || 0,
        
        // New metrics
        pendingMerchants,
        pendingUsers,
        lowStockItems: lowStockProducts
      },
      topProducts,
      topMerchants,
      recentOrders,
      monthlyRevenue,
      
      // Additional insights
      insights: {
        averageOrderValue: totalOrders > 0 ? Math.round((platformRevenue[0]?.total || 0) / totalOrders) : 0,
        merchantUtilization: totalMerchants > 0 ? Math.round((activeMerchants / totalMerchants) * 100) : 0,
        todayGrowth: {
          orders: todaysOrders,
          revenue: todaysRevenue[0]?.total || 0,
          users: todaysNewUsers
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * ADMIN ANALYTICS
 * ---------------------------
 */
router.get('/analytics/summary', [verifyToken, requireAdmin], async (req, res) => {
  try {
    // Count actual items, not orders
    const totalOrdersCount = await Order.countDocuments();
    
    const pendingItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "pending" } },
      { $count: "count" }
    ]);
    const pendingItems = pendingItemsAgg[0]?.count || 0;

    const processingItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "processing" } },
      { $count: "count" }
    ]);
    const processingItems = processingItemsAgg[0]?.count || 0;

    const deliveredItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      { $count: "count" }
    ]);
    const deliveredItems = deliveredItemsAgg[0]?.count || 0;

    const totalRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);

    res.json({
      summary: {
        totalOrders: totalOrdersCount,
        pendingOrders: pendingItems,
        processingOrders: processingItems,
        deliveredOrders: deliveredItems,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * MERCHANT DASHBOARD
 * ---------------------------
 */
router.get('/merchant/dashboard', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) return res.status(400).json({ message: 'Merchant not found' });

    // Today's dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count actual items, not orders
    const totalItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id } },
      { $count: "count" }
    ]);
    const totalItems = totalItemsAgg[0]?.count || 0;

    // Today's metrics
    const todaysOrdersAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "createdAt": { $gte: today, $lt: tomorrow }
        } 
      },
      { $count: "count" }
    ]);
    const todaysOrders = todaysOrdersAgg[0]?.count || 0;

    const todaysRevenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered",
          "createdAt": { $gte: today, $lt: tomorrow }
        } 
      },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);
    const todaysRevenue = todaysRevenueAgg[0]?.total || 0;

    const completedTodayAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered",
          "updatedAt": { $gte: today, $lt: tomorrow }
        } 
      },
      { $count: "count" }
    ]);
    const completedToday = completedTodayAgg[0]?.count || 0;

    // Status counts
    const pendingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "assigned" } },
      { $count: "count" }
    ]);
    const pending = pendingAgg[0]?.count || 0;

    const processingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "processing" } },
      { $count: "count" }
    ]);
    const processing = processingAgg[0]?.count || 0;

    const completedAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "delivered" } },
      { $count: "count" }
    ]);
    const completed = completedAgg[0]?.count || 0;

    // Total revenue
    const totalRevenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered"
        } 
      },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Unassigned orders available
    const unassignedOrdersAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": null, "items.itemStatus": "pending" } },
      { $count: "count" }
    ]);
    const unassignedOrders = unassignedOrdersAgg[0]?.count || 0;

    // Success rate
    const totalOrders = totalItems;
    const successRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0;

    // Low stock items (from products this merchant has)
    const MerchantProduct = require('../models/MerchantProduct');
    const lowStockItems = await MerchantProduct.countDocuments({
      merchantId: merchant._id,
      stock: { $lt: 10 },
      enabled: true
    });

    const recentOrders = await Order.find({ 'items.assignedMerchantId': merchant._id })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Format recent orders for frontend
    const formattedRecentOrders = recentOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      totalAmount: order.totalAmount,
      status: order.orderStatus,
      createdAt: order.createdAt
    }));

    res.json({
      summary: { 
        totalItems,
        totalOrders: totalItems,
        totalRevenue,
        todaysOrders,
        todaysRevenue,
        completedToday,
        pendingOrders: pending, 
        processingOrders: processing, 
        completedOrders: completed,
        unassignedOrders,
        lowStockItems,
        successRate
      },
      recentOrders: formattedRecentOrders
    });
  } catch (error) {
    console.error('Merchant dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ---------------------------
 * MERCHANT ANALYTICS
 * ---------------------------
 */
router.get('/merchant/analytics/summary', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) return res.status(400).json({ message: 'Merchant not found' });

    // Count actual items, not orders
    const totalItemsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id } },
      { $count: "count" }
    ]);
    const totalItems = totalItemsAgg[0]?.count || 0;

    const pendingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "pending" } },
      { $count: "count" }
    ]);
    const pending = pendingAgg[0]?.count || 0;

    const processingAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "processing" } },
      { $count: "count" }
    ]);
    const processing = processingAgg[0]?.count || 0;

    const deliveredAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "delivered" } },
      { $count: "count" }
    ]);
    const delivered = deliveredAgg[0]?.count || 0;

    const cancelledAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "cancelled" } },
      { $count: "count" }
    ]);
    const cancelled = cancelledAgg[0]?.count || 0;

    const totalRevenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.assignedMerchantId": merchant._id, "items.itemStatus": "delivered" } },
      { $group: { _id: null, total: { $sum: "$items.totalPrice" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      { $unwind: "$items" },
      { 
        $match: { 
          "items.assignedMerchantId": merchant._id,
          "items.itemStatus": "delivered",
          "createdAt": { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$items.totalPrice" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Recent orders with full details
    const recentOrders = await Order.find({ 'items.assignedMerchantId': merchant._id })
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Format recent orders for frontend
    const formattedRecentOrders = recentOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      totalAmount: order.totalAmount,
      status: order.orderStatus,
      createdAt: order.createdAt
    }));

    // Calculate insights
    const averageOrderValue = totalItems > 0 ? Math.round(totalRevenue / totalItems) : 0;
    const successRate = totalItems > 0 ? Math.round((delivered / totalItems) * 100) : 0;
    
    // Best month calculation
    let bestMonth = 'N/A';
    let bestMonthRevenue = 0;
    if (monthlyRevenue.length > 0) {
      const bestMonthData = monthlyRevenue.reduce((max, current) => 
        current.revenue > max.revenue ? current : max
      );
      bestMonth = `${bestMonthData._id.year}-${String(bestMonthData._id.month).padStart(2, '0')}`;
      bestMonthRevenue = bestMonthData.revenue;
    }

    // Growth rate calculation (current vs previous month)
    let growthRate = 0;
    if (monthlyRevenue.length >= 2) {
      const currentMonth = monthlyRevenue[monthlyRevenue.length - 1];
      const previousMonth = monthlyRevenue[monthlyRevenue.length - 2];
      if (previousMonth.revenue > 0) {
        growthRate = Math.round(((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100);
      }
    }

    res.json({
      summary: { 
        totalOrders: totalItems, 
        pendingOrders: pending, 
        processingOrders: processing, 
        deliveredOrders: delivered, 
        cancelledOrders: cancelled, 
        totalRevenue 
      },
      monthlyRevenue,
      recentOrders: formattedRecentOrders,
      insights: {
        averageOrderValue,
        successRate,
        bestMonth,
        bestMonthRevenue,
        growthRate
      }
    });
  } catch (error) {
    console.error('Merchant analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put("/:orderId/assign-merchant", async (req, res) => {
  const { merchantId, itemId } = req.body;
  try {
    const order = await assignMerchantToItem(
      req.params.orderId,
      itemId,
      merchantId, 
      { validateMerchant: !!merchantId }
    );

    res.json({ success: true, order: cleanOrderResponse(order) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


async function assignMerchantToItem(orderId, itemId, merchantId, options = { validateMerchant: true }) {
  // First, get the order to validate item and merchant
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  // Find item to get productId
  const item = order.items.id(itemId);
  if (!item) throw new Error('Order item not found');

  let merchant;

  if (merchantId) {
    // If manual assignment, validate merchant has this product
    if (options.validateMerchant) {
      console.log(`🔍 Validating: Does merchant ${merchantId} sell product ${item.productId}?`);

      const productExists = await MerchantProduct.exists({
        productId: item.productId,
        merchantId,
        enabled: true,
      });

      console.log(`   Result: ${productExists ? '✅ YES' : '❌ NO'}`);

      if (!productExists) {
        throw new Error('Selected merchant does not sell this product or is inactive');
      }
    } else {
      console.log(`⚠️ Validation SKIPPED for merchant ${merchantId}`);
    }

    merchant = await Merchant.findById(merchantId);
    if (!merchant) throw new Error('Merchant not found');
  } else {
    // Auto-assign: pick first available merchant for this product
    const merchantProducts = await MerchantProduct.find({
      productId: item.productId,
      enabled: true,
    }).populate({
      path: 'merchantId',
      match: { activeStatus: 'approved' }
    });

    const availableMerchants = merchantProducts
      .map(mp => mp.merchantId)
      .filter(m => m); // filter out nulls (inactive merchants)

    if (!availableMerchants.length) throw new Error('No merchants available for this product');

    merchant = availableMerchants[0];
    merchantId = merchant._id;
  }

  // Check and deduct stock BEFORE assigning (with atomic operation)
  const merchantProduct = await MerchantProduct.findOne({
    productId: item.productId,
    merchantId: merchant._id,
    enabled: true
  });

  if (!merchantProduct) {
    throw new Error('Merchant product not found');
  }

  if (merchantProduct.stock < item.quantity) {
    throw new Error(`Insufficient stock. Available: ${merchantProduct.stock}, Required: ${item.quantity}`);
  }

  // Atomic update: Only assign if item is still unassigned
  // Using arrayFilters to ensure we update the EXACT item by ID that is also unassigned
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      items: {
        $elemMatch: {
          _id: itemId,
          assignedMerchantId: null  // ← Only update if still unassigned
        }
      }
    },
    {
      $set: {
        'items.$[elem].assignedMerchantId': merchant._id,
        'items.$[elem].assignedMerchantName': merchant.name || '',
        'items.$[elem].itemStatus': 'assigned'
      }
    },
    {
      arrayFilters: [{ 'elem._id': itemId }],
      new: true
    }
  );

  if (!updatedOrder) {
    throw new Error('Item already assigned to another merchant or order not found');
  }

  // Now deduct stock (only if assignment was successful)
  try {
    merchantProduct.stock -= item.quantity;
    await merchantProduct.save();

    console.log(`Stock deducted: ${item.quantity} units of ${item.productName} from merchant ${merchant.name} (ID: ${merchant._id})`);
  } catch (stockError) {
    // Rollback the assignment if stock deduction fails
    await Order.findOneAndUpdate(
      {
        _id: orderId,
        'items._id': itemId
      },
      {
        $set: {
          'items.$.assignedMerchantId': null,
          'items.$.assignedMerchantName': '',
          'items.$.itemStatus': 'pending'
        }
      }
    );
    console.error('Stock deduction error, rolling back assignment:', stockError);
    throw new Error(`Failed to deduct stock: ${stockError.message}`);
  }

  // 🚨 CRITICAL: Calculate and STORE merchant payout when order is accepted
  // This locks in the financial agreement and prevents price changes from affecting old orders
  const { calculateMerchantPayout } = require('../utils/merchantPayoutUtils');

  try {
    const payout = await calculateMerchantPayout(updatedOrder, merchant._id);

    if (payout) {
      console.log(`💰 Storing payout for merchant ${merchant.name}:`);
      console.log(`   🚨 amountOwePlatform: ${payout.amountOwePlatform} (type: ${typeof payout.amountOwePlatform})`);
      console.log(`   platformCommission: ${payout.platformCommission}`);
      console.log(`   platformFeeShare: ${payout.platformFeeShare}`);

      // Check if payout already exists for this merchant (shouldn't happen, but just in case)
      const existingPayoutIndex = updatedOrder.merchantPayouts.findIndex(
        p => p.merchantId.toString() === merchant._id.toString()
      );

      if (existingPayoutIndex !== -1) {
        // Update existing payout - SINGLE SOURCE OF TRUTH
        updatedOrder.merchantPayouts[existingPayoutIndex] = {
          // Merchant identification
          merchantId: merchant._id,
          merchantName: merchant.name || merchant.businessName,

          // Item values
          itemsCount: payout.itemsCount,
          itemsBaseValue: payout.itemsBaseValue,
          itemsCustomerValue: payout.itemsCustomerValue,

          // GST breakdown (NEW)
          merchantGSTShare: payout.merchantGSTShare || 0,
          platformGSTShare: payout.platformGSTShare || 0,

          // Revenue shares
          deliveryShare: payout.deliveryShare,
          platformDeliveryShare: payout.platformDeliveryShare || 0,
          platformFeeShare: payout.platformFeeShare,
          platformCommission: payout.platformCommission,

          // GST metadata (NEW)
          gstMode: payout.gstMode || 'no-gst',
          isDummyGST: payout.isDummyGST || false,

          // Settlement amounts
          codCollectionAmount: payout.codCollectionAmount,
          amountOwePlatform: payout.amountOwePlatform,
          netPayout: payout.netPayout,

          // Metadata
          merchantSharePercent: payout.merchantSharePercent,
          calculatedAt: new Date(),
          settlementStatus: 'pending'
        };
      } else {
        // Add new payout - SINGLE SOURCE OF TRUTH
        updatedOrder.merchantPayouts.push({
          // Merchant identification
          merchantId: merchant._id,
          merchantName: merchant.name || merchant.businessName,

          // Item values
          itemsCount: payout.itemsCount,
          itemsBaseValue: payout.itemsBaseValue,
          itemsCustomerValue: payout.itemsCustomerValue,

          // GST breakdown (NEW)
          merchantGSTShare: payout.merchantGSTShare || 0,
          platformGSTShare: payout.platformGSTShare || 0,

          // Revenue shares
          deliveryShare: payout.deliveryShare,
          platformDeliveryShare: payout.platformDeliveryShare || 0,
          platformFeeShare: payout.platformFeeShare,
          platformCommission: payout.platformCommission,

          // GST metadata (NEW)
          gstMode: payout.gstMode || 'no-gst',
          isDummyGST: payout.isDummyGST || false,

          // Settlement amounts
          codCollectionAmount: payout.codCollectionAmount,
          amountOwePlatform: payout.amountOwePlatform,
          netPayout: payout.netPayout,

          // Metadata
          merchantSharePercent: payout.merchantSharePercent,
          calculatedAt: new Date(),
          settlementStatus: 'pending'
        });
      }

      await updatedOrder.save();
      console.log(`✅ Payout stored successfully for merchant ${merchant.name}`);
    }
  } catch (payoutError) {
    console.error('❌ Failed to calculate/store payout (non-critical):', payoutError);
    // Don't throw - payout calculation failure shouldn't block assignment
  }

  // Update overall order status if all items are assigned
  const finalOrder = await Order.findById(orderId);
  const allAssigned = finalOrder.items.every(i => i.itemStatus === 'assigned');
  if (allAssigned) {
    finalOrder.orderStatus = 'assigned';
    await finalOrder.save();
  }

  return finalOrder;
}


// Get unassigned orders (for merchants to claim)
router.get('/status/unassigned', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);
    if (!merchant) {
      return res.status(400).json({ message: 'Merchant not found' });
    }

    const merchantProducts = await MerchantProduct.find({
      merchantId: merchant._id,
      enabled: true,
      stock: { $gt: 0 }
    }).select('productId');

    const merchantProductIds = merchantProducts.map(mp => mp.productId.toString());

    if (merchantProductIds.length === 0) {
      return res.json([]); // No products in stock, nothing to assign
    }

    // Get delivery config settings for radius values
    const AppSettings = require('../models/AppSettings');
    const { calculateDistance } = require('../utils/locationUtils');
    const settings = await AppSettings.getSettings();
    const { maxDeliveryRadius = 10 } = settings.deliveryConfig || {};

    // Check if merchant has valid coordinates (not [0, 0])
    const hasValidCoords = merchant.location?.coordinates &&
      merchant.location.coordinates.length === 2 &&
      !(merchant.location.coordinates[0] === 0 && merchant.location.coordinates[1] === 0);

    console.log(`📍 Merchant ${merchant.businessName}: hasValidCoords=${hasValidCoords}, coords=${merchant.location?.coordinates}, radius=${maxDeliveryRadius}km`);

    let unassignedOrders = [];
    const orderDistances = new Map(); // Store distances for each order

    // Base filter for unassigned items that merchant can fulfill
    const baseItemFilter = {
      'items.itemStatus': 'pending',
      'items.assignedMerchantId': null,
      'items.productId': { $in: merchantProductIds }
    };

    if (hasValidCoords) {
      // ========== DISTANCE-BASED FILTERING ==========
      const [merchantLng, merchantLat] = merchant.location.coordinates;

      // Step 1: Find nearby orders using $geoNear aggregation
      const nearbyOrders = await Order.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [merchantLng, merchantLat] },
            distanceField: 'calculatedDistance',
            maxDistance: maxDeliveryRadius * 1000, // km to meters
            spherical: true,
            query: {
              $or: [
                { orderStatus: 'pending' },
                { orderStatus: 'processing' }
              ],
              ...baseItemFilter
            }
          }
        }
      ]);

      console.log(`📍 Found ${nearbyOrders.length} nearby orders within ${maxDeliveryRadius}km`);

      // Mark nearby orders with distance and isNearby flag
      const nearbyOrderIds = nearbyOrders.map(o => o._id.toString());
      nearbyOrders.forEach(order => {
        const distanceKm = Math.round((order.calculatedDistance / 1000) * 10) / 10; // Convert m to km, round to 1 decimal
        orderDistances.set(order._id.toString(), { distance: distanceKm, isNearby: true });
      });

      // Step 2: Find city-wide orders (beyond radius but same city)
      let cityOrders = [];
      if (merchant.city) {
        cityOrders = await Order.find({
          'deliveryLocation.city': { $regex: new RegExp(`^${merchant.city}$`, 'i') },
          $or: [
            { orderStatus: 'pending' },
            { orderStatus: 'processing' }
          ],
          ...baseItemFilter,
          _id: { $nin: nearbyOrderIds.map(id => require('mongoose').Types.ObjectId.createFromHexString(id)) }
        });

        console.log(`🏙️ Found ${cityOrders.length} additional city-wide orders in ${merchant.city}`);

        // Calculate distance for city orders using Haversine
        cityOrders.forEach(order => {
          const orderCoords = order.deliveryLocation?.coordinates;
          let distanceKm = null;

          if (orderCoords && orderCoords.length === 2 && !(orderCoords[0] === 0 && orderCoords[1] === 0)) {
            const [orderLng, orderLat] = orderCoords;
            distanceKm = calculateDistance(merchantLat, merchantLng, orderLat, orderLng);
            distanceKm = Math.round(distanceKm * 10) / 10; // Round to 1 decimal
          }

          orderDistances.set(order._id.toString(), { distance: distanceKm, isNearby: false });
        });
      }

      // Step 3: Combine nearby and city orders, then populate
      const allOrderIds = [...nearbyOrderIds, ...cityOrders.map(o => o._id.toString())];

      if (allOrderIds.length > 0) {
        unassignedOrders = await Order.find({
          _id: { $in: allOrderIds.map(id => require('mongoose').Types.ObjectId.createFromHexString(id)) }
        })
          .populate('customerId', 'name phone')
          .populate('deliveryAddressId', 'fullName phoneNumber addressLine1 addressLine2 landmark area city state pincode addressType title');
      }

    } else {
      // ========== FALLBACK: CITY-ONLY MATCHING ==========
      console.log(`⚠️ Merchant ${merchant.businessName} has no valid coordinates, falling back to city matching`);

      let cityAddressIds = null;
      if (merchant.city) {
        const cityAddresses = await Address.find({
          city: { $regex: new RegExp(`^${merchant.city}$`, 'i') }
        }).distinct('_id');
        cityAddressIds = cityAddresses;
        console.log(`🏙️ Found ${cityAddressIds.length} addresses in ${merchant.city}`);
      }

      const orderFilter = {
        $or: [
          { orderStatus: 'pending' },
          { orderStatus: 'processing' }
        ],
        ...baseItemFilter
      };

      if (cityAddressIds && cityAddressIds.length > 0) {
        orderFilter.deliveryAddressId = { $in: cityAddressIds };
      }

      unassignedOrders = await Order.find(orderFilter)
        .populate('customerId', 'name phone')
        .populate('deliveryAddressId', 'fullName phoneNumber addressLine1 addressLine2 landmark area city state pincode addressType title');

      // For city-only fallback, all orders are considered "nearby" (no distance calculation)
      unassignedOrders.forEach(order => {
        orderDistances.set(order._id.toString(), { distance: null, isNearby: true });
      });
    }

    // ========== FILTER AND FORMAT RESPONSE ==========
    const { calculateMerchantPayout } = require('../utils/merchantPayoutUtils');

    const filteredOrders = await Promise.all(
      unassignedOrders.map(async (order) => {
        const orderObj = order.toObject();

        // Debug: Log each item's details
        console.log(`\n=== Order ${order._id} - Merchant: ${merchant.businessName} ===`);
        orderObj.items.forEach((item, index) => {
          const merchantSells = merchantProductIds.includes(item.productId.toString());
          console.log(`  Item ${index + 1}: ${item.productName}`);
          console.log(`    - ProductId: ${item.productId}`);
          console.log(`    - Status: ${item.itemStatus}`);
          console.log(`    - AssignedTo: ${item.assignedMerchantId || 'none'}`);
          console.log(`    - MerchantSells: ${merchantSells}`);
          console.log(`    - WillShow: ${merchantSells && item.itemStatus === 'pending' && item.assignedMerchantId === null}`);
        });

        const filteredItems = orderObj.items.filter(item =>
          merchantProductIds.includes(item.productId.toString()) &&
          item.itemStatus === 'pending' &&
          item.assignedMerchantId === null
        );

        console.log(`  >> Filtered: ${filteredItems.length} items will be shown`);

        // Calculate ESTIMATED merchant payout for these items
        const estimatedPayout = await calculateMerchantPayout(order, merchant._id);

        // Get distance info for this order
        const distanceInfo = orderDistances.get(order._id.toString()) || { distance: null, isNearby: true };

        return {
          ...orderObj,
          items: filteredItems,
          merchantPayout: estimatedPayout,
          distance: distanceInfo.distance,
          isNearby: distanceInfo.isNearby
        };
      })
    );

    // Filter to only valid orders and sort (nearby first, then by distance)
    const validOrders = filteredOrders
      .filter(order => order.items.length > 0)
      .sort((a, b) => {
        // Nearby orders come first
        if (a.isNearby && !b.isNearby) return -1;
        if (!a.isNearby && b.isNearby) return 1;
        // Within same category, sort by distance (if available)
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        // If one has distance and one doesn't, distance comes first
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });

    const nearbyCount = validOrders.filter(o => o.isNearby).length;
    const farCount = validOrders.length - nearbyCount;
    console.log(`\n>> Returning ${validOrders.length} orders to merchant ${merchant.businessName} (${nearbyCount} nearby, ${farCount} city-wide)\n`);

    res.json(cleanOrderResponse(validOrders));
  } catch (error) {
    console.error('Unassigned order fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});







// Get order by ID (must be placed AFTER the /unassigned route)
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(cleanOrderResponse(order));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /orders/:orderId/items/:itemId/reject
router.post("/:orderId/items/:itemId/reject", async (req, res) => {
  const { orderId, itemId } = req.params;
  const merchantId = req.user._id;

  await Order.updateOne(
    { _id: orderId, "items._id": itemId },
    { $addToSet: { "items.$.rejectedBy": merchantId } } 
  );

  res.json({ success: true });
});



// Merchant claims an item
router.post('/claim', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'merchant') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { orderId, itemId } = req.body;
    const merchant = await Merchant.findById(req.user._id);

    if (!merchant) {
      return res.status(400).json({ message: 'Merchant not found' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, "items._id": itemId, "items.assignedMerchantId": null },
      { $set: { "items.$.assignedMerchantId": merchant._id, "items.$.itemStatus": "assigned" } },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ message: 'Item already taken by another merchant' });
    }

    // Send immediate response with cleaned order
    res.json({ message: 'Order claimed successfully', order: cleanOrderResponse(order) });

    // Handle stock deduction and logging in background (async, non-blocking)
    setImmediate(async () => {
      try {
        // Background stock deduction
        const MerchantProduct = require('../models/MerchantProduct');
        const item = order.items.id(itemId);

        if (item) {
          const merchantProduct = await MerchantProduct.findOne({
            productId: item.productId,
            merchantId: merchant._id,
            enabled: true
          });

          if (merchantProduct && merchantProduct.stock >= item.quantity) {
            merchantProduct.stock -= item.quantity;
            await merchantProduct.save();
            console.log(`Stock deducted on claim: ${item.quantity} units of ${item.productName} from merchant ${merchant.name}`);
          }
        }

        // Background logging
        await OrderLogService.logOrderEvent(
          'order_claimed',
          order,
          {
            userId: req.user._id,
            userType: 'merchant',
            merchantName: merchant.name,
            merchantEmail: merchant.email,
            merchantPhone: merchant.phone
          },
          req,
          {
            previousStatus: 'pending',
            metadata: {
              merchantId: merchant._id,
              itemId: itemId,
              claimMethod: 'self_service'
            }
          }
        );
      } catch (backgroundError) {
        console.error('Background operation failed during order claim:', backgroundError);
      }
    });
  } catch (error) {
    console.error('Claim order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



/**
 * ---------------------------
 * STOCK MANAGEMENT FUNCTIONS
 * ---------------------------
 */

/**
 * Reserve stock for an order by reducing merchant stock
 * NOTE: This function is no longer used as stock is now reduced when merchant accepts the order
 */
// async function reserveStockForOrder(order) {
//   for (const item of order.items) {
//     let remainingQuantity = item.quantity;
//
//     // Find merchants with stock for this product
//     const merchantProducts = await MerchantProduct.find({
//       productId: item.productId,
//       enabled: true,
//       stock: { $gt: 0 }
//     }).sort({ stock: -1 }); // Start with merchants with most stock
//
//     for (const merchantProduct of merchantProducts) {
//       if (remainingQuantity <= 0) break;
//
//       const reserveAmount = Math.min(remainingQuantity, merchantProduct.stock);
//
//       // Reduce merchant stock
//       merchantProduct.stock -= reserveAmount;
//       await merchantProduct.save();
//
//       remainingQuantity -= reserveAmount;
//
//       console.log(`Reserved ${reserveAmount} units of ${item.productName} from merchant ${merchantProduct.merchantId}`);
//     }
//
//     if (remainingQuantity > 0) {
//       console.warn(`Could not fully reserve stock for ${item.productName}. Missing: ${remainingQuantity} units`);
//     }
//   }
// }

/**
 * Reduce stock when order is delivered (if auto-reduce is enabled)
 * NOTE: This function is no longer used as stock is now reduced when merchant accepts the order
 */
// async function handleStockReductionOnDelivery(orderId, itemId) {
//   try {
//     const AppSettings = require('../models/AppSettings');
//     const settings = await AppSettings.getSettings();
//
//     if (!settings.autoReduceStockOnDelivery) {
//       return; // Auto stock reduction is disabled
//     }
//
//     const order = await Order.findById(orderId);
//     if (!order) return;
//
//     const item = order.items.id(itemId);
//     if (!item || item.itemStatus !== 'delivered') return;
//
//     // Find the merchant product and reduce stock
//     if (item.assignedMerchantId) {
//       const merchantProduct = await MerchantProduct.findOne({
//         merchantId: item.assignedMerchantId,
//         productId: item.productId
//       });
//
//       if (merchantProduct && merchantProduct.stock >= item.quantity) {
//         merchantProduct.stock -= item.quantity;
//         await merchantProduct.save();
//
//         console.log(`Auto-reduced ${item.quantity} units of ${item.productName} from merchant ${item.assignedMerchantId} stock`);
//       }
//     }
//   } catch (error) {
//     console.error('Stock reduction error:', error);
//   }
// }

/**
 * ---------------------------
 * GET ORDER LIFECYCLE (Admin)
 * ---------------------------
 */
// router.get('/:orderId/lifecycle', requireMerchantOrAdmin, async (req, res) => {
  router.get('/:orderId/lifecycle',  async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .select('orderNumber lifecycle customerId customerName orderStatus totalAmount')
      .populate('customerId', 'name email phone');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        orderStatus: order.orderStatus,
        totalAmount: order.totalAmount,
        lifecycle: order.lifecycle || []
      }
    });
  } catch (error) {
    console.error('Error fetching order lifecycle:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
