import React from 'react';

/**
 * TicketPreviewModal - Modal de prévisualisation d'un ticket
 * Utilise les images exactes du design KOMA
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si le modal est ouvert
 * @param {function} props.onClose - Callback pour fermer le modal
 * @param {string} props.ticketNumber - Numéro du ticket (ex: "KB-01")
 * @param {string} props.ownerName - Nom du propriétaire
 * @param {boolean} props.isWinner - Si c'est un ticket gagnant
 * @param {string} props.prize - Prix gagné (pour les gagnants)
 * @param {string} props.prizeCategory - Catégorie: 'main' | 'bonus'
 */
const TicketPreviewModal = ({
  isOpen,
  onClose,
  ticketNumber,
  ownerName,
  isWinner = false,
  prize,
  prizeCategory,
}) => {
  if (!isOpen) return null;

  // Déterminer quelle image utiliser
  const getTicketImage = () => {
    if (isWinner || prizeCategory === 'main') {
      return '/ticket gagnant.png';
    }
    if (prizeCategory === 'bonus') {
      return '/ticket bonus.png';
    }
    return '/ticket number.png';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Conteneur du ticket avec effet 3D */}
        <div 
          className="relative"
          style={{
            perspective: '1000px',
          }}
        >
          <div 
            className="relative transform transition-transform duration-300 hover:scale-105"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Image du ticket */}
            <img 
              src={getTicketImage()} 
              alt="Ticket Kolo"
              className="w-full h-auto rounded-lg"
              style={{
                filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))',
              }}
            />
            
            {/* Numéro du ticket superposé sur la zone blanche */}
            <div 
              className="absolute flex items-center justify-center"
              style={{
                top: '42%',
                left: '7%',
                width: '86%',
                height: '20%',
              }}
            >
              <span 
                className="text-gray-800 font-bold tracking-wider"
                style={{
                  fontSize: 'clamp(1.2rem, 6vw, 2.2rem)',
                  fontFamily: "'Courier New', Consolas, monospace",
                  letterSpacing: '0.15em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {ticketNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Informations sous le ticket */}
        <div className="mt-6 text-center text-white">
          {ownerName && (
            <p className="text-lg font-semibold mb-1">
              {ownerName}
            </p>
          )}
          <p className="text-sm opacity-80">
            {isWinner || prizeCategory === 'main' 
              ? '🏆 Félicitations ! Ce ticket a gagné !' 
              : prizeCategory === 'bonus'
                ? '🎁 Ticket bonus gagnant !'
                : '🎟️ Bonne chance pour le tirage !'}
          </p>
          {(isWinner || prizeCategory) && prize && (
            <p className="mt-2 text-lg font-bold text-yellow-400">
              Prix : {prize}
            </p>
          )}
        </div>

        {/* Bouton fermer */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TicketPreviewModal;
