import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO/SEO';
import { useTranslation } from 'react-i18next';

const CONTACT_EMAIL = 'chardeevari.construction@gmail.com';

/**
 * Public privacy policy (Google Play "privacy policy" URL). Covers the mobile app and website.
 */
const PrivacyPolicy = () => {
  const { t } = useTranslation('privacy');
  const sections = t('sections', { returnObjects: true });

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Privacy Policy | Chardeevari"
        description="How Chardeevari collects, uses, shares and protects your personal data in the Chardeevari app and website."
      />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-xs text-gray-500 mt-1">{t('effective')}</p>
          <p className="text-sm text-gray-600 mt-2">{t('intro')}</p>
        </div>

        {Array.isArray(sections) && sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-700 space-y-2"
          >
            <h2 className="font-semibold text-gray-900">{section.title}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text} className="text-gray-600">{text}</p>
            ))}
            {section.items && (
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                {section.items.map((text) => <li key={text}>{text}</li>)}
              </ul>
            )}
            {section.id === 'deletion' && (
              <Link to="/delete-account" className="inline-block font-semibold text-primary-700 hover:text-primary-800">
                {t('deleteLink')} →
              </Link>
            )}
            {section.id === 'contact' && (
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-block font-semibold text-primary-700 hover:text-primary-800">
                {t('emailLink')} →
              </a>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
