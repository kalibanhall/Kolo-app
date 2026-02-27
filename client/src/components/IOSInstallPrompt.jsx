import { useState, useEffect } from 'react';

/**
 * iOS Safari PWA Install Prompt
 * 
 * Safari doesn't support the `beforeinstallprompt` event, so we show a 
 * custom banner guiding iOS users to use "Add to Home Screen".
 * 
 * Also includes an Android/desktop install prompt using the native
 * beforeinstallprompt event when available.
 */
export function IOSInstallPrompt() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    if (isStandalone) return;

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('kolo-pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) return;
    }

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent);

    if (isIOS) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setShowIOSPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/desktop: listen for the native install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowAndroidPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleDismiss = () => {
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
    localStorage.setItem('kolo-pwa-prompt-dismissed', new Date().toISOString());
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidPrompt(false);
    }
    setDeferredPrompt(null);
  };

  // iOS Safari prompt — guide user to "Add to Home Screen"
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
        <div className="mx-3 mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-400 to-teal-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/apple-touch-icon.png" alt="KOLO" className="w-8 h-8 rounded-lg" />
              <span className="text-white font-bold text-sm">Installer KOLO</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white text-xl leading-none p-1"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
              Installez KOLO sur votre iPhone pour un accès rapide :
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs font-bold">1</span>
                <span>
                  Appuyez sur{' '}
                  <svg className="inline w-5 h-5 text-blue-500 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                  </svg>
                  {' '}(Partager)
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs font-bold">2</span>
                <span>
                  Faites défiler et appuyez sur{' '}
                  <strong className="text-gray-800 dark:text-gray-200">« Sur l'écran d'accueil »</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs font-bold">3</span>
                <span>
                  Appuyez sur{' '}
                  <strong className="text-gray-800 dark:text-gray-200">« Ajouter »</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Footer arrow pointing down (indicating Safari toolbar) */}
          <div className="flex justify-center pb-2">
            <svg className="w-6 h-6 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop native install prompt
  if (showAndroidPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
        <div className="mx-3 mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <img src="/apple-touch-icon.png" alt="KOLO" className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm">Installer KOLO</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                Accédez rapidement à KOLO depuis votre écran d'accueil
              </p>
            </div>
          </div>
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Plus tard
            </button>
            <button
              onClick={handleAndroidInstall}
              className="flex-1 py-2 text-sm text-white font-semibold bg-gradient-to-r from-teal-400 to-teal-500 rounded-lg hover:from-teal-500 hover:to-teal-600 transition-colors"
            >
              Installer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
