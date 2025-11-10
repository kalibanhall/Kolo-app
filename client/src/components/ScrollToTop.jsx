import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Composant qui scroll automatiquement en haut de la page lors de la navigation
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Instant pour éviter l'animation visible
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
