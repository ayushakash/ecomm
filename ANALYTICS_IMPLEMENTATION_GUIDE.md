# Analytics Implementation Guide - E-commerce Platform

**Date:** January 4, 2026
**Project:** Chardeevari Construction Materials E-commerce
**Analytics IDs:** Centralized in `.env` file

---

## 🎯 Overview

Complete analytics tracking implementation for your e-commerce platform with **centralized configuration** for easy management.

### What's Tracking:
✅ Google Analytics 4 (GA4)
✅ Meta Pixel (Facebook Pixel)
✅ All e-commerce events
✅ User behavior & conversions

---

## ⚙️ Configuration (Centralized)

### 📁 Location: `/client/.env`

All analytics IDs are managed in ONE place for easy updates:

```env
# Analytics & Tracking Configuration
REACT_APP_GA_MEASUREMENT_ID=G-04CDWZJGE9
REACT_APP_META_PIXEL_ID=940175806603175
REACT_APP_ANALYTICS_ENABLED=true
```

### 🔄 How to Change Analytics IDs

**Option 1: Update .env file (Recommended)**
```bash
cd /home/oem/projects/ecomm/client

# Edit .env file
nano .env

# Change the IDs:
REACT_APP_GA_MEASUREMENT_ID=G-YOUR_NEW_ID
REACT_APP_META_PIXEL_ID=YOUR_NEW_PIXEL_ID

# Restart the app
npm start
```

**Option 2: Environment Variables**
```bash
# For temporary testing
REACT_APP_GA_MEASUREMENT_ID=G-TEST npm start
```

### 🚫 Disable Analytics (Development)
```env
REACT_APP_ANALYTICS_ENABLED=false
```

---

## 📊 What's Being Tracked

### 1. **Automatic Page View Tracking**
Every route change is automatically tracked:
- Home page
- Product listings
- Product details
- Cart, Checkout
- Blog, Calculator
- Profile pages

**Implementation:** `App.js` (lines 173-176)

---

### 2. **Calculator Usage** 🧮
Tracks when users use the construction materials calculator.

**Events Tracked:**
- Area entered
- Number of floors
- Total estimated cost
- Material quantities calculated

**Location:** `/pages/Calculator.js` (lines 97-109)

**Example Data:**
```javascript
{
  area: 1000,
  floors: 2,
  totalCost: 500000,
  materials: {
    cement: 250,
    steel: 8000,
    sand: 2400,
    aggregate: 2000,
    bricks: 17000
  }
}
```

---

### 3. **Product View** 👁️
Tracks when users view a product detail page.

**Events Tracked:**
- Product ID & Name
- Category
- Price
- Availability

**Location:** `/pages/products/ProductDetail.js` (lines 23-28)

**Google Analytics Event:** `view_item`
**Meta Pixel Event:** `ViewContent`

---

### 4. **Add to Cart** 🛒
Tracks when users add products to cart.

**Events Tracked:**
- Product details
- Quantity added
- Total value

**Location:** `/pages/products/ProductDetail.js` (lines 38-39)

**Google Analytics Event:** `add_to_cart`
**Meta Pixel Event:** `AddToCart`

---

### 5. **Begin Checkout** 💳
Tracks when users start the checkout process.

**Events Tracked:**
- Cart items
- Subtotal value
- Number of items

**Location:** `/pages/cart/Checkout.js` (lines 150-156)

**Google Analytics Event:** `begin_checkout`
**Meta Pixel Event:** `InitiateCheckout`

---

### 6. **Purchase** ✅
Tracks completed orders/purchases.

**Events Tracked:**
- Order ID
- Items purchased
- Total amount
- Tax & shipping

**Location:** `/pages/cart/Checkout.js` (lines 175-182)

**Google Analytics Event:** `purchase`
**Meta Pixel Event:** `Purchase`

**Example Data:**
```javascript
{
  orderId: "ORD123456",
  items: [...],
  totalAmount: 5500,
  tax: 500,
  shipping: 50
}
```

---

### 7. **User Registration** 📝
Tracks new user sign-ups.

**Events Tracked:**
- Registration method (email/phone)

**Location:** `/contexts/AuthContext.js` (lines 92-93)

**Google Analytics Event:** `sign_up`
**Meta Pixel Event:** `CompleteRegistration`

---

### 8. **User Login** 🔑
Tracks user logins.

**Events Tracked:**
- Login method (email/OTP)

**Locations:**
- Email login: `/contexts/AuthContext.js` (lines 60-61)
- OTP login: `/contexts/AuthContext.js` (lines 184-185)

**Google Analytics Event:** `login`

---

## 📂 File Structure

```
/client
├── .env                          # ⚙️ ANALYTICS IDS HERE
├── .env.example                  # Template
├── src/
│   ├── App.js                    # Analytics initialization & page views
│   ├── services/
│   │   └── analytics.js          # 🎯 Analytics service (centralized)
│   ├── pages/
│   │   ├── Calculator.js         # Calculator tracking
│   │   ├── products/
│   │   │   └── ProductDetail.js  # Product view & add to cart
│   │   └── cart/
│   │       └── Checkout.js       # Checkout & purchase
│   └── contexts/
│       └── AuthContext.js        # Login & registration
```

---

## 🔧 Analytics Service API

Located at: `/client/src/services/analytics.js`

### Available Methods:

```javascript
import analytics from '../services/analytics';

// Initialize (auto-called in App.js)
analytics.initialize();

// Track page view
analytics.trackPageView('/products', 'Products Page');

// Track custom event
analytics.trackEvent('button_click', { button_name: 'cta' });

// Track product view
analytics.trackProductView(product);

// Track add to cart
analytics.trackAddToCart(product, quantity);

// Track checkout
analytics.trackBeginCheckout(cartItems, totalValue);

// Track purchase
analytics.trackPurchase({
  orderId: 'ORD123',
  items: [...],
  totalAmount: 5000
});

// Track calculator use
analytics.trackCalculatorUse({
  area: 1000,
  floors: 2,
  totalCost: 500000
});

// Track lead generation
analytics.trackLead({ type: 'contact_form', value: 1000 });

// Track search
analytics.trackSearch('cement');

// Track sign up
analytics.trackSignUp('email');

// Track login
analytics.trackLogin('email');
```

---

## 📈 View Your Analytics Data

### Google Analytics 4
1. Go to: https://analytics.google.com/
2. Login with your Google account
3. Select property: **G-04CDWZJGE9**
4. View reports:
   - **Real-time** → Current visitors
   - **Life Cycle > Acquisition** → Traffic sources
   - **Life Cycle > Engagement** → User behavior
   - **Monetization > E-commerce purchases** → Sales data

### Meta Events Manager
1. Go to: https://business.facebook.com/events_manager2/
2. Login with Facebook Business account
3. Select pixel: **940175806603175**
4. View:
   - Events overview
   - Conversion tracking
   - Custom audiences

---

## 🧪 Testing Analytics

### Browser Console
```javascript
// Check if Google Analytics loaded
console.log(window.gtag);
console.log(window.dataLayer);

// Check if Meta Pixel loaded
console.log(window.fbq);
```

### Google Analytics Debugger
1. Install: [Google Analytics Debugger Extension](https://chrome.google.com/webstore)
2. Enable extension
3. Open browser console
4. Navigate your site
5. See detailed GA4 events

### Meta Pixel Helper
1. Install: [Meta Pixel Helper Extension](https://chrome.google.com/webstore)
2. Click extension icon
3. Navigate your site
4. See pixel events firing

---

## 🎨 Adding Custom Tracking

### Example: Track Blog Read Time

```javascript
// In your component
import analytics from '../services/analytics';

useEffect(() => {
  const startTime = Date.now();

  return () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    analytics.trackEvent('blog_read_time', {
      article_title: 'Construction Tips',
      time_spent_seconds: timeSpent
    });
  };
}, []);
```

### Example: Track Form Submission

```javascript
const handleSubmit = (e) => {
  e.preventDefault();

  // Your form logic

  // Track lead
  analytics.trackLead({
    type: 'contact_form',
    value: estimatedProjectValue
  });
};
```

### Example: Track Download

```javascript
const handleDownload = (fileName) => {
  analytics.trackEvent('file_download', {
    file_name: fileName,
    file_type: 'pdf'
  });

  // Your download logic
};
```

---

## 🔒 Privacy & Compliance

### GDPR/CCPA Compliance

**Recommended: Add Cookie Consent Banner**

```javascript
// Install: npm install react-cookie-consent

import CookieConsent from "react-cookie-consent";

<CookieConsent
  location="bottom"
  buttonText="Accept"
  declineButtonText="Decline"
  enableDeclineButton
  onAccept={() => {
    // Enable analytics
    localStorage.setItem('analytics_consent', 'true');
  }}
  onDecline={() => {
    // Disable analytics
    localStorage.setItem('analytics_consent', 'false');
  }}
>
  We use cookies to improve your experience and analyze site traffic.
</CookieConsent>
```

### Disable Analytics Based on Consent

Update `.env`:
```env
# Check consent before enabling
REACT_APP_ANALYTICS_ENABLED=true
```

Update `analytics.js` to check consent:
```javascript
initialize() {
  const consent = localStorage.getItem('analytics_consent');
  if (consent === 'false') return;

  // Rest of initialization...
}
```

---

## 🚀 Production Deployment

### Environment Variables

Create `/client/.env.production`:
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_GA_MEASUREMENT_ID=G-04CDWZJGE9
REACT_APP_META_PIXEL_ID=940175806603175
REACT_APP_ANALYTICS_ENABLED=true
```

### Build Command
```bash
cd /home/oem/projects/ecomm/client
npm run build
```

### Verify Analytics in Production
1. Deploy your build
2. Visit your production site
3. Check browser console for analytics initialization
4. Use GA4 DebugView for real-time testing
5. Check Meta Events Manager Test Events

---

## 📊 Expected Metrics

### Short Term (1-4 weeks)
- Daily active users
- Page views per session
- Calculator usage rate
- Add-to-cart conversion rate
- Checkout abandonment rate

### Medium Term (1-3 months)
- Purchase conversion rate
- Average order value
- Customer lifetime value
- Traffic source performance
- Product popularity

### Long Term (3-6 months)
- Retention rate
- Repeat purchase rate
- ROI from marketing campaigns
- Seasonal trends
- Geographic performance

---

## 🐛 Troubleshooting

### Analytics Not Loading

**Check:**
1. `.env` file has correct IDs
2. Server restarted after `.env` changes
3. Browser console for errors
4. Ad blockers disabled
5. `REACT_APP_ANALYTICS_ENABLED=true`

### Events Not Tracking

**Debug:**
```javascript
// Add to analytics.js methods
console.log('📊 Event tracked:', eventName, eventParams);
```

### Duplicate Events

**Solution:**
- Check if analytics.initialize() called multiple times
- Ensure useEffect dependencies are correct
- Remove duplicate tracking calls

---

## 📚 Resources

- **Google Analytics 4 Docs:** https://developers.google.com/analytics/devguides/collection/ga4
- **Meta Pixel Docs:** https://developers.facebook.com/docs/meta-pixel
- **GA4 Measurement Protocol:** https://developers.google.com/analytics/devguides/collection/protocol/ga4
- **E-commerce Tracking Guide:** https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

---

## ✅ Checklist

- [x] Analytics IDs configured in `.env`
- [x] Analytics service created
- [x] Analytics initialized in App.js
- [x] Page view tracking enabled
- [x] Calculator tracking added
- [x] Product view tracking added
- [x] Add to cart tracking added
- [x] Checkout tracking added
- [x] Purchase tracking added
- [x] Login/Registration tracking added
- [ ] Cookie consent banner (optional)
- [ ] Privacy policy updated
- [ ] Google Search Console linked
- [ ] GA4 conversion goals configured
- [ ] Meta custom conversions created

---

## 🎉 Summary

Your e-commerce platform now has:

✅ **Centralized analytics configuration** (easy to update)
✅ **Complete e-commerce tracking** (view → cart → purchase)
✅ **Calculator engagement tracking**
✅ **User behavior analytics**
✅ **Marketing attribution**
✅ **Conversion funnel visibility**

**All IDs managed in ONE place:** `/client/.env`

**To change tracking IDs:** Just edit `.env` and restart!

---

## 📞 Need Help?

Check the analytics service logs in browser console:
```javascript
// Browser Console
window.gtag  // Google Analytics
window.fbq   // Meta Pixel
```

Happy tracking! 📊🚀
