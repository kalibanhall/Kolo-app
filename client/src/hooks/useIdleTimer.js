import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour déconnecter automatiquement l'utilisateur après une période d'inactivité
 * @param {number} timeout - Délai d'inactivité en millisecondes (défaut: 15 minutes)
 * @param {function} onIdle - Callback appelé lors de l'inactivité
 */
export const useIdleTimer = (timeout = 15 * 60 * 1000, onIdle) => {
  const [isIdle, setIsIdle] = useState(false);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
  }, []);

  useEffect(() => {
    let timer;

    const handleActivity = () => {
      clearTimeout(timer);
      setIsIdle(false);
      
      timer = setTimeout(() => {
        setIsIdle(true);
        if (onIdle) {
          onIdle();
        }
      }, timeout);
    };

    // Événements qui réinitialisent le timer
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialiser le timer
    handleActivity();

    // Écouter les événements
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Nettoyage
    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeout, onIdle]);

  return { isIdle, resetTimer };
};
