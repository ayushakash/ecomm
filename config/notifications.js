module.exports = {
  // n8n Configuration
  n8n: {
    enabled: true, // Temporarily enabled for testing
    webhookUrl: 'https://webhook.site/78bf2c85-f2b5-4358-b350-7a1a61e8881f' || process.env.N8N_WEBHOOK_URL ,
    timeout: parseInt(process.env.N8N_TIMEOUT) || 5000,
    retryAttempts: parseInt(process.env.N8N_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.N8N_RETRY_DELAY) || 1000,
  },

  // MSG91 Configuration
  msg91: {
    authkey: process.env.MSG91_AUTH_KEY || '',
    senderId: process.env.MSG91_SENDER_ID || 'CNSMAT',
    route: process.env.MSG91_ROUTE || '4', // 4 for transactional
    country: process.env.MSG91_COUNTRY || '91',
    
    // SMS API Configuration
    sms: {
      enabled: process.env.MSG91_SMS_ENABLED === 'true' || false,
      baseUrl: 'https://api.msg91.com/api/v5/sms/',
      templateIds: {
        otp: process.env.MSG91_SMS_OTP_TEMPLATE_ID || '',
        orderConfirmation: process.env.MSG91_SMS_ORDER_TEMPLATE_ID || '',
        orderUpdate: process.env.MSG91_SMS_UPDATE_TEMPLATE_ID || '',
        abandonedCart: process.env.MSG91_SMS_CART_TEMPLATE_ID || '',
        welcome: process.env.MSG91_SMS_WELCOME_TEMPLATE_ID || ''
      }
    },

    // WhatsApp API Configuration  
    whatsapp: {
      enabled: process.env.MSG91_WHATSAPP_ENABLED === 'true' || false,
      baseUrl: 'https://api.msg91.com/api/v5/whatsapp/',
      templateIds: {
        otp: process.env.MSG91_WA_OTP_TEMPLATE_ID || '',
        orderConfirmation: process.env.MSG91_WA_ORDER_TEMPLATE_ID || '',
        orderUpdate: process.env.MSG91_WA_UPDATE_TEMPLATE_ID || '',
        abandonedCart: process.env.MSG91_WA_CART_TEMPLATE_ID || '',
        welcome: process.env.MSG91_WA_WELCOME_TEMPLATE_ID || ''
      }
    },

    // OTP Configuration
    otp: {
      enabled: process.env.MSG91_OTP_ENABLED === 'true' || false,
      baseUrl: 'https://api.msg91.com/api/v5/otp/',
      otpExpiry: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
      maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.OTP_RETRY_DELAY) || 30, // seconds
      templates: {
        login: process.env.MSG91_OTP_LOGIN_TEMPLATE || '',
        registration: process.env.MSG91_OTP_REGISTER_TEMPLATE || '',
        passwordReset: process.env.MSG91_OTP_RESET_TEMPLATE || '',
        phoneVerification: process.env.MSG91_OTP_VERIFY_TEMPLATE || ''
      }
    }
  },

  // Abandoned Cart Configuration
  abandonedCart: {
    enabled: process.env.ABANDONED_CART_ENABLED === 'true' || true,
    trackingDelay: parseInt(process.env.CART_TRACKING_DELAY) || 15, // minutes
    notifications: {
      '15min': {
        enabled: true,
        delay: 15 * 60 * 1000, // 15 minutes
        template: 'Quick! Your cart is waiting'
      },
      '1hour': {
        enabled: true,
        delay: 60 * 60 * 1000, // 1 hour
        template: 'Still thinking? Complete your purchase'
      },
      '24hour': {
        enabled: true,
        delay: 24 * 60 * 60 * 1000, // 24 hours
        template: 'Don\'t miss out! Your items might go out of stock'
      },
      '3days': {
        enabled: true,
        delay: 3 * 24 * 60 * 60 * 1000, // 3 days
        template: 'Last chance! Complete your order now'
      }
    }
  },

  // Event-based notification rules (n8n orchestrates everything)
  orderEvents: {
    order_created: {
      notifyCustomer: true,
      notifyMerchant: true,
      notifyAdmin: false,
      channels: ['n8n'] // n8n will decide SMS/WhatsApp/Email
    },
    order_assigned: {
      notifyCustomer: false,
      notifyMerchant: true,
      notifyAdmin: true,
      channels: ['n8n'] // n8n will decide SMS/WhatsApp/Email
    },
    order_accepted: {
      notifyCustomer: true,
      notifyMerchant: false,
      notifyAdmin: true,
      channels: ['n8n'] // n8n will decide SMS/WhatsApp/Email
    },
    order_rejected: {
      notifyCustomer: true,
      notifyMerchant: false,
      notifyAdmin: true,
      channels: ['n8n'] // n8n will decide SMS/WhatsApp/Email
    },
    order_shipped: {
      notifyCustomer: true,
      notifyMerchant: false,
      notifyAdmin: false,
      channels: ['n8n'] // n8n will decide SMS/WhatsApp/Email
    },
    order_delivered: {
      notifyCustomer: true,
      notifyMerchant: true,
      notifyAdmin: false,
      channels: ['n8n'] // n8n will decide SMS/WhatsApp/Email
    },
    order_cancelled: {
      notifyCustomer: true,
      notifyMerchant: true,
      notifyAdmin: true,
      channels: ['n8n'] // n8n will decide SMS/WhatsApp/Email
    }
  }
};