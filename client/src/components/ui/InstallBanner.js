import React, { useEffect, useState } from 'react';
import { XMarkIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS

const isAndroid = () => /android/i.test(navigator.userAgent);

const isMobile = () => isIOS() || isAndroid();

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const InstallBanner = () => {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState(null); // 'ios' | 'android' | null
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;

    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) return;

    if (isIOS()) {
      setPlatform('ios');
      setTimeout(() => setShow(true), 3000);
      return;
    }

    if (isAndroid()) {
      // Try to capture Chrome's native prompt
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setPlatform('android-native');
        setTimeout(() => setShow(true), 3000);
      };
      window.addEventListener('beforeinstallprompt', handler);

      // Fallback: if native prompt doesn't fire in 5s, show manual instructions
      const fallback = setTimeout(() => {
        setPlatform('android-manual');
        setShow(true);
      }, 5000);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(fallback);
      };
    }
  }, []);

  // If native prompt was captured, cancel the fallback timer by hiding it
  useEffect(() => {
    if (platform === 'android-native') setShow(false);
    if (deferredPrompt && platform === 'android-native') {
      setTimeout(() => setShow(true), 3000);
    }
  }, [deferredPrompt, platform]);

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
        <button onClick={handleDismiss} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <img src="/logo.webp" alt="Chardeevari" className="w-12 h-12 rounded-xl shadow" />
          <div>
            <p className="font-bold text-gray-900 text-sm">Install Chardeevari</p>
            <p className="text-xs text-gray-500">Get the full app experience</p>
          </div>
        </div>

        {platform === 'ios' && (
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1.5">
            <p className="font-semibold text-gray-800">Add to iPhone / iPad:</p>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">1</span>
              <span>Tap the <ArrowUpOnSquareIcon className="inline h-4 w-4 text-blue-600" /> Share button in Safari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">2</span>
              <span>Tap <strong>"Add to Home Screen"</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">3</span>
              <span>Tap <strong>"Add"</strong> — opens fullscreen!</span>
            </div>
          </div>
        )}

        {platform === 'android-native' && (
          <button
            onClick={handleInstall}
            className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Install App
          </button>
        )}

        {platform === 'android-manual' && (
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1.5">
            <p className="font-semibold text-gray-800">Add to Android home screen:</p>
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">1</span>
              <span>Tap <strong>⋮</strong> (menu) in Chrome</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">2</span>
              <span>Tap <strong>"Add to Home screen"</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallBanner;
