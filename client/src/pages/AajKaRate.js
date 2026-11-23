import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO/SEO';
import RateTable from '../components/rates/RateTable';
import ServiceAreaNote from '../components/rates/ServiceAreaNote';
import { useRateProducts } from '../hooks/useRateProducts';
import { rateRows, isRateable, groupByCategory, lastRevised, formatRateDate, CATEGORY_ORDER } from '../utils/rates';
import { toSchemaProduct } from '../utils/productSchema';
import { landingForCategory } from './landing/landingConfig';
import { whatsappLink } from '../config/contact';
import { playStoreLink } from '../config/app';
import analytics from '../services/analytics';

/** /aaj-ka-rate — every stocked material's current rate in one dated table. */
const AajKaRate = () => {
  const { t, i18n } = useTranslation('rates');
  const { products, isLoading, isError } = useRateProducts();
  const groups = groupByCategory(rateRows(products));
  const date = formatRateDate(lastRevised(products), i18n.language);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={t('aajKaRate.seoTitle', { lng: 'en' })}
        description={t('aajKaRate.seoDescription', { lng: 'en' })}
        keywords="aaj ka rate Ranchi, building material rate Ranchi today, cement rate Ranchi, sariya rate Ranchi, balu rate Ranchi, gitti rate Ranchi, ईंट रेट रांची"
        itemList={products.filter(isRateable).map(toSchemaProduct).filter(Boolean)}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Aaj Ka Rate', path: '/aaj-ka-rate' },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-ink-700 leading-tight tracking-tight">{t('aajKaRate.h1')}</h1>
        {i18n.language !== 'hi' && (
          <h2 className="mt-2 text-lg sm:text-xl font-bold text-ink-700" lang="hi">{t('aajKaRate.hindiHeading')}</h2>
        )}
        <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">{t('aajKaRate.intro')}</p>
        {date && <p className="mt-2 text-sm font-semibold text-ink-700">{t('aajKaRate.revised', { date })}</p>}

        <div className="mt-6 space-y-8">
          {groups.length > 0 ? (
            groups.map((g) => {
              const lc = g.category.toLowerCase();
              const landing = landingForCategory(g.category);
              return (
                <section key={g.category}>
                  <h2 className="text-lg sm:text-xl font-extrabold text-ink-700 tracking-tight mb-3">
                    {CATEGORY_ORDER.includes(lc) ? t(`aajKaRate.groups.${lc}`) : `${t('aajKaRate.groups.other')}: ${g.category}`}
                  </h2>
                  <RateTable rows={g.rows} caption={date ? t('table.caption', { date }) : undefined} />
                  {landing && (
                    <Link to={`/${landing.slug}`} className="inline-block mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                      {t('aajKaRate.groupLink')}
                    </Link>
                  )}
                </section>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">{isLoading && !isError ? t('aajKaRate.loading') : t('aajKaRate.unavailable')}</p>
          )}
        </div>

        <ServiceAreaNote className="mt-8" />

        <section className="mt-6 bg-white border border-[#E7E9ED] rounded-2xl px-5 py-4">
          <h2 className="text-base font-extrabold text-ink-700 tracking-tight">{t('aajKaRate.ctaTitle')}</h2>
          <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{t('aajKaRate.ctaText')}</p>
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
              href={playStoreLink('aaj_ka_rate')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.trackEvent('app_download_click', { placement: 'aaj_ka_rate' })}
              className="inline-flex items-center h-10 px-4 rounded-xl border border-[#E7E9ED] text-ink-700 text-sm font-bold hover:bg-gray-50"
            >
              {t('aajKaRate.app')}
            </a>
            <Link
              to="/calculator"
              className="inline-flex items-center h-10 px-4 rounded-xl border border-[#E7E9ED] text-ink-700 text-sm font-bold hover:bg-gray-50"
            >
              {t('aajKaRate.calculator')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AajKaRate;
