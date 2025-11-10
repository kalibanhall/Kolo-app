import React from 'react';
import { LogoKolo } from './LogoKolo';

export const LoadingSpinner = ({ message = 'Chargement...', size = 'medium' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Logo animé avec rotation de la pièce */}
      <div className="relative mb-4">
        <LogoKolo size={size} animated />
        
        {/* Cercle de chargement autour du logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>

      {/* Message de chargement */}
      {message && (
        <p className="text-gray-600 font-medium animate-pulse">{message}</p>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
