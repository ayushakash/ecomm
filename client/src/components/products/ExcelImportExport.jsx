import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { excelAPI } from '../../services/api';

const SUMMARY_LABELS = {
  productsToCreate: 'New products',
  productsToUpdate: 'Products updated',
  productsWithVariants: 'Products with variant changes',
  variantRows: 'Variant rows',
  categoriesToCreate: 'New categories',
  categoriesToUpdate: 'Categories updated',
  productsToAdd: 'Products added to stock',
  rows: 'Rows read',
};

/**
 * Export / import buttons plus the check-then-import dialog.
 * kind="catalog": admin master products (Products, Variants, Categories sheets).
 * kind="stock":   one merchant's price & stock; pass merchantId when an admin acts for a merchant.
 */
const ExcelImportExport = ({ kind, merchantId, onImported }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null); // last server response (check or import)
  const [busy, setBusy] = useState('');
  const inputRef = useRef(null);

  const isCatalog = kind === 'catalog';

  const exportFile = async (scope) => {
    setBusy(scope || 'export');
    try {
      if (isCatalog) await excelAPI.exportCatalog();
      else await excelAPI.exportStock({ merchantId, scope });
    } catch {
      /* interceptor already showed the error */
    } finally {
      setBusy('');
    }
  };

  const run = async (dryRun) => {
    if (!file) return;
    setBusy(dryRun ? 'check' : 'import');
    try {
      const data = isCatalog
        ? await excelAPI.importCatalog(file, dryRun)
        : await excelAPI.importStock(file, dryRun, merchantId);
      setResult({ ...data, dryRun });
      if (!dryRun && data.success) {
        toast.success('Import complete');
        onImported?.();
      }
    } catch {
      setResult(null);
    } finally {
      setBusy('');
    }
  };

  const close = () => {
    setOpen(false);
    setFile(null);
    setResult(null);
  };

  const canImport = result?.dryRun && result.success && !busy;
  const btn = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className={`${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`} onClick={() => exportFile()} disabled={!!busy}>
          <ArrowDownTrayIcon className="h-4 w-4" />
          {busy === 'export' ? 'Exporting…' : isCatalog ? 'Export Excel' : merchantId ? 'Export stock' : 'Export my stock'}
        </button>
        {!isCatalog && (
          <button className={`${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`} onClick={() => exportFile('all')} disabled={!!busy}
            title="Every catalog product, so new ones can be added by filling price/stock">
            <ArrowDownTrayIcon className="h-4 w-4" />
            {busy === 'all' ? 'Exporting…' : 'Export full catalog'}
          </button>
        )}
        <button className={`${btn} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`} onClick={() => setOpen(true)}>
          <ArrowUpTrayIcon className="h-4 w-4" />
          Import Excel
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {isCatalog ? 'Import products from Excel' : 'Import stock & prices from Excel'}
              </h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <p className="text-gray-600">
                {isCatalog
                  ? 'Start from "Export Excel". Rows with an existing SKU are updated; rows with a new or blank SKU become new products. Categories and variants are checked against the catalog before anything is saved.'
                  : 'Start from an export. Edit Price, Stock and Enabled; fill price or stock on a product you do not sell yet to add it. Variant labels must match the catalog.'}
                {' '}See the Instructions sheet in the exported file.
              </p>

              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); e.target.value = ''; }}
                />
                <button className={`${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`} onClick={() => inputRef.current?.click()}>
                  Choose .xlsx file
                </button>
                <span className="truncate text-gray-700">{file?.name || 'No file selected'}</span>
              </div>

              {result?.message && <p className="rounded-lg bg-red-50 p-3 text-red-700">{result.message}</p>}

              {result?.summary && (
                <div className="rounded-lg border p-3">
                  <p className={`mb-2 font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.dryRun
                      ? result.success ? 'File is valid. Review and click Import.' : `${result.errors.length} problem(s) found. Fix them in Excel and check again — nothing was saved.`
                      : result.success ? 'Saved.' : 'Some rows could not be saved.'}
                  </p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {Object.entries(result.summary)
                      .filter(([k]) => SUMMARY_LABELS[k])
                      .map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt className="text-gray-500">{SUMMARY_LABELS[k]}</dt>
                          <dd className="font-medium text-gray-900">{v}</dd>
                        </React.Fragment>
                      ))}
                  </dl>
                </div>
              )}

              {result?.errors?.length > 0 && (
                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  <table className="min-w-full text-left">
                    <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr><th className="px-3 py-2">Sheet</th><th className="px-3 py-2">Row</th><th className="px-3 py-2">Problem</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-600">{e.sheet}</td>
                          <td className="px-3 py-1.5 text-gray-600">{e.row ?? '-'}</td>
                          <td className="px-3 py-1.5 text-red-700">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button className={`${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`} onClick={close}>Close</button>
              <button className={`${btn} border-gray-300 bg-white text-gray-800 hover:bg-gray-50`} onClick={() => run(true)} disabled={!file || !!busy}>
                {busy === 'check' ? 'Checking…' : 'Check file'}
              </button>
              <button className={`${btn} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`} onClick={() => run(false)} disabled={!canImport}>
                {busy === 'import' ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExcelImportExport;
