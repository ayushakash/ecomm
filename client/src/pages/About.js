import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO/SEO';
import { LANDING_CONFIGS } from './landing/landingConfig';
import {
  BUSINESS_ADDRESS, BUSINESS_EMAIL, BUSINESS_MAPS_URL, BUSINESS_PHONE_LABEL, BUSINESS_PHONE_TEL, whatsappLink,
} from '../config/contact';
import { playStoreLink } from '../config/app';
import analytics from '../services/analytics';

/** /about — who Chardeevari is (entity page for search and AI answers). */
const About = () => {
  const { t } = useTranslation('about');
  const { t: tl } = useTranslation('landing');
  const steps = t('how.steps', { returnObjects: true });

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={t('seoTitle', { lng: 'en' })}
        description={t('seoDescription', { lng: 'en' })}
        keywords="Chardeevari, चारदीवारी, Char Deevari, Chardeevari Ranchi, building material delivery Ranchi, Ayush Akash"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-gray-700 leading-relaxed">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-700 tracking-tight">{t('h1')}</h1>
        <p className="mt-4 text-base">{t('intro')}</p>
        <p className="mt-3 text-sm text-gray-500">{t('name')}</p>

        <h2 className="mt-8 text-xl font-extrabold text-ink-700">{t('how.title')}</h2>
        {Array.isArray(steps) && (
          <ol className="mt-3 list-decimal pl-6 space-y-1.5">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}

        <h2 className="mt-8 text-xl font-extrabold text-ink-700">{t('area.title')}</h2>
        <p className="mt-3">{t('area.text')}</p>

        <h2 className="mt-8 text-xl font-extrabold text-ink-700">{t('materials.title')}</h2>
        <p className="mt-3">{t('materials.text')}</p>
        <ul className="mt-3 flex flex-wrap gap-2.5">
          <li>
            <Link to="/aaj-ka-rate" className="inline-block px-4 py-2 rounded-full text-sm font-bold border border-brand-500/40 bg-white text-brand-600 hover:bg-gray-50">
              {tl('related.aajKaRate')}
            </Link>
          </li>
          {Object.values(LANDING_CONFIGS).map((c) => (
            <li key={c.key}>
              <Link to={`/${c.slug}`} className="inline-block px-4 py-2 rounded-full text-sm font-bold border border-[#E7E9ED] bg-white text-gray-600 hover:bg-gray-50 hover:text-ink-700">
                {tl(`pages.${c.key}.linkLabel`)}
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-extrabold text-ink-700">{t('team.title')}</h2>
        <p className="mt-3">{t('team.text')}</p>

        <h2 className="mt-8 text-xl font-extrabold text-ink-700">{t('contact.title')}</h2>
        <dl className="mt-3 bg-white border border-[#E7E9ED] rounded-2xl px-5 py-4 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-semibold text-ink-700">{t('contact.address')}</dt>
          <dd><address className="not-italic">Chardeevari, {BUSINESS_ADDRESS}</address></dd>
          <dt className="font-semibold text-ink-700">{t('contact.phone')}</dt>
          <dd>
            <a href={`tel:${BUSINESS_PHONE_TEL}`} className="text-brand-600 font-semibold">{BUSINESS_PHONE_LABEL}</a>
            {' · '}
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="text-green-700 font-semibold">WhatsApp</a>
          </dd>
          <dt className="font-semibold text-ink-700">{t('contact.email')}</dt>
          <dd><a href={`mailto:${BUSINESS_EMAIL}`} className="text-brand-600 font-semibold">{BUSINESS_EMAIL}</a></dd>
          <dt className="font-semibold text-ink-700">{t('contact.hours')}</dt>
          <dd>{t('contact.hoursValue')}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <a href={BUSINESS_MAPS_URL} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700">{t('contact.maps')}</a>
          <a
            href={playStoreLink('about')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => analytics.trackEvent('app_download_click', { placement: 'about' })}
            className="text-green-700 hover:text-green-800"
          >
            {t('contact.app')}
          </a>
          <Link to="/contact" className="text-brand-600 hover:text-brand-700">{t('contact.contactPage')}</Link>
        </div>
      </article>
    </div>
  );
};

export default About;
