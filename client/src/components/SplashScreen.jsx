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
        <div className="mb-8 relative w-48 h-48 mx-auto">
          {/* Image du logo en gris (vide) - toujours visible */}
          <img 
            src="/logo-kolo-k.png" 
            alt="KOLO"
            className="absolute inset-0 w-full h-full object-contain opacity-20"
            style={{ filter: 'grayscale(100%) brightness(0.5)' }}
          />
          
          {/* Container du remplissage avec masque */}
          <div 
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{
              WebkitMaskImage: 'url(/logo-kolo-k.png)',
              maskImage: 'url(/logo-kolo-k.png)',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
            }}
          >
            {/* Rectangle qui monte pour créer l'effet de remplissage */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-[#5EDFD6] transition-all duration-100 ease-out"
              style={{
                height: `${progress}%`,
              }}
            />
          </div>
          
          {/* Effet de brillance quand complet */}
          {progress >= 100 && (
            <div 
              className="absolute inset-0 animate-pulse"
              style={{ 
                background: 'radial-gradient(circle, rgba(94, 223, 214, 0.4) 0%, transparent 70%)',
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