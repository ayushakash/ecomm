const axios = require('axios');

class MSG91Service {
  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID || 'CNSMAT';
    this.route = process.env.MSG91_ROUTE || '4';
    this.country = process.env.MSG91_COUNTRY || '91';
    this.enabled = process.env.MSG91_OTP_ENABLED === 'true';

    // WhatsApp configuration
    this.whatsappIntegratedNumber = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '916201176610';
    this.whatsappOtpTemplate = process.env.MSG91_WHATSAPP_OTP_TEMPLATE || 'loginotp';
  }

  /**
   * Send OTP via WhatsApp using MSG91 WhatsApp API
   * @param {string} phone - 10 digit mobile number (without country code)
   * @param {string} otp - 4-6 digit OTP
   * @param {string} templateName - WhatsApp template name (optional, defaults to loginotp)
   * @returns {Promise<Object>}
   */
  async sendOTPWhatsApp(phone, otp, templateName = null) {
    try {
      if (!this.enabled) {
        console.log('📱 MSG91 OTP disabled, returning mock success');
        return { success: true, message: 'OTP sent (mock)', otp, channel: 'mock' };
      }

      if (!this.authKey) {
        console.log('📱 MSG91 Auth Key not configured, returning mock success');
        return { success: true, message: 'OTP sent (mock - no auth key)', otp, channel: 'mock' };
      }

      const url = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

      // Format phone number with country code
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

      const payload = {
        integrated_number: this.whatsappIntegratedNumber,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: templateName || this.whatsappOtpTemplate,
            language: {
              code: 'en',
              policy: 'deterministic'
            },
            namespace: null,
            to_and_components: [
              {
                to: [formattedPhone],
                components: {
                  body_1: {
                    type: 'text',
                    value: otp
                  },
                  button_1: {
                    subtype: 'url',
                    type: 'text',
                    value: otp
                  }
                }
              }
            ]
          }
        }
      };

      console.log('📤 Sending OTP via MSG91 WhatsApp:', {
        phone: formattedPhone,
        otp,
        template: templateName || this.whatsappOtpTemplate
      });

      // 🔍 Full request dump for debugging "invalid parameter" errors from MSG91
      console.log('🔍 MSG91 WhatsApp request URL:', url);
      console.log('🔍 MSG91 WhatsApp request headers:', {
        authkey: this.authKey ? `${this.authKey.substring(0, 6)}...(${this.authKey.length} chars)` : 'MISSING',
        'Content-Type': 'application/json'
      });
      console.log('🔍 MSG91 WhatsApp full payload:\n' + JSON.stringify(payload, null, 2));

      const response = await axios.post(url, payload, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      console.log('✅ MSG91 WhatsApp OTP sent successfully:', response.data);

      return {
        success: true,
        message: 'OTP sent successfully via WhatsApp',
        data: response.data,
        channel: 'whatsapp'
      };

    } catch (error) {
      console.error('❌ MSG91 WhatsApp OTP sending failed:', error.response?.data || error.message);

      // 🔍 Full error dump — MSG91 usually names the invalid parameter here
      console.error('🔍 MSG91 WhatsApp error status:', error.response?.status);
      console.error('🔍 MSG91 WhatsApp error body:\n' + JSON.stringify(error.response?.data, null, 2));

      return {
        success: false,
        message: 'Failed to send OTP via WhatsApp',
        error: error.response?.data || error.message,
        channel: 'whatsapp'
      };
    }
  }

  /**
   * Notify the admin/owner on WhatsApp that a new order was placed.
   * Reuses the already-approved `orderconfirmation` template (5 body vars):
   * {{1}} name, {{2}} order no, {{3}} items, {{4}} amount, {{5}} address.
   * Template name + namespace are env-overridable.
   * @param {Object} order - Mongoose Order document
   * @param {string} [adminPhone] - defaults to ADMIN_WHATSAPP_NUMBER
   */
  async sendOrderAlertToAdmin(order, adminPhone = null) {
    try {
      const phone = adminPhone || process.env.ADMIN_WHATSAPP_NUMBER;
      if (!phone) {
        console.warn('📱 No ADMIN_WHATSAPP_NUMBER configured — skipping admin order alert');
        return { success: false, error: 'no admin whatsapp number', channel: 'whatsapp' };
      }

      if (!this.authKey) {
        console.log('📱 MSG91 Auth Key not configured, returning mock admin alert');
        return { success: true, message: 'admin alert (mock)', channel: 'mock' };
      }

      const url = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
      const templateName = process.env.MSG91_WHATSAPP_ORDER_ADMIN_TEMPLATE || 'orderconfirmation';
      const namespace = process.env.MSG91_WHATSAPP_NAMESPACE || '2d94a314_a4ca_45d8_a3a5_3970af9d866a';
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

      // WhatsApp template vars can't contain newlines / 4+ spaces; keep it tidy.
      const itemsSummary = (order.items || [])
        .map(i => `${i.quantity}x ${i.productName}`)
        .join(', ')
        .replace(/\s+/g, ' ')
        .slice(0, 250) || 'Items';

      const payload = {
        integrated_number: this.whatsappIntegratedNumber,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en', policy: 'deterministic' },
            namespace,
            to_and_components: [
              {
                to: [formattedPhone],
                components: {
                  body_1: { type: 'text', value: String(order.customerName || 'Customer') },
                  body_2: { type: 'text', value: String(order.orderNumber || '-') },
                  body_3: { type: 'text', value: itemsSummary },
                  body_4: { type: 'text', value: String(order.totalAmount ?? '-') },
                  body_5: { type: 'text', value: String(order.customerAddress || order.customerArea || 'Address') }
                }
              }
            ]
          }
        }
      };

      console.log(`📤 Sending new-order WhatsApp alert to admin ${formattedPhone} (template: ${templateName})`);

      const response = await axios.post(url, payload, {
        headers: { 'authkey': this.authKey, 'Content-Type': 'application/json' },
        timeout: 15000
      });

      console.log('✅ Admin order alert sent:', response.data);
      return { success: true, data: response.data, channel: 'whatsapp' };

    } catch (error) {
      console.error('❌ Admin order alert failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message, channel: 'whatsapp' };
    }
  }

  /**
   * Send OTP - main method that uses WhatsApp
   * @param {string} phone - 10 digit mobile number
   * @param {string} otp - 4-6 digit OTP
   * @param {string} purpose - Purpose of OTP (login, registration, etc.)
   * @returns {Promise<Object>}
   */
  async sendOTP(phone, otp, purpose = 'login') {
    // Use WhatsApp as primary channel
    const result = await this.sendOTPWhatsApp(phone, otp);

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 OTP for ${phone}: ${otp} (purpose: ${purpose})`);
    }

    return result;
  }

  /**
   * Send OTP using MSG91 SMS OTP API (fallback/alternative)
   * @param {string} phone - 10 digit mobile number
   * @param {string} otp - 4-6 digit OTP
   * @returns {Promise<Object>}
   */
  async sendOTPSMS(phone, otp) {
    try {
      if (!this.enabled) {
        console.log('📱 MSG91 OTP disabled, returning mock success');
        return { success: true, message: 'OTP sent (mock)', otp, channel: 'mock' };
      }

      if (!this.authKey) {
        console.log('📱 MSG91 Auth Key not configured, returning mock success');
        return { success: true, message: 'OTP sent (mock - no auth key)', otp, channel: 'mock' };
      }

      // MSG91 SendOTP API v5
      const url = 'https://control.msg91.com/api/v5/otp';

      const payload = {
        template_id: process.env.MSG91_OTP_LOGIN_TEMPLATE || null,
        mobile: `${this.country}${phone}`,
        authkey: this.authKey,
        otp: otp,
        otp_expiry: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
      };

      // Remove template_id if not set
      if (!payload.template_id) {
        delete payload.template_id;
      }

      console.log('📤 Sending OTP via MSG91 SMS:', {
        phone: `${this.country}${phone}`,
        otp
      });

      const response = await axios.post(url, payload, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ MSG91 SMS OTP sent successfully:', response.data);

      return {
        success: true,
        message: 'OTP sent successfully via SMS',
        data: response.data,
        channel: 'sms'
      };

    } catch (error) {
      console.error('❌ MSG91 SMS OTP sending failed:', error.response?.data || error.message);

      return {
        success: false,
        message: 'Failed to send OTP via SMS',
        error: error.response?.data || error.message,
        channel: 'sms'
      };
    }
  }

  /**
   * Resend OTP - generates new OTP and sends again
   * Note: Since we're using WhatsApp templates, we need to generate a new OTP
   * @param {string} phone - 10 digit mobile number
   * @param {string} otp - New OTP to send
   * @param {string} channel - 'whatsapp' or 'sms'
   * @returns {Promise<Object>}
   */
  async resendOTP(phone, otp, channel = 'whatsapp') {
    if (channel === 'sms') {
      return this.sendOTPSMS(phone, otp);
    }
    return this.sendOTPWhatsApp(phone, otp);
  }

  /**
   * Check if MSG91 OTP is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled && !!this.authKey;
  }
}

module.exports = new MSG91Service();
