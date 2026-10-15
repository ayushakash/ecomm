import React, { useEffect, useState } from 'react';
import { XMarkIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS

const isAndroid = () => /android/i.test(navigator.userAgent);

const isMobile = () => isIOS() || isAndroid();

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const InstallBanner = () => {
  const { t } = useTranslation('common');
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState(null); // 'ios' | 'android-native' | null
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;

    // ── 2nd-session gate (do not remove — see GA report Jun 2026) ──────────
    // Never pitch the PWA install during a visitor's FIRST session: first-time
    // ad visitors were bouncing off landing interruptions before seeing any
    // product. A "session" = one browser session (sessionStorage lifetime).
    let sessions = parseInt(localStorage.getItem('pwa-session-count'), 10) || 0;
    if (!sessionStorage.getItem('pwa-session-marked')) {
      sessions += 1;
      localStorage.setItem('pwa-session-count', String(sessions));
      sessionStorage.setItem('pwa-session-marked', '1');
    }
    if (sessions < 2) return;

    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) return;

    if (isIOS()) {
      // iOS has no install API — manual instructions are the only path.
      setPlatform('ios');
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    if (isAndroid()) {
      // Android: show ONLY when Chrome hands us the native install prompt.
      // (The old unconditional 5s "manual instructions" fallback was removed —
      // it interrupted every visit even when installation wasn't possible.)
      let t;
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setPlatform('android-native');
        t = setTimeout(() => setShow(true), 3000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(t);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  if (!show || !platform) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-sm mx-auto relative">
        <button onClick={handleDismiss} aria-label={t('actions.close')} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <img src="/logo.webp" alt="Chardeevari" className="w-12 h-12 rounded-xl shadow" />
          <div>
            <p className="font-bold text-gray-900 text-sm">{t('install.title')}</p>
            <p className="text-xs text-gray-500">{t('install.subtitle')}</p>
          </div>
        </div>

        {platform === 'ios' && (
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1.5">
            <p className="font-semibold text-gray-800">{t('install.iosTitle')}</p>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">1</span>
              <span>{t('install.iosStep1Before')} <ArrowUpOnSquareIcon className="inline h-4 w-4 text-blue-600" /> {t('install.iosStep1After')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">2</span>
              <span>{t('install.iosStep2Before')} <strong>{t('install.iosStep2Strong')}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">3</span>
              <span>{t('install.iosStep3Before')} <strong>{t('install.iosStep3Strong')}</strong> {t('install.iosStep3After')}</span>
            </div>
          </div>
        )}

        {platform === 'android-native' && (
          <button
            onClick={handleInstall}
            className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {t('install.button')}
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallBanner;
