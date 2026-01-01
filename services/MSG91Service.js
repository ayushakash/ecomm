const axios = require('axios');

class MSG91Service {
  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID || 'CNSMAT';
    this.route = process.env.MSG91_ROUTE || '4';
    this.country = process.env.MSG91_COUNTRY || '91';
    this.enabled = process.env.MSG91_OTP_ENABLED === 'true';
  }

  /**
   * Send OTP using MSG91 OTP API
   * @param {string} phone - 10 digit mobile number
   * @param {string} otp - 4-6 digit OTP
   * @returns {Promise<Object>}
   */
  async sendOTP(phone, otp) {
    try {
      if (!this.enabled) {
        console.log('MSG91 OTP disabled, returning mock success');
        return { success: true, message: 'OTP sent (mock)', otp };
      }

      if (!this.authKey || this.authKey === 'your_msg91_auth_key_here') {
        console.log('MSG91 Auth Key not configured, returning mock success');
        return { success: true, message: 'OTP sent (mock - no auth key)', otp };
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

      // Remove template_id if not set (for testing without DLT)
      if (!payload.template_id) {
        delete payload.template_id;
      }

      console.log('📤 Sending OTP via MSG91:', {
        phone: `${this.country}${phone}`,
        otp: otp.substring(0, 2) + '**',
        unmaskedOtp:otp
      });

      const response = await axios.post(url, payload, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ MSG91 OTP sent successfully:', response.data);

      return {
        success: true,
        message: 'OTP sent successfully',
        data: response.data,
      };

    } catch (error) {
      console.error('❌ MSG91 OTP sending failed:', error.response?.data || error.message);

      // Return success anyway with mock OTP for development
      return {
        success: false,
        message: 'Failed to send OTP via MSG91',
        error: error.response?.data || error.message,
        mockOTP: otp, // Return OTP anyway for development
      };
    }
  }

  /**
   * Verify OTP using MSG91 Verify API
   * @param {string} phone - 10 digit mobile number
   * @param {string} otp - 4-6 digit OTP
   * @returns {Promise<Object>}
   */
  async verifyOTP(phone, otp) {
    try {
      if (!this.enabled) {
        return { success: true, message: 'OTP verified (mock)' };
      }

      const url = `https://control.msg91.com/api/v5/otp/verify`;

      const payload = {
        authkey: this.authKey,
        mobile: `${this.country}${phone}`,
        otp: otp,
      };

      const response = await axios.post(url, payload, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ MSG91 OTP verified:', response.data);

      return {
        success: true,
        message: 'OTP verified successfully',
        data: response.data,
      };

    } catch (error) {
      console.error('❌ MSG91 OTP verification failed:', error.response?.data || error.message);

      return {
        success: false,
        message: 'OTP verification failed',
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Resend OTP
   * @param {string} phone - 10 digit mobile number
   * @param {boolean} isVoiceCall - Send OTP via voice call
   * @returns {Promise<Object>}
   */
  async resendOTP(phone, isVoiceCall = false) {
    try {
      const url = `https://control.msg91.com/api/v5/otp/retry`;

      const payload = {
        authkey: this.authKey,
        mobile: `${this.country}${phone}`,
        retrytype: isVoiceCall ? 'voice' : 'text',
      };

      const response = await axios.post(url, payload, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ MSG91 OTP resent:', response.data);

      return {
        success: true,
        message: 'OTP resent successfully',
        data: response.data,
      };

    } catch (error) {
      console.error('❌ MSG91 OTP resend failed:', error.response?.data || error.message);

      return {
        success: false,
        message: 'Failed to resend OTP',
        error: error.response?.data || error.message,
      };
    }
  }
}

module.exports = new MSG91Service();