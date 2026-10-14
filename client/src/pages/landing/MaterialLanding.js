import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productAPI } from '../../services/api';
import ProductCard from '../../components/products/ProductCard';
import ProductCardSkeleton from '../../components/products/ProductCardSkeleton';
import SEO from '../../components/SEO/SEO';
import { LANDING_CONFIGS } from './landingConfig';

// Other landing pages to cross-link from each page (internal linking signal).
const ALL_LINKS = Object.values(LANDING_CONFIGS).map((c) => ({ label: c.h1.split(' — ')[0], to: `/${c.slug}` }));

const MaterialLanding = ({ config }) => {
  const { slug, category, h1, seoTitle, seoDescription, keywords, intro, faqs } = config;

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
              ★ Same-day site delivery · Own fleet
            </span>
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">{h1}</h1>
            {intro?.map((para, i) => (
              <p key={i} className="mt-3 text-sm sm:text-base text-[#B7C0CC] leading-relaxed">{para}</p>
            ))}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/products" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-[0_8px_18px_-8px_rgba(241,140,52,0.85)] transition-colors">
                Browse all products
              </Link>
              <Link to="/calculator" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-bold transition-colors">
                Material calculator
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">
          {category ? `${category} available in Ranchi` : 'Building materials available in Ranchi'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">Live prices · pay on delivery · own-fleet delivery</p>

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
              <p className="mt-2 text-ink-700 font-bold">No items listed here right now</p>
              <Link to="/products" className="inline-block mt-3 text-brand-600 font-semibold">Browse all products →</Link>
            </div>
          )}
        </div>
      </div>

      {/* FAQ (visible + emitted as FAQPage schema via <SEO faqs>) */}
      {faqs?.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink-700 tracking-tight">Frequently asked questions</h2>
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
        <h2 className="text-base font-extrabold text-ink-700 tracking-tight mb-3">More building materials in Ranchi</h2>
        <div className="flex flex-wrap gap-2.5">
          {relatedLinks.map((l) => (
            <Link key={l.to} to={l.to} className="px-4 py-2.5 rounded-full text-sm font-bold border border-[#E7E9ED] bg-white text-gray-600 hover:bg-gray-50 hover:text-ink-700 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MaterialLanding;
