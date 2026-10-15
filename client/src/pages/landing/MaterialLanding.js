import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productAPI } from '../../services/api';
import ProductCard from '../../components/products/ProductCard';
import ProductCardSkeleton from '../../components/products/ProductCardSkeleton';
import SEO from '../../components/SEO/SEO';
import { useTranslation } from 'react-i18next';
import { LANDING_CONFIGS } from './landingConfig';

// Other landing pages to cross-link from each page (internal linking signal).
const ALL_LINKS = Object.values(LANDING_CONFIGS).map((c) => ({ key: c.key, to: `/${c.slug}` }));

const MaterialLanding = ({ config }) => {
  const { t } = useTranslation('landing');
  const { key, slug, category, h1, seoTitle, seoDescription, keywords, faqs } = config;
  const pageH1 = t(`pages.${key}.h1`);
  const pageIntro = t(`pages.${key}.intro`, { returnObjects: true });
  const pageFaqs = t(`pages.${key}.faqs`, { returnObjects: true });

  // Resolve the category name -> live category id, then fetch its products.
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productAPI.getCategories(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const categoryId = category
    ? categoriesData?.find((c) => c.name?.toLowerCase() === category.toLowerCase())?._id
    : undefined;

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['landing-products', slug, categoryId],
    queryFn: () => productAPI.getProducts({ category: categoryId, sortBy: 'name' }),
    enabled: category ? !!categoryId : true, // wait for the id when a category is configured
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const products = productsData?.products || [];
  const relatedLinks = ALL_LINKS.filter((l) => l.to !== `/${slug}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={keywords}
        faqs={faqs}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: h1.split(' — ')[0], path: `/${slug}` },
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
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">{pageH1}</h1>
            {Array.isArray(pageIntro) && pageIntro.map((para, i) => (
              <p key={i} className="mt-3 text-sm sm:text-base text-[#B7C0CC] leading-relaxed">{para}</p>
            ))}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/products" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-[0_8px_18px_-8px_rgba(241,140,52,0.85)] transition-colors">
                {t('cta.browseAll')}
              </Link>
              <Link to="/calculator" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-bold transition-colors">
                {t('cta.calculator')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">
          {t(`pages.${key}.productsHeading`)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{t('products.subtitle')}</p>

        <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-5">
          {isLoading ? (
            [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products.length > 0 ? (
            products.slice(0, 12).map((product, index) => (
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

      {/* FAQ (visible + emitted as FAQPage schema via <SEO faqs>) */}
      {Array.isArray(pageFaqs) && pageFaqs.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">{t('faq.title')}</h2>
          <div className="mt-4 space-y-3">
            {pageFaqs.map((f, i) => (
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
