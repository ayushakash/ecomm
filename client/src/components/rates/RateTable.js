import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatINR } from '../../utils/rates';

/**
 * Crawlable "aaj ka rate" table. `rows` come from rateRows(); `caption` should
 * carry the date so the rate is citable on its own.
 */
const RateTable = ({ rows, caption }) => {
  const { t } = useTranslation('rates');
  if (!rows?.length) return null;

  return (
    <div className="overflow-x-auto bg-white border border-[#E7E9ED] rounded-2xl">
      <table className="min-w-full text-sm">
        {caption && (
          <caption className="caption-top text-left text-xs font-semibold text-gray-500 px-4 pt-3 pb-1">{caption}</caption>
        )}
        <thead>
          <tr className="text-left text-gray-500 border-b border-[#E7E9ED]">
            <th scope="col" className="px-4 py-2.5 font-semibold">{t('table.material')}</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">{t('table.size')}</th>
            <th scope="col" className="px-4 py-2.5 font-semibold text-right">{t('table.rate')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-b-0 border-[#F0F1F3]">
              <td className="px-4 py-2.5 font-semibold text-ink-700">
                <Link to={`/products/${r.productId}`} className="hover:text-brand-600">{r.name}</Link>
              </td>
              <td className="px-4 py-2.5 text-gray-600">{r.size || '—'}</td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                <span className="font-extrabold text-ink-700">{formatINR(r.price)}</span>
                {r.unit && (
                  <span className="text-gray-500"> / {t(`units.${r.unit}`, { defaultValue: r.unit })}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RateTable;
