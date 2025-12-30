/**
 * MSG91 OTP Widget Service
 * Uses MSG91's OTP Widget for sending and verifying OTPs
 */

class MSG91OtpService {
  constructor() {
    // You need to create a WEB widget in MSG91 dashboard and replace this ID
    this.widgetId = process.env.REACT_APP_MSG91_WIDGET_ID || '356a61686571383330363834';
    this.authToken = process.env.REACT_APP_MSG91_AUTH_KEY || '471309TydHm2HpEe68dce0f9P1';
    this.isInitialized = false;
    this.currentRequestId = null;
  }

  /**
   * Initialize MSG91 Widget
   */
  initialize() {
    if (this.isInitialized || !window.initSendOTP) {
      return;
    }

    const configuration = {
      widgetId: this.widgetId,
      tokenAuth: this.authToken,
      exposeMethods: true, // Expose sendOtp, verifyOtp, retryOtp methods
      success: (data) => {
        console.log('✅ MSG91 OTP Widget - Success:', data);
      },
      failure: (error) => {
        console.error('❌ MSG91 OTP Widget - Failure:', error);
      },
    };

    try {
      window.initSendOTP(configuration);
      this.isInitialized = true;
      console.log('✅ MSG91 OTP Widget initialized');
    } catch (error) {
      console.error('❌ Failed to initialize MSG91 Widget:', error);
    }
  }

  /**
   * Send OTP to phone number
   * @param {string} phone - 10 digit mobile number (without country code)
   * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
   */
  sendOTP(phone) {
    return new Promise((resolve, reject) => {
      if (!window.sendOtp) {
        this.initialize();

        // Wait for widget to initialize
        setTimeout(() => {
          if (!window.sendOtp) {
            return reject({ success: false, error: 'MSG91 Widget not loaded' });
          }
          this._sendOtpInternal(phone, resolve, reject);
        }, 1000);
      } else {
        this._sendOtpInternal(phone, resolve, reject);
      }
    });
  }

  _sendOtpInternal(phone, resolve, reject) {
    // Add country code (91 for India)
    const identifier = `91${phone}`;

    console.log('📤 Sending OTP via MSG91 Widget to:', identifier);

    window.sendOtp(
      identifier,
      (data) => {
        console.log('✅ OTP sent successfully:', data);
        this.currentRequestId = data?.request_id || data?.requestId;
        resolve({
          success: true,
          requestId: this.currentRequestId,
          message: 'OTP sent successfully'
        });
      },
      (error) => {
        console.error('❌ Failed to send OTP:', error);
        reject({
          success: false,
          error: error?.message || 'Failed to send OTP',
          details: error
        });
      }
    );
  }

  /**
   * Verify OTP
   * @param {string} otp - 4-6 digit OTP entered by user
   * @param {string} requestId - Optional request ID from sendOTP response
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  verifyOTP(otp, requestId = null) {
    return new Promise((resolve, reject) => {
      if (!window.verifyOtp) {
        return reject({ success: false, error: 'MSG91 Widget not loaded' });
      }

      const reqId = requestId || this.currentRequestId;
      console.log('🔍 Verifying OTP:', otp.substring(0, 2) + '**', 'RequestID:', reqId);

      window.verifyOtp(
        otp,
        (data) => {
          console.log('✅ OTP verified successfully:', data);
          resolve({
            success: true,
            data,
            message: 'OTP verified successfully'
          });
        },
        (error) => {
          console.error('❌ OTP verification failed:', error);
          reject({
            success: false,
            error: error?.message || 'Invalid OTP',
            details: error
          });
        },
        reqId
      );
    });
  }

  /**
   * Resend OTP
   * @param {string} channel - '11' for SMS, '4' for Voice, '12' for WhatsApp, null for default
   * @param {string} requestId - Optional request ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  resendOTP(channel = null, requestId = null) {
    return new Promise((resolve, reject) => {
      if (!window.retryOtp) {
        return reject({ success: false, error: 'MSG91 Widget not loaded' });
      }

      const reqId = requestId || this.currentRequestId;
      console.log('🔄 Resending OTP via channel:', channel || 'default');

      window.retryOtp(
        channel,
        (data) => {
          console.log('✅ OTP resent successfully:', data);
          resolve({
            success: true,
            data,
            message: 'OTP resent successfully'
          });
        },
        (error) => {
          console.error('❌ Failed to resend OTP:', error);
          reject({
            success: false,
            error: error?.message || 'Failed to resend OTP',
            details: error
          });
        },
        reqId
      );
    });
  }

  /**
   * Get widget data
   */
  getWidgetData() {
    if (window.getWidgetData) {
      return window.getWidgetData();
    }
    return null;
  }

  /**
   * Check if captcha is verified
   */
  isCaptchaVerified() {
    if (window.isCaptchaVerified) {
      return window.isCaptchaVerified();
    }
    return false;
  }
}

// Export singleton instance
export const msg91OtpService = new MSG91OtpService();
export default msg91OtpService;
