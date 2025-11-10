import React from 'react';

// Import du logo directement
import logoKolo from '../assets/logo-kolo.png';

export const LogoKolo = ({ size = 'medium', animated = false, className = '' }) => {
  const sizes = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24',
    xlarge: 'w-32 h-32',
  };

  const sizeClass = sizes[size] || sizes.medium;

  // Si le logo n'est pas chargé, afficher un placeholder avec icône SVG
  if (!logoKolo) {
    return (
      <div className={`relative inline-flex items-center justify-center ${sizeClass} ${className}`}>
        <div className={`${sizeClass} bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
          animated ? 'hover:scale-110 transition-transform duration-300' : ''
        }`}>
          <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        
        {animated && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full rounded-full border-4 border-yellow-400 opacity-20 animate-spin-slow"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Logo principal - La pièce avec fond transparent */}
      <img
        src={logoKolo}
        alt="KOLO"
        className={`${sizeClass} object-contain ${
          animated ? 'hover:scale-110 transition-transform duration-300' : ''
        }`}
        style={{ 
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' 
        }}
      />
      
      {/* Animation de rotation de la pièce (quand animated = true) */}
      {animated && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 opacity-20 blur-md animate-spin-slow`}
               style={{ width: '50%', height: '50%' }}>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};
