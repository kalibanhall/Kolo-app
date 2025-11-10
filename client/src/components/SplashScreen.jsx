import React, { useEffect, useState } from 'react';

// Fonction pour vérifier si le logo existe
const getLogoSrc = () => {
  try {
    return require('../assets/logo-kolo.png');
  } catch (error) {
    return null;
  }
};

export const SplashScreen = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);
  const logoSrc = getLogoSrc();

  useEffect(() => {
    // Durée du splash screen : 3 secondes
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 500); // Attendre la fin de l'animation de fade out
    }, 3000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Particles d'arrière-plan animés */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-yellow-400 opacity-20 animate-float"
            style={{
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Container principal */}
      <div className="relative z-10 text-center">
        {/* Logo KOLO avec animation de la pièce qui tourne */}
        <div className="mb-8 relative">
          {/* Cercle lumineux en arrière-plan */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          </div>

          {/* Logo principal */}
          <div className="relative animate-scaleIn">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="KOLO Logo"
                className="w-64 h-64 mx-auto drop-shadow-2xl"
              />
            ) : (
              <div className="w-64 h-64 mx-auto flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-full shadow-2xl">
                <span className="text-9xl">🏆</span>
              </div>
            )}
            
            {/* Effet de rotation sur la pièce centrale */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 animate-spin-slow">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 opacity-30 blur-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Texte KOLO */}
        <div className="animate-fadeInUp">
          <h1 className="text-6xl font-bold text-white mb-2 tracking-wider animate-glow">
            KOLO
          </h1>
          <p className="text-xl text-yellow-300 font-medium mb-6 animate-fadeIn">
            Là où un ticket peut changer une vie
          </p>
        </div>

        {/* Barre de chargement */}
        <div className="w-64 mx-auto mt-8 animate-fadeIn">
          <div className="h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-full animate-loading"></div>
          </div>
          <p className="text-white text-sm mt-3 opacity-80">Chargement...</p>
        </div>

        {/* Étoiles décoratives */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-300 text-2xl animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      </div>

      {/* CSS personnalisé pour les animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 10px rgba(250, 204, 21, 0.5),
                         0 0 20px rgba(250, 204, 21, 0.3),
                         0 0 30px rgba(250, 204, 21, 0.2);
          }
          50% {
            text-shadow: 0 0 20px rgba(250, 204, 21, 0.8),
                         0 0 30px rgba(250, 204, 21, 0.5),
                         0 0 40px rgba(250, 204, 21, 0.3);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-float {
          animation: float infinite ease-in-out;
        }

        .animate-scaleIn {
          animation: scaleIn 1s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out 0.5s both;
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out 1s both;
        }

        .animate-loading {
          animation: loading 1.5s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
