import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO/SEO';
import { blogPosts } from '../data/blogPosts';

const Blog = () => {
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
            Construction Materials Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Expert tips, guides, and insights for your construction projects in Ranchi, Jharkhand
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
                  Read More →
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* SEO Content Section */}
        <div className="mt-16 prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Why Choose Quality Construction Materials in Ranchi?
          </h2>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <p className="text-gray-700 mb-4">
              Ranchi, the capital of Jharkhand, is experiencing rapid urbanization and infrastructure development.
              Choosing the right construction materials is crucial for ensuring the durability and safety of your building projects.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-6 mb-4">
              Key Considerations for Construction in Ranchi
            </h3>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>Climate Factors:</strong> Ranchi's climate requires materials that can withstand monsoon rains and temperature variations.</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>Quality Certification:</strong> Always choose ISI-marked cement, TMT bars, and other certified materials.</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>Local Availability:</strong> Source materials from reliable suppliers in Ranchi to ensure timely delivery and competitive pricing.</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>Sustainability:</strong> Consider eco-friendly options like M-Sand and recycled aggregates.</span>
              </li>
            </ul>

            <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white">
              <h4 className="text-xl font-bold mb-3">Need Construction Materials?</h4>
              <p className="mb-4">Browse our wide range of quality construction materials with doorstep delivery in Ranchi.</p>
              <a
                href="/products"
                className="inline-block bg-white text-blue-600 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                View Products
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
