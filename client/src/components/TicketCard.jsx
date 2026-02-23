import React from 'react';
import { TrophyIcon, TicketIcon } from './Icons';

/**
 * TicketCard - Composant de carte de ticket stylisé avec image KOMA
 * Utilise les images PNG du design dans /public/
 */
// Cache-busting version - increment when ticket images are updated
const TICKET_IMG_VERSION = 'v2';

const TicketCard = ({
  ticketNumber,
  ownerName = 'Propriétaire',
  campaignTitle,
  type = 'standard',
  prize,
  prizeCategory,
  onClick,
  className = '',
  isDarkMode = false,
}) => {
  const ticketType = prizeCategory === 'main' ? 'winner' : 
                     prizeCategory === 'bonus' ? 'bonus' : type;

  const getTicketImage = () => {
    switch (ticketType) {
      case 'winner': return `/ticket-gagnant.png?${TICKET_IMG_VERSION}`;
      case 'bonus': return `/ticket-bonus.png?${TICKET_IMG_VERSION}`;
      default: return `/ticket-number.png?${TICKET_IMG_VERSION}`;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl ${className}`}
    >
      <div className="relative">
        <img 
          src={getTicketImage()} 
          alt={`Ticket ${ticketType}`}
          className="w-full h-auto rounded-lg"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
        />
        {/* Owner name overlay on white zone */}
        <div 
          className="absolute flex items-center justify-center"
          style={{ top: '42%', left: '7%', width: '86%', height: '20%' }}
        >
          <span 
            className="text-gray-800 font-black tracking-wider uppercase text-center"
            style={{
              fontSize: 'clamp(0.7rem, 3vw, 1.2rem)',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              letterSpacing: '0.15em',
            }}
          >
            {ownerName}
          </span>
        </div>
      </div>

      {/* Badge gagnant */}
      {ticketType === 'winner' && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
            GAGNANT!
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * TicketCardMini - Version compacte avec image ticket KOMA
 */
export const TicketCardMini = ({
  ticketNumber,
  ownerName,
  campaignTitle,
  campaignStatus,
  ticketStatus,
  type = 'standard',
  prizeCategory,
  isWinner = false,
  onClick,
  isDarkMode = false,
}) => {
  const isTicketWinner = isWinner || prizeCategory === 'main';
  const isTicketBonus = prizeCategory === 'bonus';
  const isDrawingDone = campaignStatus === 'completed' || campaignStatus === 'drawn';
  const ticketHasResult = ticketStatus === 'winner' || ticketStatus === 'lost';
  const isLost = (isDrawingDone || ticketHasResult) && !isTicketWinner && !isTicketBonus;

  const getTicketImage = () => {
    if (isTicketWinner) return `/ticket-gagnant.png?${TICKET_IMG_VERSION}`;
    if (isTicketBonus) return `/ticket-bonus.png?${TICKET_IMG_VERSION}`;
    return `/ticket-number.png?${TICKET_IMG_VERSION}`;
  };

  const getStatusBadge = () => {
    if (isTicketWinner) return { label: 'Gagnant', color: 'bg-yellow-500/20 text-yellow-500' };
    if (isTicketBonus) return { label: 'Bonus', color: 'bg-purple-500/20 text-purple-500' };
    if (isLost) return { label: 'Perdu', color: 'bg-gray-500/20 text-gray-500' };
    if (campaignStatus === 'closed') return { label: 'En attente', color: 'bg-orange-500/20 text-orange-500' };
    return { label: 'Actif', color: 'bg-green-500/20 text-green-500' };
  };

  const badge = getStatusBadge();

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl rounded-xl overflow-hidden ${
        isDarkMode ? 'bg-gray-800/50' : 'bg-white'
      } shadow-md`}
    >
      {/* Ticket image as card */}
      <div className="relative">
        <img 
          src={getTicketImage()} 
          alt={`Ticket ${ticketNumber}`}
          className={`w-full h-auto ${isLost ? 'opacity-50 grayscale' : ''}`}
          style={{ filter: isLost ? 'grayscale(1) opacity(0.5)' : 'none' }}
        />
        {/* Ticket number on white zone */}
        <div 
          className="absolute flex items-center justify-center"
          style={{ top: '42%', left: '7%', width: '86%', height: '20%' }}
        >
          <span 
            className="text-gray-800 font-black tracking-wider uppercase"
            style={{
              fontSize: 'clamp(0.8rem, 4vw, 1.4rem)',
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              letterSpacing: '0.15em',
            }}
          >
            {ticketNumber}
          </span>
        </div>
      </div>

      {/* Info bar below ticket */}
      <div className={`px-3 py-2 flex items-center justify-between ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <p className={`text-xs truncate flex-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {campaignTitle}
        </p>
        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${badge.color}`}>
          {badge.label}
        </span>
      </div>
    </div>
  );
};

export default TicketCard;
