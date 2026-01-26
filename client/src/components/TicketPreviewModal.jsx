import React from 'react';

/**
 * TicketPreviewModal - Modal de prévisualisation d'un ticket avec design premium
 * Basé sur le design visuel #KOMA PROPRIÉTAIRE
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si le modal est ouvert
 * @param {function} props.onClose - Callback pour fermer le modal
 * @param {string} props.ticketNumber - Numéro du ticket (ex: "KB-01")
 * @param {string} props.ownerName - Nom du propriétaire
 * @param {string} props.campaignTitle - Titre de la campagne
 * @param {boolean} props.isWinner - Si c'est un ticket gagnant
 * @param {string} props.prize - Prix gagné (pour les gagnants)
 * @param {boolean} props.isDarkMode - Mode sombre
 */
const TicketPreviewModal = ({
  isOpen,
  onClose,
  ticketNumber,
  ownerName = 'Propriétaire',
  campaignTitle = 'KOMA',
  isWinner = false,
  prize,
  isDarkMode = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm animate-scale-in"
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

        {/* Ticket Card avec effet 3D */}
        <div 
          className="relative transform transition-transform hover:scale-105"
          style={{
            perspective: '1000px',
          }}
        >
          <div 
            className="relative"
            style={{
              transform: 'rotateY(-5deg) rotateX(2deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Ombre portée */}
            <div 
              className="absolute inset-0 bg-black/30 rounded-2xl blur-xl"
              style={{
                transform: 'translateY(20px) translateX(10px) scale(0.95)',
              }}
            />

            {/* Le ticket principal */}
            <div className="relative">
              {/* Structure du ticket avec encoches */}
              <svg 
                viewBox="0 0 320 220" 
                className="w-full h-auto drop-shadow-2xl"
                style={{ filter: 'drop-shadow(8px 8px 16px rgba(0,0,0,0.3))' }}
              >
                {/* Définitions */}
                <defs>
                  {/* Gradient principal */}
                  <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="50%" stopColor="#6D28D9" />
                    <stop offset="100%" stopColor="#5B21B6" />
                  </linearGradient>
                  
                  {/* Gradient gagnant */}
                  <linearGradient id="winnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                  
                  {/* Clip path pour les encoches du ticket */}
                  <clipPath id="ticketShape">
                    {/* Rectangle principal avec encoches sur le côté droit */}
                    <path d="
                      M 12 0 
                      H 308 
                      Q 320 0 320 12
                      V 60
                      Q 320 66 314 66
                      Q 308 66 308 72
                      Q 308 78 314 78
                      Q 320 78 320 84
                      V 136
                      Q 320 142 314 142
                      Q 308 142 308 148
                      Q 308 154 314 154
                      Q 320 154 320 160
                      V 208
                      Q 320 220 308 220
                      H 12
                      Q 0 220 0 208
                      V 12
                      Q 0 0 12 0
                      Z
                    " />
                  </clipPath>
                  
                  {/* Ombre intérieure */}
                  <filter id="innerShadow">
                    <feOffset dx="0" dy="2" />
                    <feGaussianBlur stdDeviation="2" result="offset-blur" />
                    <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                    <feFlood floodColor="black" floodOpacity="0.3" result="color" />
                    <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                    <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                  </filter>
                </defs>
                
                {/* Fond du ticket */}
                <rect 
                  x="0" y="0" 
                  width="320" height="220" 
                  fill={isWinner ? "url(#winnerGradient)" : "url(#ticketGradient)"}
                  clipPath="url(#ticketShape)"
                  rx="12"
                />
                
                {/* Bordure intérieure */}
                <rect 
                  x="8" y="8" 
                  width="304" height="204" 
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                  rx="8"
                  clipPath="url(#ticketShape)"
                />
                
                {/* Texte #KOMA */}
                <text 
                  x="24" y="52" 
                  fill="white" 
                  fontSize="32" 
                  fontWeight="800" 
                  fontFamily="Arial, sans-serif"
                  letterSpacing="2"
                >
                  #{campaignTitle?.toUpperCase() || 'KOMA'}
                </text>
                
                {/* Texte PROPRIÉTAIRE */}
                <text 
                  x="24" y="75" 
                  fill="rgba(255,255,255,0.85)" 
                  fontSize="14" 
                  fontWeight="500" 
                  fontFamily="Arial, sans-serif"
                  letterSpacing="3"
                >
                  PROPRIÉTAIRE
                </text>
                
                {/* Zone blanche pour le numéro */}
                <rect 
                  x="20" y="90" 
                  width="280" height="50" 
                  fill="white"
                  rx="6"
                  filter="url(#innerShadow)"
                />
                
                {/* Numéro du ticket */}
                <text 
                  x="160" y="125" 
                  fill="#1F2937" 
                  fontSize="28" 
                  fontWeight="800" 
                  fontFamily="'Courier New', monospace"
                  textAnchor="middle"
                  letterSpacing="4"
                >
                  {ticketNumber}
                </text>
                
                {/* Nom du propriétaire (si fourni) */}
                {ownerName && ownerName !== 'Propriétaire' && (
                  <text 
                    x="160" y="108" 
                    fill="#6B7280" 
                    fontSize="10" 
                    fontWeight="500" 
                    fontFamily="Arial, sans-serif"
                    textAnchor="middle"
                  >
                    {ownerName}
                  </text>
                )}
                
                {/* Ligne pointillée décorative */}
                <line 
                  x1="24" y1="155" 
                  x2="296" y2="155" 
                  stroke="rgba(255,255,255,0.3)" 
                  strokeWidth="1" 
                  strokeDasharray="4 4"
                />
                
                {/* Texte TICKET NUMBER / TICKET GAGNANT */}
                <text 
                  x="24" y="185" 
                  fill="white" 
                  fontSize="13" 
                  fontWeight="600" 
                  fontFamily="Arial, sans-serif"
                  letterSpacing="1"
                >
                  {isWinner ? 'TICKET GAGNANT' : 'TICKET NUMBER'}
                </text>
                
                {/* Logo Kolo - Icône K */}
                <g transform="translate(220, 165)">
                  {/* Flèche/Check cyan */}
                  <path 
                    d="M 0 15 L 15 0 L 25 10 L 15 5 Z" 
                    fill="#22D3EE"
                  />
                  {/* Texte Kolo */}
                  <text 
                    x="30" y="15" 
                    fill="white" 
                    fontSize="16" 
                    fontWeight="700" 
                    fontFamily="Arial, sans-serif"
                  >
                    Kolo
                  </text>
                </g>
                
                {/* Badge gagnant */}
                {isWinner && (
                  <g transform="translate(250, 20)">
                    <circle cx="20" cy="20" r="22" fill="#EF4444" />
                    <text 
                      x="20" y="25" 
                      fill="white" 
                      fontSize="10" 
                      fontWeight="800" 
                      fontFamily="Arial, sans-serif"
                      textAnchor="middle"
                    >
                      WIN!
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Informations sous le ticket */}
        <div className={`mt-6 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
          <p className="text-sm opacity-80">
            {isWinner ? '🏆 Félicitations ! Ce ticket a gagné !' : '🎟️ Bonne chance pour le tirage !'}
          </p>
          {isWinner && prize && (
            <p className="mt-2 text-lg font-bold text-yellow-400">
              Prix : {prize}
            </p>
          )}
        </div>

        {/* Bouton de partage (optionnel) */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={onClose}
            className={`px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
            }`}
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
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
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
