import React, { useEffect, useState } from 'react';
import { XMarkIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';

const InstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      return;
    }

    // Don't show if dismissed recently (24h)
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 3s
      setTimeout(() => setShow(true), 3000);
    } else {
      // Android/Chrome: capture install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setTimeout(() => setShow(true), 3000);
      });
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

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-sm mx-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <img src="/logo.png" alt="Chardeevari" className="w-12 h-12 rounded-xl shadow" />
          <div>
            <p className="font-bold text-gray-900 text-sm">Install Chardeevari</p>
            <p className="text-xs text-gray-500">Add to home screen for the best experience</p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1.5">
            <p className="font-semibold text-gray-800">To install on iPhone/iPad:</p>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">1</span>
              <span>Tap the <ArrowUpOnSquareIcon className="inline h-4 w-4 text-blue-600" /> Share button in Safari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">2</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">3</span>
              <span>Tap <strong>"Add"</strong> — opens fullscreen like an app!</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallBanner;
