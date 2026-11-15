const XLSX = require('xlsx');

/**
 * Parse a billing-app "Sales Report" export (.xls / .xlsx / .csv) into bills.
 * Columns are located by header text, so column order and extra title rows don't matter.
 */

const HEADERS = {
  billNo: /^(inv(oice)?\.? ?no\.?|bill ?no\.?|invoice number)$/i,
  date: /^(date|inv(oice)? date|bill date)$/i,
  party: /^(party ?name|customer( name)?|name)$/i,
  phone: /(phone|mobile|contact)/i,
  type: /^(txn|transaction) ?type$/i,
  total: /^(total|total amount|amount)$/i,
  received: /^(received|paid|amount received)$/i,
  balance: /^(bal\.?|balance|balance due|due)$/i,
};

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MONTH_NAMES = Object.keys(MONTHS).map((m) => m[0].toUpperCase() + m.slice(1));

/** 10-digit Indian mobile from "+91 98765-43210", "09876543210", 9876543210; else null. */
const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

/** "₹ 20,620" / "20620.5" → 20620.5 */
const parseAmount = (value) => {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/** "15 Nov 26" / "15-Nov-2026" / "15/11/2026" → "2026-11-15" (null if unreadable). */
const parseDate = (value) => {
  const s = String(value ?? '').trim();
  let d, m, y;
  let match = s.match(/^(\d{1,2})[\s\-/.]([A-Za-z]{3})[A-Za-z]*[\s\-/.,]+(\d{2,4})$/);
  if (match) {
    [, d, m, y] = match;
    m = MONTHS[m.toLowerCase()];
  } else if ((match = s.match(/^(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{2,4})$/))) {
    [, d, m, y] = match;
    m = Number(m) - 1;
  } else {
    return null;
  }
  y = Number(y) < 100 ? 2000 + Number(y) : Number(y);
  d = Number(d);
  if (m === undefined || m < 0 || m > 11 || d < 1 || d > 31) return null;
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/** "2026-11-15" → "15 Nov 2026" */
const dateLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
};

/** "20620" → "20,620" (Indian grouping, no decimals unless needed). */
const formatAmount = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Unique identity of a bill across uploads; bill numbers can restart each financial year. */
const billKey = (billNo, isoDate) => `${String(billNo).trim()}|${isoDate}`;

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cells = rows[i].map((c) => String(c).trim());
    const col = {};
    for (const [field, re] of Object.entries(HEADERS)) {
      const idx = cells.findIndex((c) => re.test(c));
      if (idx >= 0) col[field] = idx;
    }
    if (col.billNo !== undefined && col.date !== undefined && col.phone !== undefined && col.total !== undefined) {
      return { index: i, col };
    }
  }
  return null;
}

/**
 * @returns {{ bills: object[], rowsRead: number }} — one entry per sale bill.
 * Bills without a valid phone are returned with phone=null so the admin can see why they're skipped.
 * @throws Error with a user-facing message when the file isn't a readable sales report.
 */
function parseBillReport(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } catch {
    throw new Error('Could not read the file. Upload the sales report exported as Excel (.xls/.xlsx) or CSV.');
  }
  // Prefer the "Sales Report" sheet; fall back to the first sheet that has the needed columns.
  const names = [...workbook.SheetNames].sort((a, b) => (/sales report/i.test(b) ? 1 : 0) - (/sales report/i.test(a) ? 1 : 0));
  for (const name of names) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '' });
    const header = findHeader(rows);
    if (!header) continue;
    const { col } = header;
    const bills = [];
    for (const row of rows.slice(header.index + 1)) {
      const billNo = String(row[col.billNo] ?? '').trim();
      const iso = parseDate(row[col.date]);
      if (!billNo || !iso) continue; // blank/total/footer rows
      const type = col.type !== undefined ? String(row[col.type]).toUpperCase() : 'SALE';
      if (!type.includes('SALE') || type.includes('RETURN')) continue; // only sale invoices
      const total = parseAmount(row[col.total]);
      const received = col.received !== undefined ? parseAmount(row[col.received]) : total;
      const balance = col.balance !== undefined ? parseAmount(row[col.balance]) : Math.max(0, total - received);
      bills.push({
        key: billKey(billNo, iso),
        billNo,
        billDate: iso,
        dateLabel: dateLabel(iso),
        partyName: col.party !== undefined ? String(row[col.party]).trim().slice(0, 80) : '',
        phone: normalizePhone(row[col.phone]),
        total,
        received,
        balance,
      });
    }
    return { bills, rowsRead: rows.length };
  }
  throw new Error('This file has no sales bills. It needs columns for Bill/Inv No., Date, Phone and Total.');
}

module.exports = { parseBillReport, normalizePhone, formatAmount, billKey, dateLabel };
