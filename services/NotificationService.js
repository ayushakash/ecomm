const axios = require('axios');
const notificationConfig = require('../config/notifications');
const OrderLog = require('../models/OrderLog');
const { smartMerchantSelection } = require('../utils/geoUtils');

class NotificationService {
  constructor() {
    this.config = notificationConfig;
  }

  // Send notification to n8n webhook
  async sendToN8n(eventData) {
    if (!this.config.n8n.enabled || !this.config.n8n.webhookUrl) {
      return { success: false, error: 'n8n not configured' };
    }

    // Create a clean payload with only essential data for n8n
    const payload = {
      eventType: eventData.eventType,
      orderId: eventData.orderId,
      itemId: eventData.itemId,
      timestamp: eventData.timestamp || new Date(),
      
      // Order essentials (without lifecycle and internal fields)
      orderData: eventData.orderData ? {
        orderNumber: eventData.orderData.orderNumber,
        customerId: eventData.orderData.customerId,
        customerName: eventData.orderData.customerName,
        customerPhone: eventData.orderData.customerPhone,
        customerAddress: eventData.orderData.customerAddress,
        customerArea: eventData.orderData.customerArea,
        totalAmount: eventData.orderData.totalAmount,
        subtotal: eventData.orderData.subtotal,
        tax: eventData.orderData.tax,
        deliveryCharge: eventData.orderData.deliveryCharge,
        orderStatus: eventData.orderData.orderStatus,
        paymentStatus: eventData.orderData.paymentStatus,
        paymentMethod: eventData.orderData.paymentMethod,
        deliveryInstructions: eventData.orderData.deliveryInstructions,
        expectedDeliveryDate: eventData.orderData.expectedDeliveryDate,
        items: eventData.orderData.items?.map(item => ({
          _id: item._id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice,
          itemStatus: item.itemStatus
        }))
      } : null,

      // Who triggered this event
      triggeredBy: eventData.triggeredBy ? {
        userId: eventData.triggeredBy.userId,
        userType: eventData.triggeredBy.userType,
        userName: eventData.triggeredBy.userName,
        userEmail: eventData.triggeredBy.userEmail,
        userPhone: eventData.triggeredBy.userPhone
      } : null,

      // Customer location (for smart merchant selection)
      customerLocation: eventData.customerLocation,

      // Merchant data (for smart notifications)
      merchantData: eventData.merchantData ? {
        _id: eventData.merchantData._id,
        name: eventData.merchantData.name,
        phone: eventData.merchantData.contact?.phone,
        email: eventData.merchantData.contact?.email,
        address: eventData.merchantData.address,
        area: eventData.merchantData.area,
        businessType: eventData.merchantData.businessType,
        location: eventData.merchantData.location,
        distance: eventData.merchantData.distance,
        score: eventData.merchantData.score,
        priority: eventData.merchantData.priority
      } : null,

      // Smart selection data
      smartData: eventData.smartData,

      // Assignment data (for order_assigned events)
      assignmentData: eventData.assignmentData,

      // Notification rules
      notificationRules: this.config.orderEvents[eventData.eventType] || {}
    };

    let attempt = 0;
    while (attempt < this.config.n8n.retryAttempts) {
      try {
        const response = await axios.post(this.config.n8n.webhookUrl, payload, {
          timeout: this.config.n8n.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ConstructMart-Webhook/1.0'
          }
        });

        return { 
          success: true, 
          response: response.data,
          statusCode: response.status,
          attempt: attempt + 1
        };
      } catch (error) {
        attempt++;
        if (attempt >= this.config.n8n.retryAttempts) {
          return { 
            success: false, 
            error: error.message,
            statusCode: error.response?.status,
            attempts: attempt
          };
        }
        
        // Wait before retry
        await new Promise(resolve => 
          setTimeout(resolve, this.config.n8n.retryDelay * attempt)
        );
      }
    }
  }

  // Send SMS via MSG91
  async sendSMS(phone, message, templateId = null, templateData = {}) {
    if (!this.config.msg91.sms.enabled || !this.config.msg91.authkey) {
      return { success: false, error: 'MSG91 SMS not configured' };
    }

    try {
      const payload = {
        authkey: this.config.msg91.authkey,
        mobiles: phone.startsWith('+91') ? phone.substring(3) : phone,
        message: message,
        sender: this.config.msg91.senderId,
        route: this.config.msg91.route,
        country: this.config.msg91.country
      };

      // If template ID is provided, use template-based SMS
      if (templateId) {
        payload.template_id = templateId;
        payload.realTimeResponse = '1';
        
        // Add template variables
        Object.keys(templateData).forEach((key, index) => {
          payload[`VAR${index + 1}`] = templateData[key];
        });
      }

      const response = await axios.post(
        `${this.config.msg91.sms.baseUrl}send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.request_id || response.data.message_id,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }

  // Send WhatsApp message via MSG91
  async sendWhatsApp(phone, templateId, templateData = {}) {
    if (!this.config.msg91.whatsapp.enabled || !this.config.msg91.authkey) {
      return { success: false, error: 'MSG91 WhatsApp not configured' };
    }

    try {
      const payload = {
        authkey: this.config.msg91.authkey,
        mobiles: phone.startsWith('+91') ? phone.substring(3) : phone,
        template_id: templateId,
        realTimeResponse: '1'
      };

      // Add template variables
      Object.keys(templateData).forEach((key, index) => {
        payload[`VAR${index + 1}`] = templateData[key];
      });

      const response = await axios.post(
        `${this.config.msg91.whatsapp.baseUrl}send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.request_id || response.data.message_id,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }

  // Send OTP via SMS
  async sendOTPSMS(phone, purpose = 'login', templateId = null) {
    if (!this.config.msg91.otp.enabled || !this.config.msg91.authkey) {
      return { success: false, error: 'MSG91 OTP not configured' };
    }

    try {
      const payload = {
        authkey: this.config.msg91.authkey,
        mobile: phone.startsWith('+91') ? phone.substring(3) : phone,
        sender: this.config.msg91.senderId,
        otp_expiry: this.config.msg91.otp.otpExpiry,
        userip: '127.0.0.1', // You can pass actual IP
        email: '', // Optional
        realTimeResponse: '1'
      };

      if (templateId) {
        payload.template_id = templateId;
      }

      const response = await axios.post(
        `${this.config.msg91.otp.baseUrl}send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        requestId: response.data.request_id,
        type: response.data.type,
        message: response.data.message,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }

  // Send OTP via WhatsApp
  async sendOTPWhatsApp(phone, purpose = 'login', templateId = null) {
    if (!this.config.msg91.otp.enabled || !this.config.msg91.authkey) {
      return { success: false, error: 'MSG91 OTP not configured' };
    }

    try {
      const payload = {
        authkey: this.config.msg91.authkey,
        mobile: phone.startsWith('+91') ? phone.substring(3) : phone,
        sender: this.config.msg91.senderId,
        otp_expiry: this.config.msg91.otp.otpExpiry,
        userip: '127.0.0.1',
        realTimeResponse: '1'
      };

      if (templateId) {
        payload.template_id = templateId;
      }

      const response = await axios.post(
        `${this.config.msg91.otp.baseUrl}send`,
        { ...payload, channel: 'whatsapp' },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        requestId: response.data.request_id,
        type: response.data.type,
        message: response.data.message,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }

  // Verify OTP
  async verifyOTP(phone, otp, requestId = null) {
    if (!this.config.msg91.otp.enabled || !this.config.msg91.authkey) {
      return { success: false, error: 'MSG91 OTP not configured' };
    }

    try {
      const payload = {
        authkey: this.config.msg91.authkey,
        mobile: phone.startsWith('+91') ? phone.substring(3) : phone,
        otp: otp
      };

      if (requestId) {
        payload.request_id = requestId;
      }

      const response = await axios.post(
        `${this.config.msg91.otp.baseUrl}verify`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.type === 'success',
        message: response.data.message,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }

  // Send abandoned cart notification
  async sendAbandonedCartNotification(cartData, notificationType) {
    const notifications = [];

    // Send to n8n
    if (this.config.n8n.enabled) {
      const n8nResult = await this.sendToN8n({
        eventType: 'abandoned_cart',
        cartId: cartData._id,
        userId: cartData.userId,
        cartData: cartData,
        notificationType: notificationType,
        timestamp: new Date(),
        metadata: {
          totalValue: cartData.totalValue,
          itemCount: cartData.cartItems.length
        }
      });
      notifications.push({ channel: 'n8n', ...n8nResult });
    }

    return notifications;
  }

  // Process order event and send to n8n (which orchestrates everything)
  async processOrderEvent(eventType, eventData) {
    const eventConfig = this.config.orderEvents[eventType];
    if (!eventConfig) return [];

    console.log("EVENT DATA", eventData);

    const notifications = [];

    // For order_created events, use smart merchant selection
    if (eventType === 'order_created' && eventData.orderData?.deliveryLocation?.coordinates) {
      const smartNotifications = await this.processSmartOrderCreated(eventData);
      notifications.push(...smartNotifications);
    }

    // For order_assigned events, get assigned merchant details
    if (eventType === 'order_assigned' && eventData.metadata?.merchantId) {
      const assignedMerchantNotifications = await this.processOrderAssigned(eventData);
      notifications.push(...assignedMerchantNotifications);
    }

    // Send to n8n (n8n will handle SMS/WhatsApp/Email decisions)
    // Skip generic n8n notification for order_assigned as it's handled by processOrderAssigned
    if (eventConfig.channels.includes('n8n') && this.config.n8n.enabled && eventType !== 'order_assigned') {
      const n8nResult = await this.sendToN8n({
        eventType,
        ...eventData,
        notificationRules: eventConfig,
        // Include all contact details for n8n to decide
        contacts: {
          customer: {
            phone: eventData.orderData.customerPhone,
            email: eventData.orderData.customerEmail || '',
            name: eventData.orderData.customerName
          },
          merchant: eventData.triggeredBy?.userType === 'merchant' ? {
            phone: eventData.triggeredBy.userPhone,
            email: eventData.triggeredBy.userEmail,
            name: eventData.triggeredBy.userName
          } : null,
          admin: eventData.triggeredBy?.userType === 'admin' ? {
            phone: eventData.triggeredBy.userPhone,
            email: eventData.triggeredBy.userEmail,
            name: eventData.triggeredBy.userName
          } : null
        }
      });
      
      notifications.push({ channel: 'n8n', ...n8nResult });
    }

    return notifications;
  }

  // Smart processing for order_created events
  async processSmartOrderCreated(eventData) {
    const notifications = [];

    try {
      // Process each item in the order
      for (const item of eventData.orderData.items || []) {
        // Call smart merchant selection directly (no HTTP request)
        const smartMerchantResult = await smartMerchantSelection({
          orderId: eventData.orderData._id,
          productId: item.productId,
          customerLocation: eventData.orderData.deliveryLocation,
          maxDistance: 15,
          maxMerchants: 3
        });

        if (!smartMerchantResult.success) {
          console.error('Smart merchant selection failed:', smartMerchantResult.error);
          continue;
        }

        const { rankedMerchants } = smartMerchantResult;
        console.log("RANKED MERCHANTS", rankedMerchants);

        // Send notifications to top-ranked merchants
        for (const merchant of rankedMerchants) {
          const merchantNotification = {
            eventType: 'order_created_smart',
            orderId: eventData.orderData._id,
            itemId: item._id,
            merchantData: merchant,
            customerLocation: eventData.orderData.deliveryLocation,
            orderData: eventData.orderData,
            smartData: {
              distance: merchant.distance,
              score: merchant.score,
              priority: merchant.score > 80 ? 'high' : 'medium'
            }
          };

          // Send to n8n with smart merchant data
          console.log('Sending smart merchant notification to n8n for merchant:', merchantNotification);
          const n8nResult = await this.sendToN8n(merchantNotification);
          notifications.push({ 
            channel: 'n8n-smart', 
            merchantId: merchant._id,
            merchantName: merchant.name,
            distance: merchant.distance,
            score: merchant.score,
            ...n8nResult 
          });
        }
      }
    } catch (error) {
      console.error('Error in smart order processing:', error);
      // Fallback to regular notification if smart processing fails
    }

    return notifications;
  }

  // Process order_assigned events to include merchant contact information
  async processOrderAssigned(eventData) {
    const notifications = [];

    try {
      const Merchant = require('../models/Merchant');
      
      // Fetch assigned merchant details
      const merchantId = eventData.metadata.merchantId;
      const merchant = await Merchant.findById(merchantId);
      
      if (!merchant) {
        console.error('Assigned merchant not found:', merchantId);
        return notifications;
      }

      // Create notification with merchant contact details
      // Create proper triggeredBy object with merchant prefixes
      const triggeredByMerchant = {
        ...eventData.triggeredBy,
        merchantName: eventData.triggeredBy.userName || eventData.triggeredBy.merchantName,
        merchantEmail: eventData.triggeredBy.userEmail || eventData.triggeredBy.merchantEmail, 
        merchantPhone: eventData.triggeredBy.userPhone || eventData.triggeredBy.merchantPhone
      };

      // Remove generic field names if we have merchant-specific ones
      if (triggeredByMerchant.merchantName) delete triggeredByMerchant.userName;
      if (triggeredByMerchant.merchantEmail) delete triggeredByMerchant.userEmail;
      if (triggeredByMerchant.merchantPhone) delete triggeredByMerchant.userPhone;

      const merchantNotification = {
        eventType: 'order_assigned',
        orderId: eventData.orderData._id,
        orderData: eventData.orderData,
        triggeredBy: triggeredByMerchant,
        merchantData: {
          _id: merchant._id,
          merchantName: merchant.name || merchant.businessName,
          merchantPhone: merchant.contact?.phone,
          merchantEmail: merchant.contact?.email,
          merchantLocation: merchant.location
        },
        assignmentData: {
          assignedBy: eventData.metadata.assignedBy || 'system',
          itemId: eventData.metadata.itemId,
          assignedAt: new Date()
        }
      };

      // Send to n8n with merchant contact data
      const n8nResult = await this.sendToN8n(merchantNotification);
      notifications.push({ 
        channel: 'n8n-assigned', 
        merchantId: merchant._id,
        merchantName: merchant.name || merchant.businessName,
        merchantPhone: merchant.contact?.phone,
        ...n8nResult 
      });

    } catch (error) {
      console.error('Error in order_assigned processing:', error);
    }

    return notifications;
  }
}

module.exports = new NotificationService();