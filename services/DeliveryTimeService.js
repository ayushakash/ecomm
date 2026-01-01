const { calculateDistance } = require('../utils/geoUtils');

class DeliveryTimeService {
  constructor() {
    // Base processing times (in minutes)
    this.baseProcessingTime = 15; // Time for merchant to prepare order
    this.baseDeliverySpeed = 25; // km/h average delivery speed in city

    // Time multipliers based on various factors
    this.timeFactors = {
      peakHours: 1.5,     // 50% longer during peak hours
      rainySeason: 1.3,   // 30% longer during rainy season
      nightTime: 1.2,     // 20% longer at night
      weekends: 1.1,      // 10% longer on weekends
      bulkyItems: 1.4,    // 40% longer for bulky items
      multipleItems: 1.2  // 20% longer for multiple items
    };
  }

  /**
   * Predict delivery time for an order
   */
  async predictDeliveryTime({
    merchantLocation,
    customerLocation,
    orderItems = [],
    orderTime = new Date(),
    merchantData = {},
    priority = 'normal'
  }) {
    try {
      console.log('🚚 Calculating delivery time prediction...');

      // Calculate distance
      const distance = calculateDistance(
        merchantLocation.coordinates,
        customerLocation.coordinates
      );

      if (!distance) {
        throw new Error('Unable to calculate distance for delivery prediction');
      }

      // Base calculation
      let processingTime = this.baseProcessingTime;
      let deliveryTime = (distance / this.baseDeliverySpeed) * 60; // Convert to minutes

      // Apply merchant-specific factors
      processingTime = this.applyMerchantFactors(processingTime, merchantData);

      // Apply time-based factors
      const timeFactor = this.calculateTimeFactor(orderTime);
      deliveryTime *= timeFactor;

      // Apply order-specific factors
      const orderFactor = this.calculateOrderFactor(orderItems);
      processingTime *= orderFactor;

      // Apply priority adjustments
      const priorityAdjustment = this.calculatePriorityAdjustment(priority);
      processingTime *= priorityAdjustment.processing;
      deliveryTime *= priorityAdjustment.delivery;

      // Total time calculation
      const totalMinutes = Math.round(processingTime + deliveryTime);
      const estimatedDeliveryTime = new Date(orderTime.getTime() + totalMinutes * 60 * 1000);

      // Calculate confidence score (0-100)
      const confidence = this.calculateConfidence({
        distance,
        merchantData,
        orderItems,
        timeFactor
      });

      // Generate time range (±20% buffer)
      const bufferMinutes = Math.round(totalMinutes * 0.2);
      const minTime = Math.max(totalMinutes - bufferMinutes, 15); // Minimum 15 minutes
      const maxTime = totalMinutes + bufferMinutes;

      console.log(`🚚 Delivery prediction: ${totalMinutes} minutes (${minTime}-${maxTime} range)`);

      return {
        success: true,
        estimatedMinutes: totalMinutes,
        estimatedDeliveryTime,
        timeRange: {
          min: minTime,
          max: maxTime,
          minDeliveryTime: new Date(orderTime.getTime() + minTime * 60 * 1000),
          maxDeliveryTime: new Date(orderTime.getTime() + maxTime * 60 * 1000)
        },
        breakdown: {
          processingTime: Math.round(processingTime),
          deliveryTime: Math.round(deliveryTime),
          distance,
          factors: {
            time: timeFactor,
            order: orderFactor,
            priority: priorityAdjustment
          }
        },
        confidence,
        priority
      };

    } catch (error) {
      console.error('Delivery time prediction error:', error);
      return {
        success: false,
        error: error.message,
        // Fallback estimate
        estimatedMinutes: 60,
        estimatedDeliveryTime: new Date(Date.now() + 60 * 60 * 1000)
      };
    }
  }

  /**
   * Apply merchant-specific factors
   */
  applyMerchantFactors(baseTime, merchantData) {
    let adjustedTime = baseTime;

    // Experience factor
    const totalOrders = merchantData.totalOrders || 0;
    if (totalOrders >= 100) adjustedTime *= 0.9; // 10% faster
    else if (totalOrders >= 50) adjustedTime *= 0.95; // 5% faster
    else if (totalOrders < 10) adjustedTime *= 1.2; // 20% slower

    // Rating factor
    const rating = merchantData.rating || 3;
    if (rating >= 4.5) adjustedTime *= 0.9;
    else if (rating >= 4.0) adjustedTime *= 0.95;
    else if (rating < 3.0) adjustedTime *= 1.1;

    // Current load factor
    const currentOrders = merchantData.availability?.currentDayOrders || 0;
    const maxOrders = merchantData.availability?.maxDailyOrders || 10;
    const loadPercentage = currentOrders / maxOrders;

    if (loadPercentage >= 0.8) adjustedTime *= 1.3; // 30% slower when busy
    else if (loadPercentage >= 0.6) adjustedTime *= 1.1; // 10% slower

    return adjustedTime;
  }

  /**
   * Calculate time-based factors
   */
  calculateTimeFactor(orderTime) {
    const hour = orderTime.getHours();
    const day = orderTime.getDay();
    const month = orderTime.getMonth();

    let factor = 1.0;

    // Peak hours (11-14, 18-21)
    if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
      factor *= this.timeFactors.peakHours;
    }

    // Night time (22-06)
    if (hour >= 22 || hour <= 6) {
      factor *= this.timeFactors.nightTime;
    }

    // Weekends
    if (day === 0 || day === 6) {
      factor *= this.timeFactors.weekends;
    }

    // Rainy season (June-September in India)
    if (month >= 5 && month <= 8) {
      factor *= this.timeFactors.rainySeason;
    }

    return factor;
  }

  /**
   * Calculate order-specific factors
   */
  calculateOrderFactor(orderItems) {
    let factor = 1.0;

    // Multiple items
    if (orderItems.length > 3) {
      factor *= this.timeFactors.multipleItems;
    }

    // Check for bulky items
    const hasBulkyItems = orderItems.some(item => {
      const weight = item.weight || 0;
      const isBulky = weight > 50 || // Over 50kg
                     item.unit === 'bag' && item.quantity > 10 || // More than 10 bags
                     item.productName?.toLowerCase().includes('cement') ||
                     item.productName?.toLowerCase().includes('steel');
      return isBulky;
    });

    if (hasBulkyItems) {
      factor *= this.timeFactors.bulkyItems;
    }

    return factor;
  }

  /**
   * Calculate priority adjustments
   */
  calculatePriorityAdjustment(priority) {
    switch (priority) {
      case 'urgent':
        return { processing: 0.7, delivery: 0.8 }; // 30% faster processing, 20% faster delivery
      case 'high':
        return { processing: 0.85, delivery: 0.9 };
      case 'low':
        return { processing: 1.2, delivery: 1.1 };
      default: // normal
        return { processing: 1.0, delivery: 1.0 };
    }
  }

  /**
   * Calculate prediction confidence
   */
  calculateConfidence({ distance, merchantData, orderItems, timeFactor }) {
    let confidence = 100;

    // Distance confidence
    if (distance > 15) confidence -= 20;
    else if (distance > 10) confidence -= 10;
    else if (distance > 5) confidence -= 5;

    // Merchant reliability
    const totalOrders = merchantData.totalOrders || 0;
    if (totalOrders < 10) confidence -= 15;
    else if (totalOrders < 50) confidence -= 5;

    // Complex orders
    if (orderItems.length > 5) confidence -= 10;
    if (timeFactor > 1.3) confidence -= 15;

    return Math.max(confidence, 40); // Minimum 40% confidence
  }

  /**
   * Update delivery prediction based on real-time factors
   */
  async updatePrediction(orderId, realTimeFactors = {}) {
    // This would update predictions based on:
    // - Traffic conditions
    // - Weather
    // - Merchant delays
    // - Driver location
    console.log(`📊 Updating prediction for order ${orderId} with real-time factors`);

    // Implementation would go here
    return {
      success: true,
      updatedTime: new Date(),
      factors: realTimeFactors
    };
  }
}

module.exports = new DeliveryTimeService();