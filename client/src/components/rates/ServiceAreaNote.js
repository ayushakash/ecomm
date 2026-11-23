import React from 'react';
import { useTranslation } from 'react-i18next';
import { BUSINESS_PHONE_LABEL, BUSINESS_PHONE_TEL, whatsappLink } from '../../config/contact';

/**
 * Static delivery facts (area, time, payment, hours) — rendered without any API
 * call so the prerendered HTML always states them.
 */
const ServiceAreaNote = ({ className = '' }) => {
  const { t } = useTranslation('rates');

  return (
    <section className={`bg-white border border-[#E7E9ED] rounded-2xl px-5 py-4 ${className}`}>
      <h2 className="text-base font-extrabold text-ink-700 tracking-tight">{t('area.title')}</h2>
      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{t('area.text')}</p>
      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{t('area.hours')}</p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <a
          href={whatsappLink(t('area.whatsappMessage'))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center h-10 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold"
        >
          {t('area.whatsapp')}
        </a>
        <a
          href={`tel:${BUSINESS_PHONE_TEL}`}
          className="inline-flex items-center h-10 px-4 rounded-xl border border-[#E7E9ED] text-ink-700 text-sm font-bold hover:bg-gray-50"
        >
          {t('area.call', { phone: BUSINESS_PHONE_LABEL })}
        </a>
      </div>
    </section>
  );
};

export default ServiceAreaNote;
