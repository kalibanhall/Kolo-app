import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignsAPI } from '../services/api';
import { Navbar } from '../components/Navbar';
import { TrophyIcon, TicketIcon, UsersIcon, TargetIcon } from '../components/Icons';
import Footer from '../components/Footer';

export const HomePage = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Auto-slide toutes les 6 secondes
  useEffect(() => {
    if (campaigns.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % campaigns.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [campaigns.length]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getActive();
      setCampaigns(response.data || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      // Fallback to single campaign
      try {
        const response = await campaignsAPI.getCurrent();
        if (response.data) setCampaigns([response.data]);
      } catch (e) {
        console.error('Failed to load current campaign:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + campaigns.length) % campaigns.length);
  }, [campaigns.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % campaigns.length);
  }, [campaigns.length]);

  const currentCampaign = campaigns[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Navbar */}
      <Navbar />
      
      {/* Spacer for fixed navbar */}
      <div className="h-14 sm:h-16" />

      {/* Hero Section - Slogan */}
      <section className="py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            KOLO, <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Là où un ticket peut changer une vie</span>
          </h2>
          <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Une <strong>opportunité réelle</strong> de devenir propriétaire et de bâtir un nouvel avenir.
          </p>
        </div>
      </section>

      {/* Campaigns Slider Section */}
      {campaigns.length > 0 && currentCampaign && (
        <section id="campagnes" className="py-4 sm:py-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            {/* Slider Container */}
            <div className="relative">
              {/* Navigation Arrows (only if multiple campaigns) */}
              {campaigns.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 -ml-2 sm:-ml-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition group"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 -mr-2 sm:-mr-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition group"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Campaign Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-500">
                {/* Hero Image Section */}
                <Link 
                  to={`/campaigns/${currentCampaign.id}`}
                  className="block relative h-44 sm:h-60 md:h-72 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden cursor-pointer group">
                  {currentCampaign.image_url ? (
                    <img
                      src={currentCampaign.image_url}
                      alt={currentCampaign.title}
                      className="w-full h-full object-cover object-center opacity-90 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <TrophyIcon className="w-14 sm:w-20 md:w-28 h-14 sm:h-20 md:h-28 mx-auto mb-2" />
                        <p className="text-base sm:text-xl font-bold">Grande Tombola KOLO</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Featured Badge */}
                  {currentCampaign.is_featured && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full shadow-lg">
                      <p className="text-xs font-bold">⭐ EN VEDETTE</p>
                    </div>
                  )}
                  
                  {/* Campaign Counter Badge */}
                  {campaigns.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                      <p className="text-xs font-medium">{currentIndex + 1} / {campaigns.length}</p>
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 text-gray-900 px-4 py-2 rounded-full font-semibold shadow-lg text-sm">
                      Voir les détails →
                    </span>
                  </div>
                </Link>

                {/* CTA Button */}
                <div className="px-4 sm:px-8 -mt-5 sm:-mt-7 relative z-10">
                  {isAuthenticated() ? (
                    <Link
                      to="/buy"
                      className="flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold px-4 py-3 sm:py-4 rounded-xl text-sm sm:text-base transition-all duration-300 shadow-xl hover:shadow-2xl"
                    >
                      <TicketIcon className="w-5 h-5 mr-2" />
                      <span>Acheter mes Tickets</span>
                    </Link>
                  ) : (
                    <Link
                      to="/register"
                      className="flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold px-4 py-3 sm:py-4 rounded-xl text-sm sm:text-base transition-all duration-300 shadow-xl hover:shadow-2xl"
                    >
                      S'inscrire pour Participer
                    </Link>
                  )}
                </div>

                {/* Campaign Details */}
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <h4 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentCampaign.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{currentCampaign.description}</p>
                  </div>

                  {/* Prizes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-800/30 rounded-xl p-3 text-center border border-yellow-200 dark:border-yellow-700">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">🥇 1er Prix</p>
                      <p className="text-sm sm:text-base font-bold text-yellow-700 dark:text-yellow-300 truncate">{currentCampaign.main_prize}</p>
                    </div>
                    {currentCampaign.secondary_prizes && (
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-700/30 dark:to-slate-800/30 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">🥈 2ème Prix</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{currentCampaign.secondary_prizes}</p>
                      </div>
                    )}
                    {currentCampaign.third_prize && (
                      <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-800/30 rounded-xl p-3 text-center border border-orange-200 dark:border-orange-700">
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">🥉 3ème Prix</p>
                        <p className="text-sm font-bold text-orange-700 dark:text-orange-300 truncate">{currentCampaign.third_prize}</p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <TicketIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">Disponibles</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">
                      {(currentCampaign.total_tickets - currentCampaign.sold_tickets).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dots Indicator */}
              {campaigns.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {campaigns.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        index === currentIndex
                          ? 'bg-indigo-600 w-6'
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && campaigns.length === 0 && (
        <section className="py-12 text-center">
          <TrophyIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aucune campagne active pour le moment</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Revenez bientôt !</p>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};
