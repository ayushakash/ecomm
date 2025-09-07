const axios = require('axios');
const notificationConfig = require('../config/notifications');
const OrderLog = require('../models/OrderLog');

class NotificationService {
  constructor() {
    this.config = notificationConfig;
  }

  // Send notification to n8n webhook
  async sendToN8n(eventData) {
    if (!this.config.n8n.enabled || !this.config.n8n.webhookUrl) {
      return { success: false, error: 'n8n not configured' };
    }

    const payload = {
      eventType: eventData.eventType,
      orderId: eventData.orderId,
      orderData: eventData.orderData,
      timestamp: eventData.timestamp,
      triggeredBy: eventData.triggeredBy,
      recipients: eventData.recipients,
      notificationRules: this.config.orderEvents[eventData.eventType] || {},
      metadata: eventData.metadata,
      requestBody: eventData.requestBody
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

    // Send to n8n (n8n will handle SMS/WhatsApp/Email decisions)
    if (eventConfig.channels.includes('n8n') && this.config.n8n.enabled) {
      const n8nResult = await this.sendToN8n({
        eventType,
        ...eventData,
        notificationRules: eventConfig,
        // Include all contact details for n8n to decide
        contacts: {
          customer: eventData.orderData?.customerPhone ? {
            phone: eventData.orderData.customerPhone,
            email: eventData.orderData.customerEmail,
            name: eventData.orderData.customerName
          } : null,
          merchant: eventData.triggeredBy?.userType === 'merchant' ? {
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
}

module.exports = new NotificationService();