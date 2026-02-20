import { useEffect, useCallback, useRef } from 'react';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

/**
 * Hook pour intégrer Google reCAPTCHA v3
 * Charge le script dynamiquement et fournit une méthode pour obtenir un token
 */
export const useRecaptcha = () => {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || scriptLoaded.current) return;

    // Vérifier si le script est déjà chargé
    if (document.querySelector(`script[src*="recaptcha"]`)) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded.current = true;
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: on ne retire pas le script car il peut être utilisé ailleurs
    };
  }, []);

  /**
   * Exécute reCAPTCHA et retourne un token
   * @param {string} action - L'action à vérifier (ex: 'register', 'login')
   * @returns {Promise<string|null>} Le token reCAPTCHA ou null si non disponible
   */
  const executeRecaptcha = useCallback(async (action = 'submit') => {
    if (!RECAPTCHA_SITE_KEY) {
      console.warn('reCAPTCHA site key not configured');
      return null;
    }

    try {
      // Attendre que grecaptcha soit disponible
      if (!window.grecaptcha) {
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (window.grecaptcha) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          // Timeout après 5 secondes
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5000);
        });
      }

      if (!window.grecaptcha) {
        console.warn('reCAPTCHA not loaded');
        return null;
      }

      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
      return token;
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      return null;
    }
  }, []);

  return {
    executeRecaptcha,
    isReady: !!RECAPTCHA_SITE_KEY,
  };
};
