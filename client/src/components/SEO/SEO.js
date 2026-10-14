import React from 'react';
import { Helmet } from 'react-helmet-async';

// Configurable via env so OG images / canonical / JSON-LD point at the real site.
const SITE_URL = (process.env.REACT_APP_SITE_URL || 'https://chardeevari.in').replace(/\/$/, '');
// Must match the Google Business Profile exactly (NAP consistency).
const BUSINESS_PHONE = process.env.REACT_APP_BUSINESS_PHONE || '+91-6201176610';
const BUSINESS_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: 'New AG Co-operative Colony, Kadru',
  addressLocality: 'Ranchi',
  addressRegion: 'Jharkhand',
  postalCode: '834002',
  addressCountry: 'IN'
};

const SEO = ({
  title = 'Cheap Construction Materials in Ranchi - Cement, Steel, Sand, Bricks',
  description = 'Buy cheap construction materials online in Ranchi, Jharkhand. Lowest prices on cement, steel (TMT bars), sand, aggregates & bricks with doorstep delivery. Compare verified merchant prices & order online.',
  keywords = 'cheap cement in Ranchi, cheap steel in Ranchi, cheap construction material in Ranchi, cement price in Ranchi, TMT steel price Ranchi, sand price Ranchi, bricks Ranchi, building materials online Ranchi, construction materials Jharkhand',
  image = '/logo512.png',
  // Canonical: always SITE_URL + path. Never window.location.href — it bakes the
  // react-snap prerender origin (localhost:45678) into static HTML and lets
  // query strings (?category=...) declare themselves canonical.
  url = typeof window !== 'undefined' ? `${SITE_URL}${window.location.pathname}` : SITE_URL,
  type = 'website',
  noindex = false,
  product = null, // Product schema data
  breadcrumbs = null, // Breadcrumb schema data
  faqs = null, // [{ question, answer }] -> FAQPage schema
  article = null // { datePublished, dateModified, author } -> BlogPosting schema
}) => {
  const siteUrl = SITE_URL;
  const siteName = 'Chardeevari';
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;

  // Generate JSON-LD structured data
  const generateStructuredData = () => {
    const structuredData = [];

    // Organization Schema
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/logo512.png`,
      description: 'Leading construction materials supplier in Ranchi, Jharkhand',
      address: BUSINESS_ADDRESS,
      areaServed: {
        '@type': 'City',
        name: 'Ranchi'
      },
      priceRange: '₹₹',
      ...(BUSINESS_PHONE && { telephone: BUSINESS_PHONE })
    });

    // LocalBusiness (HardwareStore) Schema — key for "near me" / local Ranchi search
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'HardwareStore',
      name: siteName,
      image: `${siteUrl}/logo512.png`,
      url: siteUrl,
      description: 'Buy cheap cement, steel, sand, aggregates and bricks online in Ranchi with doorstep delivery.',
      address: BUSINESS_ADDRESS,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 23.3441,
        longitude: 85.3096
      },
      areaServed: {
        '@type': 'City',
        name: 'Ranchi'
      },
      priceRange: '₹₹',
      // Matches GBP hours: Mon–Sat 10:00–19:00, Sun 10:00–14:00
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '10:00',
          closes: '19:00'
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'Sunday',
          opens: '10:00',
          closes: '14:00'
        }
      ],
      ...(BUSINESS_PHONE && { telephone: BUSINESS_PHONE })
    });

    // Website Schema
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    });

    // Product Schema (if product data is provided)
    if (product) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.image || image,
        brand: {
          '@type': 'Brand',
          name: product.brand || 'Chardeevari'
        },
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'INR',
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: siteName
          },
          areaServed: {
            '@type': 'City',
            name: 'Ranchi'
          }
        },
        ...(product.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating.value,
            reviewCount: product.rating.count
          }
        })
      });
    }

    // Breadcrumb Schema
    if (breadcrumbs) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${siteUrl}${crumb.path}`
        }))
      });
    }

    // FAQ Schema — drives "People also ask" / featured snippets
    if (faqs && faqs.length) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer
          }
        }))
      });
    }

    // Article / BlogPosting Schema — for blog post rich results
    if (article) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        image: image.startsWith('http') ? image : `${siteUrl}${image}`,
        datePublished: article.datePublished,
        dateModified: article.dateModified || article.datePublished,
        author: {
          '@type': 'Organization',
          name: article.author || siteName
        },
        publisher: {
          '@type': 'Organization',
          name: siteName,
          logo: { '@type': 'ImageObject', url: `${siteUrl}/logo512.png` }
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url }
      });
    }

    return structuredData;
  };

  const structuredData = generateStructuredData();

  return (
    // defer={false}: apply head tags synchronously. The default rAF-deferred
    // flush races react-snap's snapshot — pages randomly miss all SEO tags.
    <Helmet defer={false}>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Robots Meta */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image.startsWith('http') ? image : `${siteUrl}${image}`} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image.startsWith('http') ? image : `${siteUrl}${image}`} />

      {/* Geographic Meta Tags for Local SEO */}
      <meta name="geo.region" content="IN-JH" />
      <meta name="geo.placename" content="Ranchi" />
      <meta name="geo.position" content="23.3441;85.3096" />
      <meta name="ICBM" content="23.3441, 85.3096" />

      {/* Mobile Meta Tags */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Structured Data (JSON-LD) */}
      {structuredData.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
