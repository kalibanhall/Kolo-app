import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LogoKolo } from '../components/LogoKolo';
import { TicketIcon, TrophyIcon } from '../components/Icons';
import ImageSlider from '../components/ImageSlider';

export const CampaignDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const loadCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getById(id);
      setCampaign(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCampaign();
    
    // Auto-refresh every 30 seconds to keep data updated
    const interval = setInterval(loadCampaign, 30000);
    return () => clearInterval(interval);
  }, [loadCampaign]);

  // Compute all prize images
  const allCampaignImages = React.useMemo(() => {
    if (!campaign) return [];
    const images = [];
    const prizeImgs = typeof campaign.prize_images === 'string'
      ? ((() => { try { return JSON.parse(campaign.prize_images); } catch { return []; } })())
      : (campaign.prize_images || []);
    images.push(...prizeImgs);
    if (campaign.image_url && !images.includes(campaign.image_url)) {
      images.push(campaign.image_url);
    }
    return images;
  }, [campaign]);

  // Auto-slide prize images every 4 seconds
  useEffect(() => {
    if (allCampaignImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % allCampaignImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [allCampaignImages.length]);

  const handleBuyTickets = () => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/campaigns/${id}` } });
    } else {
      navigate(`/buy/${id}`);
    }
  };

  const formatCurrency = (amount) => {
    return '$' + new Intl.NumberFormat('en-US').format(amount);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${
            isDarkMode ? 'border-cyan-500' : 'border-blue-600'
          }`} />
          <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className={`min-h-screen ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
      }`}>
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-lg border-b transition-colors ${
          isDarkMode 
            ? 'bg-gray-900/80 border-gray-700' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'text-cyan-400 hover:bg-gray-800' 
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Retour</span>
            </button>
            
            <LogoKolo size="small" />
            
            <div className="w-24"></div>
          </div>
        </header>

        <div className="max-w-md mx-auto px-4 py-20">
          <div className={`rounded-2xl p-8 text-center ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-xl'
          }`}>
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
            }`}>
              <svg className={`w-8 h-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Campagne introuvable
            </h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {error || 'Cette campagne n\'existe pas ou a été supprimée.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableTickets = campaign.total_tickets - campaign.sold_tickets;
  const isOpen = campaign.status === 'open' || campaign.status === 'active';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 backdrop-blur-lg border-b transition-colors ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105 ${
              isDarkMode 
                ? 'text-cyan-400 hover:bg-gray-800' 
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour</span>
          </button>
          
          <div className="flex items-center gap-3">
            <LogoKolo size="small" />
            <span className={`hidden sm:block text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Détails Campagne
            </span>
          </div>
          
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
            isOpen
              ? isDarkMode ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-green-100 text-green-800'
              : campaign.status === 'closed'
                ? isDarkMode ? 'bg-gray-700 text-gray-400 border border-gray-600' : 'bg-gray-100 text-gray-800'
                : isDarkMode ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-blue-100 text-blue-800'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`}></span>
            {isOpen ? 'CAMPAGNE OUVERTE' : campaign.status === 'closed' ? 'CAMPAGNE FERMÉE' : 'TIRAGE EFFECTUÉ'}
          </span>
        </div>

        {/* Main Prize Card */}
        <div className={`relative rounded-3xl overflow-hidden mb-8 ${
          isDarkMode 
            ? 'bg-gradient-to-r from-cyan-900/50 via-blue-900/50 to-indigo-900/50 border border-gray-700' 
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
        }`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <div className="relative p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <TrophyIcon className="w-10 h-10 text-yellow-400" />
              <p className="text-white/80 text-lg">Prix Principal</p>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              {campaign.main_prize}
            </h1>
            <p className="text-white/70">{campaign.title}</p>
          </div>
        </div>

        {/* Image Section - Prize Images Carousel (swipeable) */}
        {allCampaignImages.length > 0 && (
          <ImageSlider
            images={allCampaignImages}
            currentIndex={currentImageIndex}
            onIndexChange={setCurrentImageIndex}
            alt={campaign.title}
            className="h-64 sm:h-80 md:h-96"
            containerClassName={`rounded-2xl overflow-hidden mb-8 ${isDarkMode ? 'border border-gray-700' : 'shadow-xl'}`}
            showArrows={true}
            showDots={true}
            showCounter={true}
            dotsPosition="below"
            isDarkMode={isDarkMode}
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Available Tickets - Main Stat */}
          <div className={`col-span-2 rounded-2xl p-6 text-center ${
            isDarkMode 
              ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-800' 
              : 'bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <TicketIcon className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <p className={`text-base font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                Tickets Disponibles
              </p>
            </div>
            <p className={`text-4xl sm:text-5xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
              {availableTickets.toLocaleString('fr-FR')}
            </p>
          </div>

          {/* Ticket Price */}
          <div className={`rounded-2xl p-5 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-lg'
          }`}>
            <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Prix du ticket</p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
              {formatCurrency(campaign.ticket_price)}
            </p>
          </div>

          {/* Total Tickets */}
          <div className={`rounded-2xl p-5 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-lg'
          }`}>
            <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total tickets</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {campaign.total_tickets?.toLocaleString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className={`rounded-2xl overflow-hidden mb-8 ${
          isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-xl'
        }`}>
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Description
            </h3>
          </div>
          <div className="p-6">
            <p className={`leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {campaign.description || 'Aucune description disponible.'}
            </p>
          </div>
        </div>

        {/* Secondary Prizes - Only show if they exist */}
        {(campaign.secondary_prizes || campaign.third_prize) && (
          <div className={`rounded-2xl overflow-hidden mb-8 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-xl'
          }`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                🎁 Autres Prix à Gagner
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campaign.secondary_prizes && (
                <div className={`p-4 rounded-xl text-center ${
                  isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>🥈 2ème Prix</p>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{campaign.secondary_prizes}</p>
                </div>
              )}
              {campaign.third_prize && (
                <div className={`p-4 rounded-xl text-center ${
                  isDarkMode ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'
                }`}>
                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>🥉 3ème Prix</p>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>{campaign.third_prize}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className={`rounded-2xl overflow-hidden ${
          isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-xl'
        }`}>
          <div className="p-6">
            {isOpen && availableTickets > 0 ? (
              <>
                <button
                  onClick={handleBuyTickets}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <TicketIcon className="w-6 h-6" />
                  Acheter mes Tickets
                </button>
                <p className={`text-center text-xs mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Paiement sécurisé via Mobile Money ou Portefeuille KOLO
                </p>
              </>
            ) : availableTickets === 0 ? (
              <div className={`text-center py-4 px-6 rounded-xl ${
                isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
              }`}>
                <p className="font-semibold">Tous les tickets ont été vendus !</p>
              </div>
            ) : (
              <div className={`text-center py-4 px-6 rounded-xl ${
                isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700'
              }`}>
                <p className="font-semibold">Cette campagne est fermée</p>
              </div>
            )}
          </div>
        </div>

        {/* Terms Link */}
        <div className="text-center mt-6">
          <Link 
            to="/terms" 
            className={`text-sm ${isDarkMode ? 'text-gray-500 hover:text-cyan-400' : 'text-gray-500 hover:text-blue-600'} transition-colors`}
          >
            Voir les conditions générales d'utilisation →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailPage;
