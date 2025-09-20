/**
 * Order Object Cleanup Utility v1.0
 *
 * Cleans order objects according to specifications:
 * - Removes unnecessary fields and metadata
 * - Standardizes date formats to ISO 8601
 * - Simplifies nested objects
 * - Removes empty arrays and ObjectId wrappers
 */

/**
 * Clean a single order object
 * @param {Object} order - Raw order object from database
 * @returns {Object} - Cleaned order object
 */
function cleanOrderObject(order) {
  if (!order) return null;

  // Convert to plain object if it's a Mongoose document
  const orderObj = order.toObject ? order.toObject() : order;

  // Helper function to format dates to ISO 8601
  const formatDate = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date.$date) return new Date(date.$date).toISOString();
    return new Date(date).toISOString();
  };

  // Helper function to clean ObjectId wrappers
  const cleanObjectId = (id) => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) return id._id.toString();
    return id.toString();
  };

  // Clean statusHistory - remove _id fields
  const cleanStatusHistory = (history) => {
    if (!Array.isArray(history)) return [];
    return history.map(entry => ({
      status: entry.status,
      timestamp: formatDate(entry.timestamp),
      note: entry.note || undefined
    })).filter(entry => entry.status); // Remove entries without status
  };

  // Clean lifecycle - keep only specified fields
  const cleanLifecycle = (lifecycle) => {
    if (!Array.isArray(lifecycle)) return [];
    return lifecycle.map(event => {
      const cleanEvent = {
        eventType: event.eventType,
        timestamp: formatDate(event.timestamp),
        eventDescription: event.eventDescription
      };

      // Add triggeredBy fields if they exist
      if (event.triggeredBy) {
        if (event.triggeredBy.userId) cleanEvent.triggeredBy = {
          userId: cleanObjectId(event.triggeredBy.userId),
          userType: event.triggeredBy.userType,
          userName: event.triggeredBy.userName
        };
      }

      // Add notification field if it exists
      if (event.notification !== undefined) {
        cleanEvent.notification = event.notification;
      }

      return cleanEvent;
    }).filter(event => event.eventType); // Remove events without eventType
  };

  // Clean items - keep essential fields plus some for UI functionality
  const cleanItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map(item => {
      const cleanedItem = {
        _id: cleanObjectId(item._id), // Keep _id for UI operations
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        itemStatus: item.itemStatus, // Keep for UI status display
      };

      // Handle productId (could be populated)
      if (item.productId) {
        if (typeof item.productId === 'object' && item.productId !== null) {
          cleanedItem.productId = {
            _id: cleanObjectId(item.productId._id || item.productId),
            name: item.productId.name,
            images: item.productId.images
          };
        } else {
          cleanedItem.productId = cleanObjectId(item.productId);
        }
      }

      // Handle assignedMerchantId (could be populated)
      if (item.assignedMerchantId) {
        if (typeof item.assignedMerchantId === 'object' && item.assignedMerchantId !== null) {
          cleanedItem.assignedMerchantId = {
            _id: cleanObjectId(item.assignedMerchantId._id || item.assignedMerchantId),
            name: item.assignedMerchantId.name,
            businessName: item.assignedMerchantId.businessName,
            contact: item.assignedMerchantId.contact,
            area: item.assignedMerchantId.area
          };
        } else {
          cleanedItem.assignedMerchantId = cleanObjectId(item.assignedMerchantId);
        }
      } else {
        cleanedItem.assignedMerchantId = null;
      }

      return cleanedItem;
    }).filter(item => item.productName); // Remove items without productName
  };

  // Build the cleaned order object
  const cleanedOrder = {
    _id: cleanObjectId(orderObj._id), // Keep _id for UI operations
    orderNumber: orderObj.orderNumber,
    customerName: orderObj.customerName,
    customerPhone: orderObj.customerPhone,
    customerAddress: orderObj.customerAddress,
    items: cleanItems(orderObj.items),
    subtotal: orderObj.subtotal,
    tax: orderObj.tax,
    deliveryCharge: orderObj.deliveryCharge,
    totalAmount: orderObj.totalAmount,
    orderStatus: orderObj.orderStatus,
    paymentStatus: orderObj.paymentStatus,
    paymentMethod: orderObj.paymentMethod,
    expectedDeliveryDate: formatDate(orderObj.expectedDeliveryDate),
    actualDeliveryDate: formatDate(orderObj.actualDeliveryDate),
    statusHistory: cleanStatusHistory(orderObj.statusHistory),
    lifecycle: cleanLifecycle(orderObj.lifecycle),
    createdAt: formatDate(orderObj.createdAt), // Keep for UI sorting/display
    updatedAt: formatDate(orderObj.updatedAt) // Keep for UI sorting/display
  };

  // Handle deliveryAddressId - should always be populated when fetching orders
  if (orderObj.deliveryAddressId) {
    if (typeof orderObj.deliveryAddressId === 'object' && orderObj.deliveryAddressId !== null) {
      // If populated, preserve the address data for UI
      cleanedOrder.deliveryAddressId = {
        _id: cleanObjectId(orderObj.deliveryAddressId._id || orderObj.deliveryAddressId),
        fullName: orderObj.deliveryAddressId.fullName,
        phoneNumber: orderObj.deliveryAddressId.phoneNumber,
        addressLine1: orderObj.deliveryAddressId.addressLine1,
        addressLine2: orderObj.deliveryAddressId.addressLine2,
        landmark: orderObj.deliveryAddressId.landmark,
        area: orderObj.deliveryAddressId.area,
        city: orderObj.deliveryAddressId.city,
        state: orderObj.deliveryAddressId.state,
        pincode: orderObj.deliveryAddressId.pincode,
        addressType: orderObj.deliveryAddressId.addressType,
        title: orderObj.deliveryAddressId.title
      };
    } else {
      // If just an ID, keep as string (shouldn't happen in normal fetching)
      cleanedOrder.deliveryAddressId = cleanObjectId(orderObj.deliveryAddressId);
    }
  }

  // No longer store deliveryLocation in orders - all address data comes from deliveryAddressId

  // Handle customerId (could be populated)
  if (orderObj.customerId) {
    if (typeof orderObj.customerId === 'object' && orderObj.customerId !== null) {
      cleanedOrder.customerId = {
        _id: cleanObjectId(orderObj.customerId._id || orderObj.customerId),
        name: orderObj.customerId.name,
        email: orderObj.customerId.email
      };
    } else {
      cleanedOrder.customerId = cleanObjectId(orderObj.customerId);
    }
  }

  // Always include customerArea for routing and logistics
  if (orderObj.customerArea) {
    cleanedOrder.customerArea = orderObj.customerArea;
  }

  // Remove undefined and null values
  Object.keys(cleanedOrder).forEach(key => {
    if (cleanedOrder[key] === undefined || cleanedOrder[key] === null) {
      delete cleanedOrder[key];
    }
  });

  return cleanedOrder;
}

/**
 * Clean an array of order objects
 * @param {Array} orders - Array of raw order objects
 * @returns {Array} - Array of cleaned order objects
 */
function cleanOrderArray(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map(order => cleanOrderObject(order)).filter(order => order !== null);
}

/**
 * Clean order response data (handles both single orders and paginated responses)
 * @param {Object} responseData - Response data from API
 * @param {Object} options - Cleanup options
 * @param {boolean} options.preserveInternal - Whether to preserve internal fields for system use
 * @returns {Object} - Cleaned response data
 */
function cleanOrderResponse(responseData, options = {}) {
  if (!responseData) return null;

  const { preserveInternal = false } = options;

  // For internal system use, preserve some fields that external APIs should not see
  if (preserveInternal) {
    return responseData; // Return unmodified for internal operations
  }

  // Handle single order response
  if (responseData.order) {
    return {
      ...responseData,
      order: cleanOrderObject(responseData.order)
    };
  }

  // Handle paginated orders response
  if (responseData.orders) {
    return {
      ...responseData,
      orders: cleanOrderArray(responseData.orders)
    };
  }

  // Handle direct array of orders
  if (Array.isArray(responseData)) {
    return cleanOrderArray(responseData);
  }

  // Handle single order object
  return cleanOrderObject(responseData);
}

/**
 * Get internal order data without cleanup (for system operations)
 * @param {Object} orderData - Raw order data
 * @returns {Object} - Unmodified order data
 */
function getInternalOrderData(orderData) {
  return orderData;
}

module.exports = {
  cleanOrderObject,
  cleanOrderArray,
  cleanOrderResponse,
  getInternalOrderData
};