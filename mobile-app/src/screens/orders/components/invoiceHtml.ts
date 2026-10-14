/**
 * GST tax invoice markup. Port of client/src/components/modals/GSTInvoicePreview.js
 * (same seller block, sections, CGST/SGST split, amount in words and terms) as a
 * standalone HTML document for the WebView preview and expo-print.
 */
import type { Order } from '../../../types/models';
import { formatAmount, getDeliveryAddress, getItemLineTotal, isGstExclusive, numberToWords } from './orderUtils';

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const amount = (value: number) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildInvoiceHtml(order: Order): string {
  const address = getDeliveryAddress(order);
  const customerEmail = order.customerId && typeof order.customerId === 'object' ? order.customerId.email : undefined;
  const gst = order.tax || 0;
  // Web assumes a GST-inclusive subtotal; exclusive-mode orders store it pre-GST.
  const exclusive = isGstExclusive(order);
  const taxable = exclusive ? order.subtotal || 0 : order.subtotalBeforeGST ?? (order.subtotal || 0) - gst;
  const subtotalInclusive = exclusive ? (order.subtotal || 0) + gst : order.subtotal || 0;
  const grandTotal = order.totalAmount || 0;

  const billTo = address
    ? [
        `<p class="strong">${escapeHtml(address.fullName || order.customerName)}</p>`,
        `<p>${escapeHtml(address.addressLine1)}</p>`,
        address.addressLine2 ? `<p>${escapeHtml(address.addressLine2)}</p>` : '',
        address.landmark ? `<p>Landmark: ${escapeHtml(address.landmark)}</p>` : '',
        `<p>${escapeHtml(address.area)}, ${escapeHtml(address.city)}</p>`,
        `<p>${escapeHtml(address.state)} - ${escapeHtml(address.pincode)}</p>`,
      ].join('')
    : `<p class="strong">${escapeHtml(order.customerName)}</p><p>${escapeHtml(order.customerAddress)}${
        order.customerArea ? `, ${escapeHtml(order.customerArea)}` : ''
      }</p>`;

  const rows = (order.items ?? [])
    .map(
      (item, index) => `<tr>
        <td>${index + 1}</td>
        <td class="strong">${escapeHtml(item.productName)}</td>
        <td class="c">${escapeHtml(item.sku || 'N/A')}</td>
        <td class="c strong">${escapeHtml(item.quantity)}</td>
        <td class="c">${escapeHtml(item.unit || 'unit')}</td>
        <td class="r">${amount(item.unitPrice)}</td>
        <td class="r strong">${amount(getItemLineTotal(item))}</td>
      </tr>`,
    )
    .join('');

  const totalRow = (label: string, value: number, cls = '') =>
    `<div class="total-row ${cls}"><span>${label}</span><span>${formatAmount(value)}</span></div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GST Invoice - ${escapeHtml(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; }
  .invoice { max-width: 800px; margin: 0 auto; }
  p { margin: 2px 0; }
  .header { text-align: center; border-bottom: 4px solid #1e293b; padding-bottom: 16px; margin-bottom: 16px; }
  .company { font-size: 26px; font-weight: 800; color: #334155; margin: 0 0 4px; }
  .muted { color: #64748b; font-size: 12px; }
  h2 { font-size: 20px; margin: 0 0 12px; }
  h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #475569; margin: 0 0 6px; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; }
  .grid > div { flex: 1 1 240px; }
  .kv { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
  .kv span:first-child { color: #64748b; }
  .strong { font-weight: 700; }
  .table-wrap { overflow-x: auto; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #334155; color: #fff; padding: 8px 6px; text-align: left; border: 1px solid #cbd5e1; }
  td { padding: 8px 6px; border: 1px solid #cbd5e1; vertical-align: top; }
  .c { text-align: center; } .r { text-align: right; }
  .totals { margin-left: auto; max-width: 340px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
  .total-row span:last-child { font-weight: 600; }
  .total-row.sub { border-bottom: 2px solid #94a3b8; }
  .total-row.grand { border-top: 2px solid #1e293b; border-bottom: none; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 800; }
  .words { margin-top: 10px; padding: 10px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; }
  .words p:first-child { font-size: 11px; font-weight: 700; color: #b45309; }
  .words p:last-child { font-weight: 700; }
  .terms { border-top: 2px solid #cbd5e1; margin-top: 20px; padding-top: 14px; }
  .terms ol { margin: 0; padding-left: 18px; color: #475569; font-size: 11px; }
  .sign { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #cbd5e1; margin-top: 20px; padding-top: 14px; }
  .line { border-top: 1px solid #94a3b8; width: 160px; margin-top: 40px; }
  .footer { text-align: center; border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 14px; }
</style></head>
<body><div class="invoice">
  <div class="header">
    <p class="company">CharDeevaari</p>
    <p class="muted">E-Commerce Platform for Building Materials</p>
    <p class="muted">Address: Business Tower, Tech Park, Bangalore - 560001<br/>
    Email: support@chardeevari.in | Phone: +91-8069772324<br/>
    <b>GSTIN: 29ABCDE1234F1Z5</b></p>
  </div>

  <h2>TAX INVOICE</h2>
  <div class="grid">
    <div>
      <h3>Invoice Details</h3>
      <div class="kv"><span>Invoice No:</span><span class="strong">${escapeHtml(order.orderNumber)}</span></div>
      <div class="kv"><span>Invoice Date:</span><span class="strong">${escapeHtml(new Date(order.createdAt).toLocaleDateString('en-IN'))}</span></div>
      <div class="kv"><span>Payment Method:</span><span class="strong">${escapeHtml(order.paymentMethod?.toUpperCase() || 'COD')}</span></div>
      <div class="kv"><span>Payment Status:</span><span class="strong">${escapeHtml(!order.paymentStatus || order.paymentStatus === 'pending' ? 'PAY ON DELIVERY' : order.paymentStatus.toUpperCase())}</span></div>
    </div>
    <div>
      <h3>Bill To</h3>
      ${billTo}
      <p style="margin-top:6px">Phone: ${escapeHtml(order.customerPhone)}</p>
      ${customerEmail ? `<p>Email: ${escapeHtml(customerEmail)}</p>` : ''}
    </div>
  </div>

  <div class="table-wrap"><table>
    <thead><tr><th>S.No</th><th>Item Description</th><th class="c">HSN/SAC</th><th class="c">Qty</th><th class="c">Unit</th><th class="r">Rate (₹)</th><th class="r">Amount (₹)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>

  <div class="totals">
    ${totalRow('Taxable Amount (Base):', taxable)}
    ${totalRow('CGST @ 9%:', gst / 2)}
    ${totalRow('SGST @ 9%:', gst / 2)}
    ${totalRow('Subtotal (Inc. GST):', subtotalInclusive, 'sub')}
    ${order.deliveryCharge > 0 ? totalRow('Delivery Charges:', order.deliveryCharge) : ''}
    ${(order.platformFee ?? 0) > 0 ? totalRow('Platform Fee:', order.platformFee ?? 0) : ''}
    ${totalRow('Grand Total:', grandTotal, 'grand')}
    <div class="words"><p>Total Amount (In Words):</p><p>${numberToWords(Math.round(grandTotal))} Rupees Only</p></div>
  </div>

  <div class="terms">
    <h3>Terms &amp; Conditions:</h3>
    <ol>
      <li>Goods once sold will not be taken back or exchanged.</li>
      <li>All disputes are subject to Bangalore jurisdiction only.</li>
      <li>Payment should be made within 7 days from the date of invoice.</li>
      <li>Interest @ 18% p.a. will be charged on delayed payments.</li>
      <li>This is a computer-generated invoice and does not require a signature.</li>
    </ol>
  </div>

  <div class="sign">
    <div><p class="muted">Customer Signature</p><div class="line"></div></div>
    <div style="text-align:right"><p class="strong">For CharDeevaari</p><div class="line" style="margin-left:auto"></div><p class="muted">Authorized Signatory</p></div>
  </div>

  <div class="footer">
    <p class="muted">This is a computer-generated invoice. For any queries, please contact our support team.</p>
    <p class="muted">Generated on: ${escapeHtml(new Date().toLocaleString('en-IN'))}</p>
  </div>
</div></body></html>`;
}
