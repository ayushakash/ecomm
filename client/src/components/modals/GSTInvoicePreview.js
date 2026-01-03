import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const GSTInvoicePreview = ({ show, onHide, order }) => {
  if (!show || !order) return null;

  const handleDownload = () => {
    // Create a printable version
    const printContent = document.getElementById('gst-invoice-content');
    const originalContents = document.body.innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');

    printWindow.document.write('<html><head><title>GST Invoice - ' + order.orderNumber + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; padding: 20px; }
      .invoice-container { max-width: 800px; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
      .company-name { font-size: 28px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
      .invoice-title { font-size: 24px; font-weight: bold; margin: 20px 0; }
      .info-section { margin-bottom: 20px; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
      .label { font-weight: bold; color: #555; }
      .value { color: #000; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background-color: #1e40af; color: white; padding: 12px; text-align: left; font-weight: bold; }
      td { padding: 10px; border-bottom: 1px solid #ddd; }
      .text-right { text-align: right; }
      .totals-section { margin-top: 20px; float: right; width: 300px; }
      .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
      .grand-total { border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: bold; }
      .footer { margin-top: 50px; text-align: center; border-top: 2px solid #333; padding-top: 20px; }
      .terms { font-size: 12px; color: #666; margin-top: 20px; }
      @media print {
        .no-print { display: none; }
      }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const deliveryAddress = order.deliveryAddressId || {};
  const invoiceDate = new Date(order.createdAt);

  // Calculate GST breakdown
  const calculateGST = () => {
    const gstRate = 18; // Default GST rate
    const subtotalInclusive = order.subtotal || 0; // This includes GST
    const gstAmount = order.tax || 0; // Total GST amount
    const taxableAmount = subtotalInclusive - gstAmount; // Base amount before GST
    const cgst = gstAmount / 2; // CGST @ 9%
    const sgst = gstAmount / 2; // SGST @ 9%

    return {
      taxableAmount, // Base amount (before GST)
      subtotalInclusive, // Amount including GST
      cgst,
      sgst,
      totalGST: gstAmount,
      grandTotal: order.totalAmount
    };
  };

  const gstBreakdown = calculateGST();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">GST Tax Invoice</h2>
            <p className="text-blue-100 text-sm">#{order.orderNumber}</p>
          </div>
          <button
            onClick={onHide}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Invoice Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div id="gst-invoice-content">
            {/* Company Header */}
            <div className="text-center border-b-4 border-gray-800 pb-6 mb-6">
              <h1 className="text-3xl font-bold text-blue-700 mb-2">CharDeevaari</h1>
              <p className="text-gray-600">E-Commerce Platform for Building Materials</p>
              <p className="text-sm text-gray-500 mt-2">
                Address: Business Tower, Tech Park, Bangalore - 560001<br />
                Email: support@chardeevari.in | Phone: +91-8069772324<br />
                <span className="font-semibold">GSTIN: 29ABCDE1234F1Z5</span>
              </p>
            </div>

            {/* Invoice Title & Details */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">TAX INVOICE</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase">Invoice Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice No:</span>
                      <span className="font-semibold">{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Date:</span>
                      <span className="font-semibold">{invoiceDate.toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-semibold">{order.paymentMethod?.toUpperCase() || 'COD'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className="font-semibold">{order.paymentStatus?.toUpperCase() || 'PENDING'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase">Bill To</h3>
                  <div className="text-sm">
                    <p className="font-bold text-gray-800">{deliveryAddress.fullName || order.customerName}</p>
                    <p className="text-gray-600">{deliveryAddress.addressLine1}</p>
                    {deliveryAddress.addressLine2 && <p className="text-gray-600">{deliveryAddress.addressLine2}</p>}
                    {deliveryAddress.landmark && <p className="text-gray-600">Landmark: {deliveryAddress.landmark}</p>}
                    <p className="text-gray-600">{deliveryAddress.area}, {deliveryAddress.city}</p>
                    <p className="text-gray-600">{deliveryAddress.state} - {deliveryAddress.pincode}</p>
                    <p className="text-gray-600 mt-2">Phone: {order.customerPhone}</p>
                    {order.customerId?.email && <p className="text-gray-600">Email: {order.customerId.email}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">S.No</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Item Description</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold">HSN/SAC</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold">Qty</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold">Unit</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold">Rate (₹)</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-bold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, index) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm">{index + 1}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium">{item.productName}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.sku || 'N/A'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm">{item.unit || 'unit'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm">
                        {item.unitPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">
                        {((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Taxable Amount (Base):</span>
                    <span className="font-semibold">₹{gstBreakdown.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">CGST @ 9%:</span>
                    <span className="font-semibold">₹{gstBreakdown.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">SGST @ 9%:</span>
                    <span className="font-semibold">₹{gstBreakdown.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b-2 border-gray-400">
                    <span className="text-gray-700 font-medium">Subtotal (Inc. GST):</span>
                    <span className="font-semibold">₹{gstBreakdown.subtotalInclusive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {order.deliveryCharge > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Delivery Charges:</span>
                      <span className="font-semibold">₹{order.deliveryCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {order.platformFee > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Platform Fee:</span>
                      <span className="font-semibold">₹{order.platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-3 border-t-2 border-gray-800 mt-2">
                    <span className="text-lg font-bold text-gray-800">Grand Total:</span>
                    <span className="text-lg font-bold text-gray-800">₹{gstBreakdown.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 font-semibold">
                    Total Amount (In Words):
                  </p>
                  <p className="text-sm text-blue-900 font-bold mt-1">
                    {numberToWords(Math.round(gstBreakdown.grandTotal))} Rupees Only
                  </p>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="border-t-2 border-gray-300 pt-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">Terms & Conditions:</h3>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Goods once sold will not be taken back or exchanged.</li>
                <li>All disputes are subject to Bangalore jurisdiction only.</li>
                <li>Payment should be made within 7 days from the date of invoice.</li>
                <li>Interest @ 18% p.a. will be charged on delayed payments.</li>
                <li>This is a computer-generated invoice and does not require a signature.</li>
              </ol>
            </div>

            {/* Signature Section */}
            <div className="flex justify-between items-end border-t-2 border-gray-300 pt-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer Signature</p>
                <div className="border-t border-gray-400 w-48 mt-12"></div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800 text-sm">For CharDeevaari</p>
                <div className="mt-12">
                  <div className="border-t border-gray-400 w-48 inline-block"></div>
                  <p className="text-xs text-gray-600 mt-1">Authorized Signatory</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                This is a computer-generated invoice. For any queries, please contact our support team.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Generated on: {new Date().toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              onClick={onHide}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download / Print Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to convert number to words
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  if (num < 1000) return convertLessThanThousand(num);
  if (num < 100000) {
    return convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand' +
           (num % 1000 !== 0 ? ' ' + convertLessThanThousand(num % 1000) : '');
  }
  if (num < 10000000) {
    return convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh' +
           (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
  }
  return convertLessThanThousand(Math.floor(num / 10000000)) + ' Crore' +
         (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '');
};

export default GSTInvoicePreview;
