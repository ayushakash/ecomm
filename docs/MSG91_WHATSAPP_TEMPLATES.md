# MSG91 WhatsApp Templates Setup Guide

This document lists all WhatsApp templates required for the e-commerce notification system.

## Template Creation in MSG91

1. Go to MSG91 Dashboard → WhatsApp → Templates
2. Create each template below with the exact names and variables
3. Wait for Meta/WhatsApp approval (usually 24-48 hours)
4. Copy the template IDs to your `.env` file

---

## CUSTOMER TEMPLATES

### 1. `loginotp` - OTP for Login/Registration (ALREADY CREATED)
**Category:** Authentication (OTP)
**Language:** English
**Status:** APPROVED

```
{{1}} is your verification code. For your security, do not share this code.
```

**Variables:**
- `{{1}}` - OTP code (e.g., "123456")

**Button:**
- Copy Code button with `{{1}}`

---

### 2. `order_confirmation` - Order Placed Successfully
**Category:** Marketing/Utility
**Language:** English

```
Hi {{1}} 👋,

Your order #{{2}} has been placed successfully! 🎉

🛍️ Order Details:
• Items: {{3}}
• Total: ₹{{4}}
• 📍 Delivery Address: {{5}}

📦 Track your order on our app.

```

**Variables:**
- `{{1}}` - Customer name
- `{{2}}` - Order number
- `{{3}}` - Item summary (e.g., "2x Cement, 1x Steel Rod")
- `{{4}}` - Total amount
- `{{5}}` - Delivery address
- `{{6}}` - Expected delivery date

---

### 3. `order_dispatched` - Order Shipped
**Category:** Utility
**Language:** English

```
Hi {{1}} 😊,

Good news! Your order #{{2}} has been shipped 🚚

Follow its journey in our app for live updates 📲✨

```

**Variables:**
- `{{1}}` - Customer name
- `{{2}}` - Order number
- `{{3}}` - Merchant/Seller name
- `{{4}}` - Tracking info or "Contact seller"
- `{{5}}` - Expected delivery date

---

### 4. `order_delivered` - Order Delivered
**Category:** Utility
**Language:** English

```
Hi {{1}} 👋,

Your order #{{2}} has been delivered successfully! 📦✨

Thank you for choosing Chardeevari 🧱

If you’re satisfied with your purchase, we’d truly appreciate a quick review.
```

**Variables:**
- `{{1}}` - Customer name
- `{{2}}` - Order number
- `{{3}}` - Merchant name
- `{{4}}` - Delivery time

---

## MERCHANT TEMPLATES

> **Note:** Merchants use the same `loginotp` template for OTP verification (login/signup)

### 5. `merchant_new_order` - New Order Alert (WITH BUTTONS)
**Category:** Utility
**Language:** English

```
🆕 New Order Alert!

Order #{{1}}
Customer: {{2}}
Location: {{3}} ({{4}} km away)

Items:
{{5}}

Total: ₹{{6}}

⏰ Respond within 5 minutes
```

**Variables:**
- `{{1}}` - Order number
- `{{2}}` - Customer name
- `{{3}}` - Delivery area
- `{{4}}` - Distance in km
- `{{5}}` - Item list
- `{{6}}` - Order total

**Interactive Buttons (Quick Reply):**
- Button 1: `✅ Accept` → Payload: `ACCEPT_{{order_id}}_{{item_id}}`
- Button 2: `❌ Reject` → Payload: `REJECT_{{order_id}}_{{item_id}}`

---

### 6. `merchant_order_accepted` - Order Acceptance Confirmation
**Category:** Utility
**Language:** English

```
✅ Order Accepted!

📦 Order #{{1}} assigned to you

👤 Customer: {{2}}
📍 Address: {{3}}
📞 Phone: {{4}}

🛠️ Items:
- {{5}}

Ensure all items are packed and ready for delivery. 🚚
```

**Variables:**
- `{{1}}` - Order number
- `{{2}}` - Customer name
- `{{3}}` - Full delivery address
- `{{4}}` - Customer phone

---

## ALTERNATIVE: URL-BASED BUTTONS (If Interactive Buttons Not Approved)

If Meta doesn't approve interactive button templates, use URL buttons:

### `merchant_new_order_url` - New Order with URL Buttons
**Category:** Utility
**Language:** English

```
🆕 New Order Alert!

Order #{{1}}
Customer: {{2}}
Location: {{3}} ({{4}} km away)

Items:
{{5}}

Total: ₹{{6}}

Click to respond:
```

**URL Buttons:**
- Button 1: `Accept Order` → URL: `{{7}}`
- Button 2: `Reject Order` → URL: `{{8}}`

**Variables:**
- `{{7}}` - Accept URL: `https://yourapp.com/api/merchant/order-response?action=accept&orderId=xxx&itemId=xxx&token=xxx`
- `{{8}}` - Reject URL: `https://yourapp.com/api/merchant/order-response?action=reject&orderId=xxx&itemId=xxx&token=xxx`

---

## ENV CONFIGURATION

After creating templates, add the IDs to your `.env`:

```env
# Customer Templates
MSG91_WA_CUSTOMER_OTP_TEMPLATE=your_template_id
MSG91_WA_ORDER_CONFIRMATION_TEMPLATE=your_template_id
MSG91_WA_ORDER_DISPATCHED_TEMPLATE=your_template_id
MSG91_WA_ORDER_DELIVERED_TEMPLATE=your_template_id

# Merchant Templates
MSG91_WA_MERCHANT_OTP_TEMPLATE=your_template_id
MSG91_WA_MERCHANT_NEW_ORDER_TEMPLATE=your_template_id
MSG91_WA_MERCHANT_ORDER_ACCEPTED_TEMPLATE=your_template_id
```

---

## MSG91 WEBHOOK SETUP (For Button Callbacks)

1. Go to MSG91 Dashboard → WhatsApp → Settings → Webhooks
2. Add callback URL: `https://yourdomain.com/api/webhooks/msg91-whatsapp`
3. Select events: `message_received`, `button_clicked`
4. Copy the webhook secret for verification

---

## NOTES

1. **Template Approval Time**: WhatsApp/Meta typically takes 24-48 hours to approve templates
2. **Interactive Buttons**: Require separate approval and may take longer
3. **OTP Templates**: Usually approved faster as they're in the "Authentication" category
4. **Variable Placeholders**: MSG91 uses `{{1}}`, `{{2}}` format (numbered)
5. **Character Limits**: Keep messages under 1024 characters
6. **Testing**: Use MSG91's test feature before going live
