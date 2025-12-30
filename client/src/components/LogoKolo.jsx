import React from 'react';

/**
 * Logo KOLO - K stylisé en turquoise/cyan
 * Basé sur le design officiel avec deux formes géométriques formant un K
 */
export const LogoKolo = ({ 
  size = 'medium', 
  animated = false, 
  showText = false,
  showSubtext = false,
  darkMode = true,
  className = '' 
}) => {
  const sizes = {
    tiny: { icon: 'w-6 h-6', text: 'text-lg', subtext: 'text-[6px]' },
    small: { icon: 'w-10 h-10', text: 'text-xl', subtext: 'text-[8px]' },
    medium: { icon: 'w-14 h-14', text: 'text-2xl', subtext: 'text-xs' },
    large: { icon: 'w-20 h-20', text: 'text-3xl', subtext: 'text-sm' },
    xlarge: { icon: 'w-28 h-28', text: 'text-4xl', subtext: 'text-base' },
  };

  const sizeConfig = sizes[size] || sizes.medium;
  const textColor = darkMode ? 'text-white' : 'text-gray-900';

  // Couleur turquoise/cyan du logo officiel
  const logoColor = '#5EDFD6';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Icône K stylisée */}
      <div className={`relative ${sizeConfig.icon} ${animated ? 'hover:scale-110 transition-transform duration-300' : ''}`}>
        <svg 
          viewBox="0 0 120 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Forme gauche du K - Parallélogramme incliné */}
          <path 
            d="M0 5 L30 5 L20 95 L0 95 Z" 
            fill={logoColor}
          />
          {/* Forme droite du K - Deux triangles formant les branches */}
          <path 
            d="M25 5 L55 5 L30 50 L55 95 L25 95 L50 50 Z" 
            fill={logoColor}
          />
        </svg>
        
        {/* Animation subtile au hover */}
        {animated && (
          <div className="absolute inset-0 rounded-lg bg-cyan-400 opacity-0 hover:opacity-20 transition-opacity duration-300" />
        )}
      </div>

      {/* Texte "Kolo" optionnel */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold ${textColor} ${sizeConfig.text} tracking-tight`}>
            Kolo
          </span>
          {showSubtext && (
            <span className={`text-gray-400 ${sizeConfig.subtext} tracking-[0.15em] uppercase mt-0.5`}>
              KOMA PROPRIETAIRE
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Logo KOLO complet avec texte - Version horizontale
 */
export const LogoKoloFull = ({ 
  size = 'medium', 
  darkMode = false,
  animated = false,
  className = '' 
}) => {
  const sizes = {
    small: { height: 'h-8', text: 'text-xl', subtext: 'text-[8px]' },
    medium: { height: 'h-10', text: 'text-2xl', subtext: 'text-[10px]' },
    large: { height: 'h-14', text: 'text-3xl', subtext: 'text-xs' },
    xlarge: { height: 'h-20', text: 'text-4xl', subtext: 'text-sm' },
  };

  const sizeConfig = sizes[size] || sizes.medium;
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const subtextColor = darkMode ? 'text-gray-400' : 'text-gray-500';
  const logoColor = '#5EDFD6';

  return (
    <div className={`inline-flex items-center gap-3 ${animated ? 'hover:scale-105 transition-transform duration-300' : ''} ${className}`}>
      {/* Icône K */}
      <svg 
        viewBox="0 0 120 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeConfig.height} w-auto`}
      >
        <path d="M0 5 L30 5 L20 95 L0 95 Z" fill={logoColor} />
        <path d="M25 5 L55 5 L30 50 L55 95 L25 95 L50 50 Z" fill={logoColor} />
      </svg>

      {/* Texte */}
      <div className="flex flex-col leading-none">
        <span className={`font-bold ${textColor} ${sizeConfig.text} tracking-tight`}>
          Kolo
        </span>
        <span className={`${subtextColor} ${sizeConfig.subtext} tracking-[0.15em] uppercase mt-0.5`}>
          KOMA PROPRIETAIRE
        </span>
      </div>
    </div>
  );
};

/**
 * Icône K seule (sans texte)
 */
export const LogoKoloIcon = ({ 
  size = 'medium',
  animated = false,
  className = '' 
}) => {
  const sizes = {
    tiny: 'w-5 h-5',
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24',
  };

  const sizeClass = sizes[size] || sizes.medium;
  const logoColor = '#5EDFD6';

  return (
    <svg 
      viewBox="0 0 120 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} ${animated ? 'hover:scale-110 transition-transform duration-300' : ''} ${className}`}
    >
      <path d="M0 5 L30 5 L20 95 L0 95 Z" fill={logoColor} />
      <path d="M25 5 L55 5 L30 50 L55 95 L25 95 L50 50 Z" fill={logoColor} />
    </svg>
  );
};

export default LogoKolo;
