import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignsAPI } from '../services/api';
import { LogoKolo } from '../components/LogoKolo';
import { TrophyIcon, TicketIcon, UsersIcon, TargetIcon, SettingsIcon, ChartIcon } from '../components/Icons';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LogoKolo size="medium" animated />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KOLO</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated() ? (
                <>
                  <span className="text-gray-700 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                    <span>{user.name}</span>
                  </span>
                  <Link
                    to={isAdmin() ? '/admin' : '/profile'}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    {isAdmin() ? (
                      <>
                        <SettingsIcon className="w-5 h-5" />
                        <span>Admin</span>
                      </>
                    ) : (
                      <>
                        <ChartIcon className="w-5 h-5" />
                        <span>Mon Profil</span>
                      </>
                    )}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Se connecter
                  </Link>
                  <Link
                    to="/register"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                  >
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Slogan */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            KOLO, <span className="text-indigo-600">Là où un ticket peut changer une vie</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Une <strong>opportunité réelle</strong> de devenir propriétaire et de bâtir un nouvel avenir.
          </p>
          
          {!isAuthenticated() && (
            <Link
              to="/register"
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg text-base transition-colors shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Commencer maintenant</span>
            </Link>
          )}
        </div>
      </section>

      {/* Current Campaign Section - MIS EN AVANT */}
      {campaign && (
        <section className="py-8 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Campaign Card - Inspired by Major Lottery Sites */}
            <Link 
              to={`/campaigns/${campaign.id}`}
              className="block bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              {/* Hero Image Section */}
              <div className="relative h-80 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
                {campaign.image_url ? (
                  <img
                    src={campaign.image_url}
                    alt={campaign.title}
                    className="w-full h-full object-cover opacity-90"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <TrophyIcon className="w-32 h-32 mx-auto mb-4" />
                      <p className="text-2xl font-bold">Grande Tombola KOLO</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay Badge - Prize Amount */}
                <div className="absolute top-6 right-6 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full shadow-lg">
                  <p className="text-sm font-semibold">GAGNEZ</p>
                  <p className="text-2xl font-bold">{campaign.main_prize}</p>
                </div>

                {/* Closing Date Badge */}
                <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm text-gray-900 px-6 py-3 rounded-xl shadow-lg">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Clôture</p>
                  <p className="text-lg font-bold text-red-600">
                    {new Date(campaign.end_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Campaign Details */}
              <div className="p-8">
                <div className="mb-6">
                  <h4 className="text-4xl font-bold text-gray-900 mb-3">{campaign.title}</h4>
                  <p className="text-lg text-gray-600 leading-relaxed">{campaign.description}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 text-center border border-indigo-200">
                    <p className="text-sm text-indigo-600 font-semibold mb-1">Prix du Ticket</p>
                    <p className="text-3xl font-bold text-indigo-900">${campaign.ticket_price}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
                    <p className="text-sm text-green-600 font-semibold mb-1">Tickets Vendus</p>
                    <p className="text-3xl font-bold text-green-900">{campaign.sold_tickets}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200">
                    <p className="text-sm text-orange-600 font-semibold mb-1">Tickets Restants</p>
                    <p className="text-3xl font-bold text-orange-900">{campaign.total_tickets - campaign.sold_tickets}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
                    <p className="text-sm text-purple-600 font-semibold mb-1">Taux de Remplissage</p>
                    <p className="text-3xl font-bold text-purple-900">{occupationRate}%</p>
                  </div>
                </div>

                {/* Progress Bar - Powerball Style */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700">Progression de la Campagne</span>
                    <span className="text-sm font-bold text-indigo-600">{campaign.sold_tickets} / {campaign.total_tickets} tickets</span>
                  </div>
                  <div className="relative w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ width: `${occupationRate}%` }}
                    >
                      {occupationRate > 10 && (
                        <span className="text-xs font-bold text-white drop-shadow">{occupationRate}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTA Button - Large and Prominent */}
                <div className="text-center">
                  {isAuthenticated() ? (
                    <Link
                      to="/buy"
                      className="inline-flex items-center justify-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-12 py-5 rounded-full text-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform"
                    >
                      <TicketIcon className="w-7 h-7" />
                      <span>Acheter mes Tickets Maintenant</span>
                    </Link>
                  ) : (
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold px-12 py-5 rounded-full text-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform"
                    >
                      ✨ S'inscrire pour Participer
                    </Link>
                  )}
                  <p className="mt-4 text-sm text-gray-500">
                    🔒 Paiement sécurisé via Mobile Money
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};
