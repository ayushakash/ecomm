import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title = 'Chardeevari - Construction Materials in Ranchi, Jharkhand',
  description = 'Buy quality construction materials online in Ranchi, Jharkhand. Cement, Sand, Bricks, Steel, Aggregates with doorstep delivery. Best prices guaranteed.',
  keywords = 'construction materials Ranchi, cement online Ranchi, building materials Jharkhand, M-Sand Ranchi, TMT bars Ranchi, bricks Ranchi, construction supplies Ranchi, building materials online Jharkhand',
  image = '/logo512.png',
  url = typeof window !== 'undefined' ? window.location.href : 'https://your-domain.com',
  type = 'website',
  noindex = false,
  product = null, // Product schema data
  breadcrumbs = null // Breadcrumb schema data
}) => {
  const siteUrl = 'https://your-domain.com'; // Update with your actual domain
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
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ranchi',
        addressRegion: 'Jharkhand',
        addressCountry: 'IN'
      },
      areaServed: {
        '@type': 'City',
        name: 'Ranchi'
      },
      priceRange: '₹₹',
      telephone: '+91-XXXXXXXXXX'
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

    return structuredData;
  };

  const structuredData = generateStructuredData();

  return (
    <Helmet>
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
