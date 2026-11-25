import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { productAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-hot-toast';
import analytics from '../../services/analytics';
import SEO from '../../components/SEO/SEO';
import { categoryNameOf, pricedVariants, toSchemaProduct } from '../../utils/productSchema';
import { landingForCategory } from '../landing/landingConfig';
import { PageSpinner } from '../../components/ui/Spinner';
import { useBulkWhatsApp } from '../../hooks/useBulkWhatsApp';
import { effectivePrice, formatINR, priceUnit, priceText } from '../../utils/rates';
import { IMAGE_SIZES, productImageProps } from '../../utils/productImage';
import { useTranslation } from 'react-i18next';

/** "L 20 × W 25 × H 5" from the stored dimensions (values only; no unit is stored). */
const formatDimensions = (d) =>
  d && typeof d === 'object'
    ? [['length', 'L'], ['width', 'W'], ['height', 'H']]
        .filter(([k]) => d[k] != null && d[k] !== '')
        .map(([k, abbr]) => `${abbr} ${d[k]}`)
        .join(' × ')
    : '';

/** [{ key, label, value }] for the admin-entered specifications that have a value. */
const specificationRows = (specs, t) =>
  Object.entries(specs || {})
    .map(([key, value]) => [key, key === 'dimensions' ? formatDimensions(value) : value])
    .filter(([, value]) => value != null && value !== '' && typeof value !== 'object')
    .map(([key, value]) => ({ key, label: t(`detail.specLabels.${key}`, { defaultValue: key }), value: String(value) }));

const ProductDetail = () => {
  const { t } = useTranslation('products');
  const { t: tl } = useTranslation('landing');
  const { id } = useParams();
  const { addToCart, getCartItem } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { number: waNumber, callNumber } = useBulkWhatsApp();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getById(id)
  });

  const hasVariants = product?.variants && product.variants.length > 0;

  // cart item depends on whether we have a variant selected
  const cartItem = hasVariants
    ? getCartItem(id, selectedVariant?.label)
    : getCartItem(id);

  // Active price and stock — from variant if selected, else product
  const activePrice = selectedVariant ? selectedVariant.price : product?.price;
  const activeStock = selectedVariant
    ? selectedVariant.stock
    : (product?.totalStock || product?.stock || 0);

  // Track product view when product loads
  useEffect(() => {
    if (product) {
      analytics.trackProductView(product);
    }
  }, [product]);

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      toast.error(t('detail.toast.selectSize'));
      return;
    }
    if (!product || activeStock <= 0) {
      toast.error(t('detail.toast.outOfStock'));
      return;
    }
    addToCart(product, quantity, null, selectedVariant);
    analytics.trackAddToCart(product, quantity);
    toast.success(t('detail.toast.added', { count: quantity }));
  };

  const handleBuyNow = () => {
    if (hasVariants && !selectedVariant) {
      toast.error(t('detail.toast.selectSize'));
      return;
    }
    if (!product || activeStock <= 0) {
      toast.error(t('detail.toast.outOfStock'));
      return;
    }
    addToCart(product, quantity, null, selectedVariant);
    navigate('/cart');
  };

  const incrementQuantity = () => {
    if (quantity < activeStock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleQuantityInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!val || val < 1) return setQuantity(1);
    setQuantity(Math.min(val, activeStock));
  };

  // No <SEO> while loading: a pre-data snapshot would add a second JSON-LD graph.
  if (isLoading) return <PageSpinner />;

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <SEO title="Product not found" noindex />
        <p className={error ? 'text-red-600' : 'text-gray-600'}>
          {error ? t('detail.error', { message: error.message }) : t('detail.notFound')}
        </p>
      </div>
    );
  }

  // SEO copy uses the admin price exactly as shown below (incl. GST).
  const rawCategory = categoryNameOf(product);
  const categoryName = rawCategory ? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1) : 'Building material';
  const categoryLanding = landingForCategory(rawCategory);
  const schemaProduct = toSchemaProduct(product);
  const shownPrice = schemaProduct ? priceText(product) : '';
  // Keep the title within ~60 chars where the product name allows it.
  const productTitle = shownPrice
    ? [`${product.name} Price in Ranchi – ${shownPrice}`, `${product.name} – ${shownPrice}, Ranchi`]
        .find((s, i, all) => s.length <= 60 || i === all.length - 1)
    : `${product.name} Price in Ranchi`;
  const productDescription = `${product.name}${shownPrice ? ` at ${shownPrice} (incl. GST)` : ''} in Ranchi. 60-min delivery near Kadru, Harmu, Ashok Nagar, Doranda. Cash on delivery.`;
  const productKeywords = `${product.name} price Ranchi, ${product.name} rate Ranchi, ${categoryName} price Ranchi, ${categoryName} dealer Ranchi, ${categoryName} home delivery Ranchi`;
  // Same trail in the visible breadcrumb and the BreadcrumbList schema.
  const categoryCrumb = categoryLanding
    ? { name: categoryLanding.breadcrumb, path: `/${categoryLanding.slug}` }
    : { name: t('detail.allProducts', { lng: 'en' }), path: '/products' };
  const priceRows = pricedVariants(product);
  const specRows = specificationRows(product.specifications, t);

  return (
    <div className="bg-gray-50">
      <SEO
        title={productTitle}
        description={productDescription}
        keywords={productKeywords}
        type="product"
        image={(product.images && product.images[0]) || undefined}
        product={schemaProduct}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          categoryCrumb,
          { name: product.name, path: `/products/${product._id}` }
        ]}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 lg:py-8">
        <nav className="text-sm text-gray-500 mb-3 lg:mb-5" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary-600">{t('detail.home')}</Link>
          <span className="mx-2">/</span>
          <Link to={categoryCrumb.path} className="hover:text-primary-600">{categoryCrumb.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{product.name}</span>
        </nav>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-12">
          {/* Product Image Gallery */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Main Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-50 group">
                <img
                  {...productImageProps(product.images?.[selectedImageIndex] || product.images?.[0] || '/placeholder-product.jpg', IMAGE_SIZES.main)}
                  alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                  width={600}
                  height={600}
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  onClick={() => setIsFullscreen(true)}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 cursor-zoom-in"
                />
                {(product.totalStock || product.stock) <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold">
                      {t('detail.outOfStock')}
                    </span>
                  </div>
                )}

                {/* Left / Right arrows — inside the relative container, on the edges */}
                {product.images && product.images.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1)); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1)); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs">
                    {selectedImageIndex + 1} / {product.images.length}
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                        selectedImageIndex === index
                          ? 'border-primary-500'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <img
                        {...productImageProps(image, IMAGE_SIZES.thumb)}
                        alt=""
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Fullscreen Lightbox */}
              {isFullscreen && (
                <div
                  className="fixed inset-0 z-50 bg-black/95 flex flex-col"
                  onClick={() => setIsFullscreen(false)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-white text-sm font-medium">{product.name}</span>
                    <div className="flex items-center gap-3">
                      {product.images.length > 1 && (
                        <span className="text-gray-400 text-sm">{selectedImageIndex + 1} / {product.images.length}</span>
                      )}
                      <button onClick={() => setIsFullscreen(false)} className="text-white hover:text-gray-300 p-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Scrollable image area */}
                  <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 pb-4" onClick={e => e.stopPropagation()}>
                    <img
                      src={product.images[selectedImageIndex]}
                      alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                      className="max-w-full rounded-lg object-contain"
                    />
                  </div>

                  {/* Left / Right arrows on edges */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1)); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full shadow-xl transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1)); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full shadow-xl transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Thumbnail strip at bottom */}
                  {product.images.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto flex-shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                            selectedImageIndex === index ? 'border-white' : 'border-white/30 hover:border-white/60'
                          }`}
                        >
                          <img {...productImageProps(image, IMAGE_SIZES.thumb)} alt={`thumb ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-3 lg:space-y-5">

            {/* Name */}
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-snug">{product.name}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              {hasVariants && !selectedVariant ? (
                <>
                  <span className="text-sm text-gray-400 font-medium">{t('detail.from')}</span>
                  <span className="text-xl lg:text-2xl font-bold text-gray-900">
                    ₹{(effectivePrice(product) ?? 0).toLocaleString()}
                  </span>
                  {priceUnit(product) && <span className="text-sm text-gray-500">/ {priceUnit(product)}</span>}
                </>
              ) : (
                <>
                  {product.mrp > activePrice && (
                    <span className="text-sm text-gray-400 font-medium line-through">
                      ₹{product.mrp.toLocaleString()}
                    </span>
                  )}
                  <span className="text-xl lg:text-2xl font-bold text-gray-900">₹{activePrice?.toLocaleString()}</span>
                  {priceUnit(product, selectedVariant) && <span className="text-sm text-gray-500">/ {priceUnit(product, selectedVariant)}</span>}
                  {product.mrp > activePrice && (
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      {t('detail.percentOff', { percent: Math.round((1 - activePrice / product.mrp) * 100) })}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                {t('detail.badges.fastDelivery')}
              </span>
              <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {t('detail.badges.payOnDelivery')}
              </span>
              <span className="inline-flex items-center bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                {t('detail.badges.genuine')}
              </span>
            </div>

            {/* Variant Size Picker */}
            {hasVariants && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t('detail.selectSize')}
                  {!selectedVariant && <span className="ml-1 text-red-500 text-xs">{t('detail.required')}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.label}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setQuantity(1);
                      }}
                      disabled={variant.stock <= 0}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        selectedVariant?.label === variant.label
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : variant.stock <= 0
                            ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                            : 'border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50'
                      }`}
                    >
                      {variant.label}
                      {variant.stock <= 0 && <span className="block text-xs font-normal">{t('detail.outOfStockLower')}</span>}
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <p className="text-xs text-gray-500 mt-2">
                    {t('detail.stockAvailable', { stock: selectedVariant.stock, unit: product.unit || '' })}
                  </p>
                )}
              </div>
            )}

            {/* Out of stock badge */}
            {activeStock <= 0 && (!hasVariants || selectedVariant) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                {t('detail.outOfStock')}
              </span>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('detail.description')}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Category tag → its rate page */}
            {product.category?.name && (
              <Link
                to={categoryCrumb.path}
                className="inline-block px-3 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-semibold rounded-full uppercase tracking-wide"
              >
                {product.category.name}
              </Link>
            )}

            {/* Quantity + Actions */}
            {/* For variant products: show actions only after a size is selected (or always show disabled state) */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {activeStock > 0 && (!hasVariants || selectedVariant) && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">{t('detail.qty')}</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-11 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400 transition-colors">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="w-11 h-full shrink-0 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      <MinusIcon className="h-5 w-5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={activeStock}
                      value={quantity}
                      onChange={handleQuantityInput}
                      className="w-20 h-full text-center text-base font-bold border-x border-gray-300 focus:outline-none caret-brand-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={incrementQuantity}
                      disabled={quantity >= activeStock}
                      className="w-11 h-full shrink-0 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={hasVariants && !selectedVariant}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-primary-600 text-primary-700 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCartIcon className="h-4 w-4" />
                  {cartItem ? t('detail.addMore') : t('detail.addToCart')}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={hasVariants && !selectedVariant}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('detail.buyNow')}
                </button>
              </div>

              {/* WhatsApp + Call CTAs — customers buy via chat/phone; meet them there */}
              {waNumber && (
                <div className="flex gap-3">
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                      `Hi, I want to order:\n${product.name}${selectedVariant ? ` (${selectedVariant.label})` : ''}${priceText(product, selectedVariant) ? ` — ${priceText(product, selectedVariant)}` : ''}\nQty: ${quantity}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#1ebe5b] text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    {t('detail.orderOnWhatsApp')}
                  </a>
                  <a
                    href={`tel:+${callNumber || waNumber}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#25D366] text-[#1ebe5b] rounded-xl text-sm font-semibold hover:bg-green-50 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    {t('detail.callToOrder')}
                  </a>
                </div>
              )}

              {hasVariants && !selectedVariant && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  {t('detail.selectSizeHint')}
                </p>
              )}

              {cartItem && (
                <Link
                  to="/cart"
                  className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {t('detail.viewCart', { count: cartItem.quantity })}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 lg:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-12">
          {/* Size → price table (admin variant prices, incl. GST) */}
          {priceRows.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
              <h2 className="text-lg font-bold text-gray-900">{t('detail.priceTable.heading', { name: product.name })}</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th scope="col" className="py-2 pr-4 font-semibold">{t('detail.priceTable.size')}</th>
                    <th scope="col" className="py-2 font-semibold">{t('detail.priceTable.price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((v) => (
                    <tr key={v._id || v.label} className="border-b border-gray-100 last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-medium text-gray-800">{v.label}</th>
                      <td className="py-2 text-gray-900">
                        {formatINR(v.price)}
                        {priceUnit(product, v) && <span className="text-gray-500"> / {priceUnit(product, v)}</span>}
                        {v.stock <= 0 && <span className="ml-2 text-xs text-red-600">{t('detail.priceTable.outOfStock')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Specifications (admin-entered fields only) */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <h2 className="text-lg font-bold text-gray-900">{t('detail.specifications')}</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {specRows.map((row) => (
                  <tr key={row.key} className="border-b border-gray-100">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-gray-500 w-1/3">{row.label}</th>
                    <td className="py-2 text-gray-900">{row.value}</td>
                  </tr>
                ))}
                {product.category?.name && (
                  <tr className="border-b border-gray-100">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-gray-500 w-1/3">{t('detail.specLabels.category')}</th>
                    <td className="py-2">
                      <Link to={categoryCrumb.path} className="text-primary-600 hover:text-primary-700 font-medium">{product.category.name}</Link>
                    </td>
                  </tr>
                )}
                {!priceRows.length && product.unit && (
                  <tr className="border-b border-gray-100">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-gray-500 w-1/3">{t('detail.specLabels.unit')}</th>
                    <td className="py-2 text-gray-900">{priceUnit(product)}</td>
                  </tr>
                )}
                {product.sku && (
                  <tr>
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-gray-500 w-1/3">{t('detail.specLabels.sku')}</th>
                    <td className="py-2 text-gray-900">{product.sku}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Internal links: category rate page, buying guide, all rates */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <h2 className="text-lg font-bold text-gray-900">{t('detail.moreLinks', { category: categoryName })}</h2>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              {categoryLanding && (
                <li>
                  <Link to={categoryCrumb.path} className="text-primary-600 hover:text-primary-700">
                    {tl(`pages.${categoryLanding.key}.h1`)} →
                  </Link>
                </li>
              )}
              {categoryLanding?.guideSlug && (
                <li>
                  <Link to={`/blog/${categoryLanding.guideSlug}`} className="text-primary-600 hover:text-primary-700">
                    {tl(`pages.${categoryLanding.key}.guideLink`)}
                  </Link>
                </li>
              )}
              <li>
                <Link to="/aaj-ka-rate" className="text-primary-600 hover:text-primary-700">{tl('related.aajKaRate')} →</Link>
              </li>
              {!categoryLanding && (
                <li>
                  <Link to="/products" className="text-primary-600 hover:text-primary-700">{t('detail.allProducts')} →</Link>
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Customer Reviews - Rating Display (Hidden for now) */}
        {/* Uncomment this section when you want to enable reviews */}
        {/*
        <div className="mt-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
            <div className="text-center py-12">
              <div className="flex items-center justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-8 w-8 text-gray-300" />
                ))}
              </div>
              <p className="text-gray-600 text-lg">No reviews yet</p>
              <p className="text-gray-500 text-sm mt-2">Be the first customer to review this product</p>
            </div>
          </div>
        </div>
        */}
      </div>
    </div>
  );
};

export default ProductDetail;
