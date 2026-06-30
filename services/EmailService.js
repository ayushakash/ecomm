const nodemailer = require('nodemailer');

// ─── Transporter ────────────────────────────────────────────────────────────

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for port 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const isSmtpConfigured = () =>
  !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const FROM = () =>
  `"Chardeevari" <${process.env.SMTP_USER || 'noreply@chardeevari.com'}>`;

// ─── Base send function ──────────────────────────────────────────────────────

/**
 * Core send function. All other methods call this.
 * @param {string|string[]} to - recipient email(s)
 * @param {string} subject
 * @param {string} html
 * @returns {{ success: boolean, channel: string, error?: string }}
 */
const send = async (to, subject, html) => {
  if (!isSmtpConfigured()) {
    console.log(`[EmailService MOCK] To: ${to} | Subject: ${subject}`);
    return { success: true, channel: 'mock' };
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({ from: FROM(), to, subject, html });
    return { success: true, channel: 'email' };
  } catch (error) {
    console.error('[EmailService] Send failed:', error.message);
    return { success: false, error: error.message, channel: 'email' };
  }
};

// ─── Email Templates ─────────────────────────────────────────────────────────

const layout = (content) => `
  <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
    <div style="background: #334155; padding: 20px 32px; text-align: center;">
      <img src="https://uat.chardeevari.in/logo.png" alt="Chardeevari" height="48"
           style="display: inline-block; max-height: 48px; object-fit: contain;" />
      <h1 style="color: #fff; margin: 8px 0 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">Chardeevari</h1>
    </div>
    <div style="padding: 32px; background: #fff;">
      ${content}
    </div>
    <div style="padding: 16px 32px; background: #f1f5f9; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Chardeevari · Ranchi, Jharkhand ·
        <a href="https://chardeevari.com" style="color: #64748b;">chardeevari.com</a>
      </p>
    </div>
  </div>
`;

const btn = (text, url) => `
  <a href="${url}" style="display: inline-block; background: #334155; color: #fff; text-decoration: none;
     padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px;">
    ${text}
  </a>
`;

// ─── Transactional Emails ────────────────────────────────────────────────────

const EmailService = {

  /**
   * Send OTP for email verification / change
   */
  async sendOTP(email, otp, purpose = 'email_change') {
    const subjects = {
      email_change: 'Verify your new email address',
      email_verify: 'Verify your email address',
    };

    const html = layout(`
      <h2 style="color: #1e293b; margin-top: 0;">Email Verification</h2>
      <p style="color: #475569;">Use the code below to verify your email. It expires in <strong>10 minutes</strong>.</p>
      <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px;
                  padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #334155;">
          ${otp}
        </span>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    `);

    return send(email, subjects[purpose] || 'Your verification code', html);
  },

  /**
   * Send order confirmation to customer
   */
  async sendOrderConfirmation(email, { orderId, customerName, items, total, deliveryAddress }) {
    const itemRows = items.map(item => `
      <tr>
        <td style="padding: 8px 0; color: #374151; border-bottom: 1px solid #f3f4f6;">${item.name}</td>
        <td style="padding: 8px 0; text-align: center; color: #6b7280; border-bottom: 1px solid #f3f4f6;">${item.quantity} ${item.unit}</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const html = layout(`
      <h2 style="color: #1e293b; margin-top: 0;">Order Confirmed!</h2>
      <p style="color: #475569;">Hi ${customerName}, your order <strong>#${orderId}</strong> has been placed successfully.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="text-align: left; color: #6b7280; font-size: 12px; padding-bottom: 8px; text-transform: uppercase;">Item</th>
            <th style="text-align: center; color: #6b7280; font-size: 12px; padding-bottom: 8px; text-transform: uppercase;">Qty</th>
            <th style="text-align: right; color: #6b7280; font-size: 12px; padding-bottom: 8px; text-transform: uppercase;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding-top: 12px; font-weight: 700; color: #111827;">Total</td>
            <td style="padding-top: 12px; text-align: right; font-weight: 700; font-size: 18px; color: #334155;">₹${total}</td>
          </tr>
        </tfoot>
      </table>
      <p style="color: #475569; font-size: 14px;"><strong>Delivery to:</strong><br>${deliveryAddress}</p>
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">We will notify you when your order is out for delivery.</p>
    `);

    return send(email, `Order Confirmed – #${orderId}`, html);
  },

  /**
   * Send welcome email on registration
   */
  async sendWelcome(email, name) {
    const html = layout(`
      <h2 style="color: #1e293b; margin-top: 0;">Welcome to Chardeevari, ${name}!</h2>
      <p style="color: #475569;">
        We're glad you're here. Chardeevari is your trusted source for construction materials
        delivered right to your site in Ranchi.
      </p>
      <ul style="color: #475569; padding-left: 20px; line-height: 1.8;">
        <li>Browse cement, steel, sand, aggregates and more</li>
        <li>Get transparent pricing with GST breakdown</li>
        <li>Use the Materials Calculator to plan your build</li>
        <li>Track orders in real time</li>
      </ul>
      ${btn('Start Shopping', 'https://chardeevari.com/products')}
    `);

    return send(email, 'Welcome to Chardeevari!', html);
  },

  /**
   * Send order status update
   */
  async sendOrderStatusUpdate(email, { customerName, orderId, status, message }) {
    const statusLabels = {
      confirmed: 'Order Confirmed',
      processing: 'Being Prepared',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    const html = layout(`
      <h2 style="color: #1e293b; margin-top: 0;">Order Update</h2>
      <p style="color: #475569;">Hi ${customerName}, here's an update on order <strong>#${orderId}</strong>.</p>
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 700; color: #065f46;">${statusLabels[status] || status}</p>
        ${message ? `<p style="margin: 8px 0 0; color: #047857; font-size: 14px;">${message}</p>` : ''}
      </div>
    `);

    return send(email, `Order #${orderId} – ${statusLabels[status] || status}`, html);
  },

  /**
   * Notify the admin/ops team that a new order was placed.
   * @param {Object} order - the Mongoose Order document
   * @param {string} [adminEmail] - defaults to ADMIN_EMAIL or SMTP_USER
   */
  async sendNewOrderToAdmin(order, adminEmail) {
    const to = adminEmail || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (!to) {
      console.warn('[EmailService] No admin email configured — skipping new-order alert');
      return { success: false, error: 'no admin email', channel: 'email' };
    }

    const items = order.items || [];
    const itemRows = items.map(item => `
      <tr>
        <td style="padding: 8px 0; color: #374151; border-bottom: 1px solid #f3f4f6;">${item.productName}${item.variantLabel && item.variantLabel !== 'none' ? ` <span style="color:#9ca3af;">(${item.variantLabel})</span>` : ''}</td>
        <td style="padding: 8px 0; text-align: center; color: #6b7280; border-bottom: 1px solid #f3f4f6;">${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6;">₹${(item.unitPrice || 0) * item.quantity}</td>
      </tr>
    `).join('');

    const html = layout(`
      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 700; color: #9a3412;">🛎️ New Order Received</p>
      </div>
      <h2 style="color: #1e293b; margin-top: 0;">Order #${order.orderNumber}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px;">
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding-top: 12px; font-weight: 700; color: #111827;">Total</td>
            <td style="padding-top: 12px; text-align: right; font-weight: 700; font-size: 18px; color: #334155;">₹${order.totalAmount}</td>
          </tr>
        </tfoot>
      </table>
      <p style="color: #475569; font-size: 14px; line-height: 1.7;">
        <strong>Customer:</strong> ${order.customerName || '—'} (${order.customerPhone || '—'})<br>
        <strong>Payment:</strong> ${(order.paymentMethod || '').toUpperCase()}<br>
        <strong>Deliver to:</strong> ${order.customerAddress || '—'}${order.customerArea ? `, ${order.customerArea}` : ''}
      </p>
      ${btn('Open Admin Dashboard', 'https://chardeevari.in/admin/orders')}
    `);

    return send(to, `🛎️ New Order #${order.orderNumber} – ₹${order.totalAmount}`, html);
  },

  /**
   * Send a campaign / bulk email to a list of recipients.
   * Sends individually so each gets a personal email (no CC leak).
   * For large campaigns use a proper bulk provider (Brevo, SendGrid).
   * @param {string[]} emails
   * @param {string} subject
   * @param {string} html - can use {{name}} placeholder
   * @param {Object[]} [recipients] - [{ email, name }] for personalisation
   */
  async sendCampaign(emails, subject, html, recipients = []) {
    const results = { sent: 0, failed: 0, errors: [] };

    for (const email of emails) {
      const recipient = recipients.find(r => r.email === email);
      const personalised = recipient?.name
        ? html.replace(/\{\{name\}\}/g, recipient.name)
        : html;

      const result = await send(email, subject, personalised);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ email, error: result.error });
      }

      // Small delay to avoid SMTP rate limits
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[EmailService] Campaign done: ${results.sent} sent, ${results.failed} failed`);
    return results;
  },

  /**
   * Generic send — use this when none of the above templates fit
   */
  send,
};

module.exports = EmailService;
