import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import SEO from '../components/SEO/SEO';
import { getBlogPost } from '../data/blogPosts';

// Render **bold** segments inside a paragraph.
const renderText = (text) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
};

const BlogPost = () => {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  // Unknown slug -> send back to the blog list (avoids a soft-404 dead end).
  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={`${post.title} | Chardeevari`}
        description={post.metaDescription}
        keywords={post.keywords}
        type="article"
        url={`https://chardeevari.in/blog/${post.slug}`}
        faqs={post.faqs}
        article={{ datePublished: post.date, dateModified: post.dateModified }}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-primary-600">Blog</Link>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">{post.category}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-3">{post.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
            {post.readTime && <><span>·</span><span>{post.readTime}</span></>}
          </div>
        </header>

        {/* Body */}
        <div className="space-y-5 text-gray-700 leading-relaxed">
          {post.body.map((block, i) => {
            if (block.type === 'h2') {
              return <h2 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-2">{block.text}</h2>;
            }
            if (block.type === 'p') {
              return <p key={i}>{renderText(block.text)}</p>;
            }
            if (block.type === 'ul') {
              return (
                <ul key={i} className="list-disc pl-6 space-y-2">
                  {block.items.map((it, j) => <li key={j}>{renderText(it)}</li>)}
                </ul>
              );
            }
            if (block.type === 'table') {
              return (
                <div key={i} className="overflow-x-auto my-4">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {block.headers.map((h, j) => (
                          <th key={j} className="px-4 py-2 text-left font-semibold text-gray-800 border-b border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, j) => (
                        <tr key={j} className={j % 2 ? 'bg-gray-50' : 'bg-white'}>
                          {row.map((cell, k) => (
                            <td key={k} className="px-4 py-2 border-b border-gray-100 text-gray-700">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            if (block.type === 'cta') {
              return (
                <div key={i} className="my-6 bg-gradient-to-r from-primary-700 to-primary-900 rounded-xl p-6 text-white">
                  <p className="mb-4">{renderText(block.text)}</p>
                  <Link to={block.href} className="inline-block bg-white text-primary-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
                    {block.label}
                  </Link>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* FAQ section */}
        {post.faqs && post.faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {post.faqs.map((f, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">{f.question}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to order construction materials in Ranchi?</h3>
          <p className="text-gray-700 mb-4">Compare verified merchant prices and get doorstep delivery.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/products" className="inline-block bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-800 transition-colors">Browse Products</Link>
            <Link to="/calculator" className="inline-block bg-white border border-primary-300 text-primary-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Free Calculator</Link>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/blog" className="text-primary-600 font-semibold hover:text-primary-700">← Back to all articles</Link>
        </div>
      </article>
    </div>
  );
};

export default BlogPost;
