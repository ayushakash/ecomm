/**
 * Analytics Service - Centralized tracking for Google Analytics & Meta Pixel
 *
 * Configuration is managed via environment variables in .env file:
 * - REACT_APP_GA_MEASUREMENT_ID: Google Analytics 4 Measurement ID
 * - REACT_APP_META_PIXEL_ID: Meta (Facebook) Pixel ID
 * - REACT_APP_ANALYTICS_ENABLED: Enable/disable all tracking
 */

class AnalyticsService {
  constructor() {
    this.gaId = process.env.REACT_APP_GA_MEASUREMENT_ID;
    this.metaPixelId = process.env.REACT_APP_META_PIXEL_ID;
    this.enabled = process.env.REACT_APP_ANALYTICS_ENABLED === 'true';
    this.initialized = false;
  }

  /**
   * Initialize Google Analytics and Meta Pixel
   * Call this once when the app loads
   */
  initialize() {
    if (!this.enabled || this.initialized) return;
    this.initialized = true;

    // Meta Pixel fires quickly (800ms) so paid-ad clicks are attributed even when
    // a visitor bounces within a few seconds — the script is async, so this costs
    // little. Google Analytics stays deferred to 5s to protect LCP/FCP.
    const startPixel = () => {
      if (this.metaPixelId && this.metaPixelId !== '000000000000000') this.initializeMetaPixel();
    };
    const startGA = () => {
      if (this.gaId && this.gaId !== 'G-XXXXXXXXXX') this.initializeGoogleAnalytics();
    };

    const schedule = () => {
      setTimeout(startPixel, 800);
      setTimeout(startGA, 5000);
    };

    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }
  }

  /**
   * Initialize Google Analytics 4
   */
  initializeGoogleAnalytics() {
    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaId}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', this.gaId, {
      send_page_view: true,
      page_location: window.location.href,
      page_path: window.location.pathname
    });

    console.log('✅ Google Analytics initialized:', this.gaId);
  }

  /**
   * Initialize Meta (Facebook) Pixel
   */
  initializeMetaPixel() {
    // Meta Pixel initialization code
    // eslint-disable-next-line no-unused-expressions
    !function(f,b,e,v,n,t,s) {
      if(f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments)
      };
      if(!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', this.metaPixelId);
    window.fbq('track', 'PageView');

    console.log('✅ Meta Pixel initialized:', this.metaPixelId);
  }

  /**
   * Track a page view
   * @param {string} pagePath - The page path (e.g., '/products')
   * @param {string} pageTitle - The page title
   */
  trackPageView(pagePath, pageTitle) {
    if (!this.enabled) return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('config', this.gaId, {
        page_path: pagePath,
        page_title: pageTitle
      });
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }

  /**
   * Track custom event
   * @param {string} eventName - Name of the event
   * @param {object} eventParams - Event parameters
   */
  trackEvent(eventName, eventParams = {}) {
    if (!this.enabled) return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, eventParams);
    }

    console.log('📊 Event tracked:', eventName, eventParams);
  }

  /**
   * Track product view
   * @param {object} product - Product details
   */
  trackProductView(product) {
    if (!this.enabled) return;

    const eventParams = {
      items: [{
        item_id: product._id || product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: 'INR'
      }]
    };

    // Google Analytics - Enhanced E-commerce
    if (window.gtag) {
      window.gtag('event', 'view_item', eventParams);
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product._id || product.id],
        content_type: 'product',
        value: product.price,
        currency: 'INR'
      });
    }

    console.log('📊 Product view tracked:', product.name);
  }

  /**
   * Track add to cart
   * @param {object} product - Product details
   * @param {number} quantity - Quantity added
   */
  trackAddToCart(product, quantity = 1) {
    if (!this.enabled) return;

    const value = product.price * quantity;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'INR',
        value: value,
        items: [{
          item_id: product._id || product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          quantity: quantity
        }]
      });
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_ids: [product._id || product.id],
        content_type: 'product',
        value: value,
        currency: 'INR'
      });
    }

    console.log('🛒 Add to cart tracked:', product.name, 'x', quantity);
  }

  /**
   * Track begin checkout
   * @param {array} items - Cart items
   * @param {number} totalValue - Total cart value
   */
  trackBeginCheckout(items, totalValue) {
    if (!this.enabled) return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'INR',
        value: totalValue,
        items: items.map(item => ({
          item_id: item.product?._id || item._id,
          item_name: item.product?.name || item.name,
          item_category: item.product?.category || item.category,
          price: item.product?.price || item.price,
          quantity: item.quantity
        }))
      });
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: totalValue,
        currency: 'INR',
        num_items: items.length
      });
    }

    console.log('💳 Checkout started tracked:', totalValue);
  }

  /**
   * Track purchase/order completion
   * @param {object} orderDetails - Order information
   */
  trackPurchase(orderDetails) {
    if (!this.enabled) return;

    const { orderId, items, totalAmount, tax, shipping } = orderDetails;

    // Google Analytics - E-commerce
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        value: totalAmount,
        tax: tax || 0,
        shipping: shipping || 0,
        currency: 'INR',
        items: items.map(item => ({
          item_id: item.product?._id || item._id,
          item_name: item.product?.name || item.name,
          item_category: item.product?.category || item.category,
          price: item.product?.price || item.price,
          quantity: item.quantity
        }))
      });
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'Purchase', {
        value: totalAmount,
        currency: 'INR',
        content_type: 'product',
        num_items: items.length
      });
    }

    console.log('✅ Purchase tracked:', orderId, totalAmount);
  }

  /**
   * Track calculator usage
   * @param {object} calculationData - Calculator input and results
   */
  trackCalculatorUse(calculationData) {
    if (!this.enabled) return;

    const { area, floors, totalCost, materials } = calculationData;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'calculator_use', {
        event_category: 'engagement',
        event_label: 'construction_calculator',
        area: area,
        floors: floors,
        estimated_cost: totalCost
      });
    }

    // Meta Pixel - Custom Event
    if (window.fbq) {
      window.fbq('trackCustom', 'CalculatorUsed', {
        area: area,
        floors: floors,
        value: totalCost,
        currency: 'INR'
      });
    }

    console.log('🧮 Calculator use tracked:', area, 'sqft,', floors, 'floors');
  }

  /**
   * Track lead generation (contact form, phone number capture, etc.)
   * @param {object} leadData - Lead information
   */
  trackLead(leadData) {
    if (!this.enabled) return;

    const { type, value } = leadData;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'generate_lead', {
        event_category: 'lead',
        event_label: type,
        value: value || 0
      });
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: type,
        value: value || 0,
        currency: 'INR'
      });
    }

    console.log('📋 Lead tracked:', type);
  }

  /**
   * Track search
   * @param {string} searchTerm - Search query
   */
  trackSearch(searchTerm) {
    if (!this.enabled) return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'search', {
        search_term: searchTerm
      });
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'Search', {
        search_string: searchTerm
      });
    }

    console.log('🔍 Search tracked:', searchTerm);
  }

  /**
   * Track user registration
   * @param {string} method - Registration method (email, phone, etc.)
   */
  trackSignUp(method = 'email') {
    if (!this.enabled) return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'sign_up', {
        method: method
      });
    }

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'CompleteRegistration', {
        status: 'completed'
      });
    }

    console.log('👤 Sign up tracked:', method);
  }

  /**
   * Track user login
   * @param {string} method - Login method
   */
  trackLogin(method = 'email') {
    if (!this.enabled) return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'login', {
        method: method
      });
    }

    console.log('🔑 Login tracked:', method);
  }
}

// Export singleton instance
const analytics = new AnalyticsService();
export default analytics;
