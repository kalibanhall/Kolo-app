import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignsAPI } from '../services/api';
import { Navbar } from '../components/Navbar';
import { TrophyIcon, TicketIcon, UsersIcon, TargetIcon } from '../components/Icons';
import Footer from '../components/Footer';

export const HomePage = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaign();
  }, []);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCurrent();
      setCampaign(response.data);
    } catch (err) {
      console.error('Failed to load campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const occupationRate = campaign
    ? ((campaign.sold_tickets / campaign.total_tickets) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Navbar */}
      <Navbar />
      
      {/* Spacer for fixed navbar */}
      <div className="h-14 sm:h-16" />

      {/* Hero Section - Slogan */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            KOLO, <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Là où un ticket peut changer une vie</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Une <strong>opportunité réelle</strong> de devenir propriétaire et de bâtir un nouvel avenir.
          </p>
          
          {!isAuthenticated() && (
            <Link
              to="/register"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Commencer maintenant</span>
            </Link>
          )}
        </div>
      </section>

      {/* Current Campaign Section - MIS EN AVANT */}
      {campaign && (
        <section id="campagnes" className="py-6 sm:py-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            {/* Campaign Card - Modern Lottery Design */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
              {/* Hero Image Section - Cliquable pour voir les détails */}
              <Link 
                to={`/campaigns/${campaign.id}`}
                className="block relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden cursor-pointer group">
                {campaign.image_url ? (
                  <img
                    src={campaign.image_url}
                    alt={campaign.title}
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <TrophyIcon className="w-16 sm:w-24 md:w-32 h-16 sm:h-24 md:h-32 mx-auto mb-2 sm:mb-4" />
                      <p className="text-lg sm:text-2xl font-bold">Grande Tombola KOLO</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay Badge - See More */}
                <div className="absolute top-3 right-3 sm:top-6 sm:right-6 bg-yellow-400 text-gray-900 px-3 py-1.5 sm:px-6 sm:py-3 rounded-full shadow-lg hover:bg-yellow-300 transition cursor-pointer">
                  <p className="text-xs sm:text-sm font-semibold">Voir plus...</p>
                </div>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-white/90 text-gray-900 px-4 py-2 sm:px-6 sm:py-3 rounded-full font-semibold shadow-lg text-sm sm:text-base">
                    Voir les détails →
                  </span>
                </div>
              </Link>

              {/* CTA Button - Just below image */}
              <div className="px-4 sm:px-8 -mt-6 sm:-mt-8 relative z-10">
                {isAuthenticated() ? (
                  <Link
                    to="/buy"
                    className="flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
                  >
                    <TicketIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    <span>Acheter mes Tickets</span>
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
                  >
                    S'inscrire pour Participer
                  </Link>
                )}
              </div>

              {/* Campaign Details */}
              <div className="p-4 sm:p-6 md:p-8">
                <div className="mb-4 sm:mb-6">
                  <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{campaign.title}</h4>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-none">{campaign.description}</p>
                </div>

                {/* Stats Grid - Responsive */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-indigo-200 dark:border-indigo-700">
                    <p className="text-[10px] sm:text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-0.5">Prix</p>
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-indigo-900 dark:text-indigo-100">${campaign.ticket_price}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-green-200 dark:border-green-700">
                    <p className="text-[10px] sm:text-sm text-green-600 dark:text-green-400 font-semibold mb-0.5">Vendus</p>
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">{campaign.sold_tickets}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center border border-orange-200 dark:border-orange-700">
                    <p className="text-[10px] sm:text-sm text-orange-600 dark:text-orange-400 font-semibold mb-0.5">Restants</p>
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">{campaign.total_tickets - campaign.sold_tickets}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progression</span>
                    <span className="font-semibold">{occupationRate}%</span>
                  </div>
                  <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(occupationRate, 100)}%` }}
                    />
                  </div>
                </div>

                <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Paiement sécurisé via Mobile Money
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};
