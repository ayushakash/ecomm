import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO/SEO';
import { blogPosts } from '../data/blogPosts';
import { useTranslation } from 'react-i18next';

const Blog = () => {
  const { t } = useTranslation('blog');
  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Construction Materials Blog - Tips, Guides & News | Ranchi, Jharkhand"
        description="Expert insights on construction materials, building tips, and industry news for Ranchi, Jharkhand. Learn about cement, sand, steel, and more."
        keywords="construction blog Ranchi, building materials guide, construction tips Jharkhand, cement guide, TMT bars guide, M-Sand information"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            {t('list.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('list.subtitle')}
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
            >
              <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <div className="text-6xl mb-2">📝</div>
                  <p className="text-sm font-semibold">{post.category}</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-blue-600 uppercase">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-500">{post.date}</span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  <Link to={`/blog/${post.slug}`} className="hover:text-blue-700 transition-colors">
                    {post.title}
                  </Link>
                </h2>

                <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>

                <Link
                  to={`/blog/${post.slug}`}
                  className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  {t('list.readMore')}
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* SEO Content Section */}
        <div className="mt-16 prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            {t('info.title')}
          </h2>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <p className="text-gray-700 mb-4">
              {t('info.intro')}
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-6 mb-4">
              {t('info.considerationsTitle')}
            </h3>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>{t('info.climate.title')}</strong> {t('info.climate.text')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>{t('info.quality.title')}</strong> {t('info.quality.text')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>{t('info.local.title')}</strong> {t('info.local.text')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>{t('info.sustainability.title')}</strong> {t('info.sustainability.text')}</span>
              </li>
            </ul>

            <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white">
              <h4 className="text-xl font-bold mb-3">{t('cta.title')}</h4>
              <p className="mb-4">{t('cta.text')}</p>
              <a
                href="/products"
                className="inline-block bg-white text-blue-600 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {t('cta.button')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
