import React, { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animation de remplissage progressif
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Durée du splash screen : 2 secondes
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 400);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-900 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Container principal */}
      <div className="relative z-10 text-center">
        {/* Logo K avec animation de remplissage */}
        <div className="mb-8 relative">
          <svg 
            viewBox="0 0 200 180" 
            className="w-48 h-48 mx-auto"
            style={{ filter: 'drop-shadow(0 0 20px rgba(94, 223, 214, 0.3))' }}
          >
            {/* Définition du clip path pour le remplissage */}
            <defs>
              {/* Masque pour le logo K */}
              <clipPath id="kLogoClip">
                {/* Forme gauche du K */}
                <path d="M20 10 L70 10 L55 170 L5 170 Z" />
                {/* Forme droite du K - partie supérieure */}
                <path d="M60 10 L130 10 L80 85 Z" />
                {/* Forme droite du K - partie inférieure */}
                <path d="M80 95 L130 170 L60 170 Z" />
              </clipPath>
              
              {/* Gradient pour le remplissage */}
              <linearGradient id="fillGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#5EDFD6" />
                <stop offset="100%" stopColor="#4FD1C5" />
              </linearGradient>
            </defs>
            
            {/* Contour du logo K (toujours visible) */}
            <g stroke="#5EDFD6" strokeWidth="2" fill="none" opacity="0.3">
              <path d="M20 10 L70 10 L55 170 L5 170 Z" />
              <path d="M60 10 L130 10 L80 85 Z" />
              <path d="M80 95 L130 170 L60 170 Z" />
            </g>
            
            {/* Rectangle de remplissage avec clip */}
            <g clipPath="url(#kLogoClip)">
              <rect 
                x="0" 
                y={180 - (progress * 1.8)} 
                width="200" 
                height="180" 
                fill="url(#fillGradient)"
                className="transition-all duration-100 ease-out"
              />
            </g>
          </svg>
          
          {/* Effet de brillance animé */}
          {progress > 50 && (
            <div 
              className="absolute inset-0 flex items-center justify-center animate-pulse"
              style={{ 
                background: 'radial-gradient(circle, rgba(94, 223, 214, 0.2) 0%, transparent 70%)',
              }}
            />
          )}
        </div>

        {/* Texte KOLO */}
        <div className={`transition-all duration-500 ${progress > 30 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-5xl font-bold text-white mb-2 tracking-wider">
            Kolo
          </h1>
          <p className="text-sm text-gray-400 font-medium tracking-[0.2em] uppercase">
            KOMA PROPRIETAIRE
          </p>
        </div>

        {/* Pourcentage de chargement */}
        <div className={`mt-8 transition-all duration-300 ${progress > 10 ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[#5EDFD6] text-lg font-mono">{progress}%</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;