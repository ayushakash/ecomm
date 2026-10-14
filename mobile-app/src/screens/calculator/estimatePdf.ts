/**
 * Estimate PDF: port of the web jsPDF report (Calculator.generatePDF) as HTML
 * rendered by expo-print, then shared with expo-sharing.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WEBSITE_URL } from '../../config';
import type { CityPriceMaterial, CityPricesResponse } from '../../types/models';
import { formatNumber, type CalculationResult, type MaterialLine } from './calculatorMath';

const SOCIAL_MEDIA_LINKS = {
  facebook: 'https://www.facebook.com/ChardeevariConstruction',
  instagram: 'https://www.instagram.com/chardeevari.in/',
  linkedin: 'https://www.linkedin.com/company/chardeevari/',
  twitter: 'https://x.com/Chardeevari_in',
  email: 'chardeevari.construction@gmail.com',
};
const CONTACT_PHONE = '+91 6201176610';

export interface EstimatePdfInput {
  name: string;
  phone: string;
  city: string;
  pricingMode: 'market' | 'custom';
  cityPrices: CityPricesResponse | null;
  results: CalculationResult;
}

const esc = (s: string | number): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

function materialRow(
  name: string,
  line: MaterialLine,
  unitLabel: string,
  key: CityPriceMaterial,
  { pricingMode, cityPrices }: Pick<EstimatePdfInput, 'pricingMode' | 'cityPrices'>,
): string {
  const brands = pricingMode === 'market' ? cityPrices?.prices?.[key]?.brands : undefined;
  const note = brands && brands.length > 0 ? `(${brands.join(', ')})` : '(using standard pricing)';
  return `
    <tr>
      <td><b>${esc(name)}</b><div class="note">${esc(note)}</div></td>
      <td>${esc(formatNumber(line.quantity))} ${esc(unitLabel)}</td>
      <td>Rs ${esc(formatNumber(line.pricePerUnit))}/${esc(unitLabel.split(' ')[0])}</td>
      <td class="r">Rs ${esc(formatNumber(line.cost))}</td>
    </tr>`;
}

export function buildEstimateHtml(input: EstimatePdfInput): string {
  const { name, phone, city, pricingMode, cityPrices, results } = input;
  const s = results.structureMaterials;
  const f = results.foundationMaterials;
  const ctx = { pricingMode, cityPrices };
  const social = [
    ['f', '#3b5998', SOCIAL_MEDIA_LINKS.facebook],
    ['i', '#e1306c', SOCIAL_MEDIA_LINKS.instagram],
    ['in', '#0077b5', SOCIAL_MEDIA_LINKS.linkedin],
    ['X', '#1da1f2', SOCIAL_MEDIA_LINKS.twitter],
  ]
    .map(([l, c, u]) => `<a class="soc" style="background:${c}" href="${u}">${l}</a>`)
    .join('');
  const priceNote =
    pricingMode === 'market' && cityPrices
      ? `* Prices based on ${esc(cityPrices.merchantCount)} verified merchants in ${esc(city)}`
      : '* Prices are standard estimates and may vary based on market conditions';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #000; margin: 0; font-size: 12px; }
  .top { background: #1e293b; color: #fff; padding: 18px 28px; display: flex; align-items: center; gap: 14px; }
  .top img { width: 64px; height: 36px; object-fit: contain; background: #fff; border-radius: 4px; padding: 2px; }
  .brand { font-size: 24px; font-weight: bold; letter-spacing: 1px; }
  .sub { font-size: 11px; opacity: .9; margin-top: 2px; }
  .contact { background: #f8fafc; color: #334155; padding: 8px 28px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; border-bottom: 1px solid #cbd5e1; }
  .contact a { color: #334155; text-decoration: none; }
  .soc { display: inline-block; width: 18px; height: 18px; line-height: 18px; border-radius: 9px; color: #fff !important; text-align: center; font-weight: bold; font-size: 8px; margin-left: 10px; }
  .wrap { padding: 16px 28px; }
  h2 { font-size: 16px; margin: 16px 0 8px; }
  h3 { font-size: 13px; margin: 14px 0 6px; letter-spacing: .5px; }
  p.kv { margin: 3px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td:nth-child(1) { width: 36%; } td:nth-child(2) { width: 22%; } td:nth-child(3) { width: 24%; } td:nth-child(4) { width: 18%; }
  td { padding: 5px 0; vertical-align: top; font-size: 12px; }
  td.r { text-align: right; }
  .note { font-size: 9px; color: #646464; margin-top: 1px; }
  .sub-total td { font-weight: bold; padding-top: 8px; }
  .total { border-top: 1px solid #000; margin-top: 14px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 17px; font-weight: bold; }
  .total .amt { color: #228b22; }
  .disc { margin-top: 18px; font-size: 9px; font-style: italic; color: #64748b; line-height: 1.5; }
</style></head>
<body>
  <div class="top">
    <img src="${WEBSITE_URL}/logo.webp" onerror="this.style.display='none'" />
    <div><div class="brand">CHARDEEVARI</div><div class="sub">Construction Material Estimate</div></div>
  </div>
  <div class="contact">
    <div>
      <div><a href="mailto:${SOCIAL_MEDIA_LINKS.email}">Email: ${SOCIAL_MEDIA_LINKS.email}</a></div>
      <div><a href="tel:${CONTACT_PHONE.replace(/\s/g, '')}">Phone: ${CONTACT_PHONE}</a></div>
    </div>
    <div>${social}</div>
  </div>
  <div class="wrap">
    <h2>Customer Details</h2>
    <p class="kv">Name: ${esc(name)}</p>
    <p class="kv">Phone: ${esc(phone)}</p>
    <p class="kv">Date: ${esc(new Date().toLocaleDateString('en-IN'))}</p>

    <h2>Project Details</h2>
    <p class="kv">Location: ${esc(city)}</p>
    <p class="kv">Dimensions: ${esc(results.length)} ft × ${esc(results.breadth)} ft</p>
    <p class="kv">Built-up Area: ${esc(results.area)} sq.ft</p>
    <p class="kv">Number of Floors: ${esc(results.floors)}</p>
    <p class="kv">Columns Required: ${esc(results.columns)} (${esc(results.colsX)} × ${esc(results.colsY)} grid)</p>

    <h2>Material Requirements &amp; Cost</h2>
    <h3>STRUCTURE MATERIALS</h3>
    <table>
      ${materialRow('Cement', s.cement, 'bags (50kg)', 'cement', ctx)}
      ${materialRow('Steel (TMT Bars)', s.steel, 'kg', 'steel', ctx)}
      ${materialRow('Sand (M-Sand)', s.sand, 'cu.ft', 'sand', ctx)}
      ${materialRow('Aggregate (20mm)', s.aggregate, 'cu.ft', 'aggregate', ctx)}
      ${materialRow('Bricks', s.bricks, 'nos', 'bricks', ctx)}
      <tr class="sub-total"><td></td><td></td><td>Structure Subtotal:</td><td class="r">Rs ${esc(formatNumber(s.totalCost))}</td></tr>
    </table>
    ${
      f
        ? `<h3>FOUNDATION MATERIALS</h3>
    <table>
      ${materialRow('Cement', f.cement, 'bags (50kg)', 'cement', ctx)}
      ${materialRow('Steel', f.steel, 'kg', 'steel', ctx)}
      ${materialRow('Sand', f.sand, 'cu.ft', 'sand', ctx)}
      ${materialRow('Aggregate', f.aggregate, 'cu.ft', 'aggregate', ctx)}
      <tr class="sub-total"><td></td><td></td><td>Foundation Subtotal:</td><td class="r">Rs ${esc(formatNumber(f.totalCost))}</td></tr>
    </table>`
        : ''
    }
    <div class="total"><span>TOTAL ESTIMATED COST</span><span class="amt">Rs ${esc(formatNumber(results.totalCost))}</span></div>
    <div class="disc">
      ${priceNote}<br />
      * Actual requirements may vary based on design, wastage, and site conditions<br />
      * This is a preliminary estimate. Final quantities should be verified by a civil engineer.
    </div>
  </div>
</body></html>`;
}

/** Render the estimate to a PDF and open the share sheet (print dialog where sharing is unavailable). */
export async function shareEstimatePdf(input: EstimatePdfInput): Promise<void> {
  const html = buildEstimateHtml(input);
  if (!(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Chardeevari_Estimate_${input.name.replace(/\s/g, '_')}.pdf`,
  });
}
