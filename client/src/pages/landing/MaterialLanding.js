import React from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/products/ProductCard';
import ProductCardSkeleton from '../../components/products/ProductCardSkeleton';
import SEO from '../../components/SEO/SEO';
import RateTable from '../../components/rates/RateTable';
import ServiceAreaNote from '../../components/rates/ServiceAreaNote';
import { useTranslation } from 'react-i18next';
import { useRateProducts } from '../../hooks/useRateProducts';
import {
  rateRows, isRateable, lastRevised, formatRateDate, priceRange, rateList, rowPrice, cheapestRow, groupByCategory, CATEGORY_ORDER,
} from '../../utils/rates';
import { toSchemaProduct } from '../../utils/productSchema';
import { LANDING_CONFIGS } from './landingConfig';

// Other landing pages to cross-link from each page (internal linking signal).
const ALL_LINKS = Object.values(LANDING_CONFIGS).map((c) => ({ key: c.key, to: `/${c.slug}` }));

const MaterialLanding = ({ config }) => {
  const { t, i18n } = useTranslation('landing');
  const { t: tr } = useTranslation('rates');
  const { key, slug, category, breadcrumb, seoTitle, seoDescription, keywords } = config;
  const page = (k, opts) => t(`pages.${key}.${k}`, opts);
  const intro = page('intro', { returnObjects: true });
  const guide = page('guide', { returnObjects: true });

  const { products, isLoading, isError } = useRateProducts(category);
  const allRows = rateRows(products);
  const rows = category ? allRows : groupByCategory(allRows).flatMap((g) => g.rows);
  const date = formatRateDate(lastRevised(products), i18n.language);
  const unitLabel = (u) => tr(`units.${u}`, { defaultValue: u });

  // The "all" page summarises the cheapest rate per category; the others list every row.
  const list = category
    ? rateList(rows, unitLabel)
    : groupByCategory(rows)
        .map((g) => {
          const lc = g.category.toLowerCase();
          return t(`categorySummary.${CATEGORY_ORDER.includes(lc) ? lc : 'other'}`, {
            name: g.category,
            price: rowPrice(cheapestRow(g.rows), unitLabel),
          });
        })
        .join('; ');

  const priceFaq = rows.length
    ? { question: page('priceFaq.question'), answer: page('priceFaq.answer', { range: priceRange(rows), list, date }) }
    : null;
  const pageFaqs = page('faqs', { returnObjects: true });
  const faqs = [
    priceFaq,
    ...(Array.isArray(pageFaqs) ? pageFaqs : []),
    t('common.areaFaq', { returnObjects: true }),
    t('common.codFaq', { returnObjects: true }),
  ].filter((f) => f && f.question);

  // Meta stays English (prerendered for crawlers); the live lowest rate is added once loaded.
  const cheapest = cheapestRow(rows);
  const description = seoDescription(cheapest ? rowPrice(cheapest) : undefined);
  const relatedLinks = ALL_LINKS.filter((l) => l.to !== `/${slug}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seoTitle}
        description={description}
        keywords={keywords}
        itemList={products.filter(isRateable).map(toSchemaProduct).filter(Boolean)}
        faqs={faqs}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: breadcrumb, path: `/${slug}` },
        ]}
      />

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div
          className="relative overflow-hidden rounded-[22px] text-white px-5 py-7 sm:px-9 sm:py-10 shadow-[0_16px_30px_-16px_rgba(30,42,58,0.6)]"
          style={{ background: 'radial-gradient(120% 140% at 85% 0%,#2C3E54 0%,#1E2A3A 55%)' }}
        >
          <div
            className="pointer-events-none absolute -right-7 -top-7 w-40 h-40 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(241,140,52,.32),transparent 70%)' }}
          />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/40 text-brand-300 text-[11px] font-bold px-2.5 py-1.5 rounded-full tracking-wide">
              {t('hero.badge')}
            </span>
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">{page('h1')}</h1>
            {Array.isArray(intro) && intro.map((para, i) => (
              <p key={i} className="mt-3 text-sm sm:text-base text-[#B7C0CC] leading-relaxed">{para}</p>
            ))}
            <p className="mt-3 text-sm sm:text-base text-[#B7C0CC] leading-relaxed">{t('common.deliveryIntro')}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/aaj-ka-rate" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-[0_8px_18px_-8px_rgba(241,140,52,0.85)] transition-colors">
                {t('cta.aajKaRate')}
              </Link>
              <Link to="/calculator" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-bold transition-colors">
                {t('cta.calculator')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dated rate table (crawlable; filled from the products query at prerender) */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">{page('rateHeading')}</h2>
        <div className="mt-3">
          {rows.length > 0 ? (
            <RateTable rows={rows} caption={date ? tr('table.caption', { date }) : undefined} />
          ) : (
            <p className="text-sm text-gray-500">{isLoading && !isError ? t('rates.loading') : t('rates.unavailable')}</p>
          )}
        </div>
        <ServiceAreaNote className="mt-4" />
      </section>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">{page('productsHeading')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('products.subtitle')}</p>

        <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-5">
          {isLoading ? (
            [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products.some(isRateable) ? (
            products.filter(isRateable).slice(0, 12).map((product, index) => (
              <ProductCard key={product._id} product={product} priority={index === 0} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl">
              <div className="text-3xl">🔍</div>
              <p className="mt-2 text-ink-700 font-bold">{t('products.empty')}</p>
              <Link to="/products" className="inline-block mt-3 text-brand-600 font-semibold">{t('products.browseAllArrow')}</Link>
            </div>
          )}
        </div>
      </div>

      {/* Buying guide — unique per material */}
      {Array.isArray(guide) && guide.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">{page('guideHeading')}</h2>
          {guide.map((para, i) => (
            <p key={i} className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">{para}</p>
          ))}
        </section>
      )}

      {/* FAQ (visible + emitted as FAQPage schema via <SEO faqs>) */}
      {faqs.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">{t('faq.title')}</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group bg-white border border-[#E7E9ED] rounded-2xl px-5 py-4">
                <summary className="cursor-pointer list-none font-bold text-ink-700 flex items-center justify-between">
                  {f.question}
                  <span className="text-brand-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Internal links to the other material pages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-base font-extrabold text-ink-700 tracking-tight mb-3">{t('related.title')}</h2>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/aaj-ka-rate" className="px-4 py-2.5 rounded-full text-sm font-bold border border-brand-500/40 bg-white text-brand-600 hover:bg-gray-50 transition-colors">
            {t('related.aajKaRate')}
          </Link>
          {relatedLinks.map((l) => (
            <Link key={l.to} to={l.to} className="px-4 py-2.5 rounded-full text-sm font-bold border border-[#E7E9ED] bg-white text-gray-600 hover:bg-gray-50 hover:text-ink-700 transition-colors">
              {t(`pages.${l.key}.linkLabel`)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MaterialLanding;
