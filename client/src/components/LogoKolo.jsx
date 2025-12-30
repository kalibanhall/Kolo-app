import React from 'react';

/**
 * Logo KOLO - Utilise l'image officielle exacte
 */
export const LogoKolo = ({ 
  size = 'medium', 
  animated = false, 
  className = '' 
}) => {
  const sizes = {
    tiny: 'h-6',
    small: 'h-10',
    medium: 'h-14',
    large: 'h-20',
    xlarge: 'h-28',
  };

  const sizeClass = sizes[size] || sizes.medium;

  return (
    <div className={`inline-flex items-center ${animated ? 'hover:scale-105 transition-transform duration-300' : ''} ${className}`}>
      <img 
        src="/logo-kolo.png" 
        alt="KOLO - KOMA PROPRIETAIRE" 
        className={`${sizeClass} w-auto object-contain`}
      />
    </div>
  );
};

/**
 * Logo KOLO complet avec texte - Version horizontale
 * Utilise l'image officielle exacte
 */
export const LogoKoloFull = ({ 
  size = 'medium', 
  animated = false,
  className = '' 
}) => {
  const sizes = {
    small: 'h-8',
    medium: 'h-10',
    large: 'h-14',
    xlarge: 'h-20',
  };

  const sizeClass = sizes[size] || sizes.medium;

  return (
    <div className={`inline-flex items-center ${animated ? 'hover:scale-105 transition-transform duration-300' : ''} ${className}`}>
      <img 
        src="/logo-kolo.png" 
        alt="KOLO - KOMA PROPRIETAIRE" 
        className={`${sizeClass} w-auto object-contain`}
      />
    </div>
  );
};

/**
 * Icône K seule - Utilise l'image officielle
 */
export const LogoKoloIcon = ({ 
  size = 'medium',
  animated = false,
  className = '' 
}) => {
  const sizes = {
    tiny: 'h-5',
    small: 'h-8',
    medium: 'h-10',
    large: 'h-14',
    xlarge: 'h-20',
  };

  const sizeClass = sizes[size] || sizes.medium;

  return (
    <img 
      src="/logo-kolo.png" 
      alt="KOLO" 
      className={`${sizeClass} w-auto object-contain ${animated ? 'hover:scale-110 transition-transform duration-300' : ''} ${className}`}
    />
  );
};

export default LogoKolo;
