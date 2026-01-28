import React from 'react';
import { TrophyIcon, TicketIcon } from './Icons';

/**
 * TicketCard - Composant de carte de ticket stylisé avec 3 variantes
 * 
 * @param {Object} props
 * @param {string} props.ticketNumber - Numéro du ticket (ex: "K-02")
 * @param {string} props.ownerName - Nom du propriétaire
 * @param {string} props.campaignTitle - Titre de la campagne
 * @param {string} props.campaignImage - URL de l'image de la campagne
 * @param {string} props.type - Type de ticket: 'standard' | 'winner' | 'bonus'
 * @param {string} props.prize - Prix gagné (pour les gagnants)
 * @param {string} props.prizeCategory - Catégorie: 'main' | 'bonus'
 * @param {boolean} props.isActive - Si le ticket est actif
 * @param {string} props.purchaseDate - Date d'achat
 * @param {function} props.onClick - Callback au clic
 */
const TicketCard = ({
  ticketNumber,
  ownerName = 'Propriétaire',
  campaignTitle,
  campaignImage,
  type = 'standard',
  prize,
  prizeCategory,
  isActive = true,
  purchaseDate,
  onClick,
  className = '',
  isDarkMode = false,
}) => {
  // Déterminer le type en fonction du prizeCategory si type n'est pas défini
  const ticketType = prizeCategory === 'main' ? 'winner' : 
                     prizeCategory === 'bonus' ? 'bonus' : type;

  // Couleurs et styles selon le type
  const getTypeStyles = () => {
    switch (ticketType) {
      case 'winner':
        return {
          bgGradient: 'from-amber-500 via-yellow-400 to-amber-500',
          bgPattern: 'from-yellow-600 to-amber-600',
          textColor: 'text-yellow-900',
          labelBg: 'bg-amber-900/80',
          labelText: 'text-yellow-100',
          label: '🏆 TICKET GAGNANT',
          borderColor: 'border-yellow-400',
          shadowColor: 'shadow-yellow-400/50',
          accentColor: 'text-yellow-600',
          iconColor: 'text-yellow-500',
        };
      case 'bonus':
        return {
          bgGradient: 'from-purple-600 via-violet-500 to-purple-600',
          bgPattern: 'from-purple-700 to-violet-700',
          textColor: 'text-purple-100',
          labelBg: 'bg-purple-900/80',
          labelText: 'text-purple-100',
          label: '🎁 TICKET BONUS',
          borderColor: 'border-purple-400',
          shadowColor: 'shadow-purple-400/50',
          accentColor: 'text-purple-300',
          iconColor: 'text-purple-300',
        };
      default: // standard
        return {
          bgGradient: 'from-indigo-600 via-blue-500 to-indigo-600',
          bgPattern: 'from-indigo-700 to-blue-700',
          textColor: 'text-indigo-100',
          labelBg: 'bg-indigo-900/80',
          labelText: 'text-indigo-100',
          label: '🎟️ MON TICKET',
          borderColor: 'border-indigo-400',
          shadowColor: 'shadow-indigo-400/30',
          accentColor: 'text-cyan-300',
          iconColor: 'text-cyan-300',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer transform transition-all duration-300 
        hover:scale-105 hover:-rotate-1 hover:shadow-2xl
        ${className}
      `}
    >
      {/* Ticket Shape avec encoches */}
      <div className={`
        relative rounded-2xl overflow-hidden border-2 
        ${styles.borderColor} ${styles.shadowColor} shadow-xl
      `}>
        {/* Encoches gauche et droite */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-10 bg-gray-100 dark:bg-gray-900 rounded-r-full z-10" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-10 bg-gray-100 dark:bg-gray-900 rounded-l-full z-10" />
        
        {/* Background gradient */}
        <div className={`bg-gradient-to-br ${styles.bgGradient}`}>
          {/* Header avec pattern */}
          <div className={`relative p-4 bg-gradient-to-br ${styles.bgPattern}`}>
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id={`ticket-pattern-${ticketNumber}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1" fill="white"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill={`url(#ticket-pattern-${ticketNumber})`} />
              </svg>
            </div>
            
            {/* Label du type */}
            <div className="relative">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${styles.labelBg} ${styles.labelText}`}>
                {styles.label}
              </span>
            </div>
            
            {/* Titre de la campagne */}
            <h3 className={`mt-2 text-lg font-bold ${styles.textColor} truncate`}>
              #{campaignTitle?.toUpperCase() || 'KOLO'}
            </h3>
            <p className={`text-sm ${styles.accentColor} opacity-90`}>PROPRIÉTAIRE</p>
          </div>

          {/* Zone centrale */}
          <div className="relative p-4 bg-white/95 dark:bg-gray-800/95">
            {/* Image de campagne (si disponible) */}
            {campaignImage && (
              <div className="mb-3 -mx-2">
                <img 
                  src={campaignImage} 
                  alt={campaignTitle}
                  className="w-full h-24 object-cover rounded-lg shadow-inner"
                />
              </div>
            )}
            
            {/* Numéro du ticket */}
            <div className={`
              py-3 px-4 rounded-xl mb-3 text-center
              ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}
            `}>
              <p className={`text-xs uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Numéro de ticket
              </p>
              <p className={`text-2xl font-black tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {ticketNumber}
              </p>
            </div>

            {/* Nom du propriétaire */}
            <div className="text-center">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {ownerName}
              </p>
            </div>

            {/* Prix gagné (si gagnant) */}
            {(ticketType === 'winner' || ticketType === 'bonus') && prize && (
              <div className={`mt-3 p-2 rounded-lg text-center ${
                ticketType === 'winner' 
                  ? 'bg-amber-100 dark:bg-amber-900/30' 
                  : 'bg-purple-100 dark:bg-purple-900/30'
              }`}>
                <p className={`text-xs font-medium ${
                  ticketType === 'winner' ? 'text-amber-600' : 'text-purple-600'
                }`}>
                  {ticketType === 'winner' ? '🏆 Prix Principal' : '🎁 Prix Bonus'}
                </p>
                <p className={`font-bold ${
                  ticketType === 'winner' 
                    ? 'text-amber-700 dark:text-amber-400' 
                    : 'text-purple-700 dark:text-purple-400'
                }`}>
                  {prize}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`
            flex items-center justify-between px-4 py-3 
            bg-gradient-to-br ${styles.bgPattern}
          `}>
            {/* Logo Kolo */}
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 ${styles.iconColor}`}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className={`text-sm font-bold ${styles.textColor}`}>Kolo</span>
            </div>
            
            {/* Statut ou date */}
            <div className="flex items-center gap-2">
              {isActive ? (
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              ) : null}
              <span className={`text-xs ${styles.accentColor}`}>
                {purchaseDate ? new Date(purchaseDate).toLocaleDateString('fr-FR') : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Badge d'angle pour les gagnants */}
      {ticketType === 'winner' && (
        <div className="absolute -top-2 -right-2 transform rotate-12">
          <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
            GAGNANT!
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * TicketCardMini - Version compacte pour les listes
 */
export const TicketCardMini = ({
  ticketNumber,
  campaignTitle,
  campaignImage,
  campaignStatus,
  type = 'standard',
  prizeCategory,
  isWinner = false,
  onClick,
  isDarkMode = false,
}) => {
  // Déterminer le statut réel du ticket
  const isTicketWinner = isWinner || prizeCategory === 'main' || prizeCategory === 'bonus';
  const isCampaignEnded = campaignStatus === 'completed' || campaignStatus === 'closed' || campaignStatus === 'drawn';
  const isLost = isCampaignEnded && !isTicketWinner;
  
  const ticketType = prizeCategory === 'main' ? 'winner' : 
                     prizeCategory === 'bonus' ? 'bonus' : 
                     isWinner ? 'winner' : 
                     isLost ? 'lost' : type;

  const getBgColor = () => {
    switch (ticketType) {
      case 'winner':
        return isDarkMode 
          ? 'bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border-yellow-500/50' 
          : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-yellow-300';
      case 'bonus':
        return isDarkMode 
          ? 'bg-gradient-to-r from-purple-900/50 to-violet-900/50 border-purple-500/50' 
          : 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-300';
      case 'lost':
        return isDarkMode 
          ? 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-600/50' 
          : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300';
      default:
        return isDarkMode 
          ? 'bg-gradient-to-r from-indigo-900/50 to-blue-900/50 border-indigo-500/50' 
          : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200';
    }
  };

  const getIcon = () => {
    switch (ticketType) {
      case 'winner':
        return <TrophyIcon className="w-5 h-5 text-yellow-500" />;
      case 'bonus':
        return <span className="text-lg">🎁</span>;
      case 'lost':
        return <span className="text-lg">😔</span>;
      default:
        return <TicketIcon className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getLabel = () => {
    switch (ticketType) {
      case 'winner':
        return 'Gagnant';
      case 'bonus':
        return 'Bonus';
      case 'lost':
        return 'Perdu';
      default:
        return 'Actif';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer
        transition-all duration-200 hover:scale-102 hover:shadow-lg
        ${getBgColor()}
      `}
    >
      {/* Image de campagne miniature */}
      {campaignImage && (
        <img 
          src={campaignImage} 
          alt=""
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className={`font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {ticketNumber}
          </span>
        </div>
        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {campaignTitle}
        </p>
      </div>

      <span className={`
        px-2 py-1 rounded-full text-xs font-semibold
        ${ticketType === 'winner' 
          ? 'bg-yellow-500/20 text-yellow-500' 
          : ticketType === 'bonus'
            ? 'bg-purple-500/20 text-purple-500'
            : ticketType === 'lost'
              ? 'bg-gray-500/20 text-gray-500'
              : 'bg-green-500/20 text-green-500'
        }
      `}>
        {getLabel()}
      </span>
    </div>
  );
};

export default TicketCard;
