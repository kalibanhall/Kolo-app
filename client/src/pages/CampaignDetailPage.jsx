import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TicketIcon, TrophyIcon, MoneyIcon, UsersIcon } from '../components/Icons';

export const CampaignDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      // Note: Vous devrez créer cet endpoint dans le backend
      const response = await campaignsAPI.getById(id);
      setCampaign(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTickets = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/buy');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Campagne introuvable</h2>
            <p className="text-gray-600 mb-6">{error || 'Cette campagne n\'existe pas ou a été supprimée.'}</p>
            <Link
              to="/"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const occupationRate = (campaign.sold_tickets / campaign.total_tickets) * 100;
  const availableTickets = campaign.total_tickets - campaign.sold_tickets;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Navbar />
      <div className="h-14 sm:h-16" /> {/* Spacer for fixed navbar */}

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 inline-block">
            ← Retour à l'accueil
          </Link>
          <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 ml-4 ${
            campaign.status === 'open' ? 'bg-green-100 text-green-800' :
            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
            campaign.status === 'closed' ? 'bg-gray-100 text-gray-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {campaign.status === 'open' || campaign.status === 'active' ? 'OUVERT' : 
             campaign.status === 'closed' ? 'FERMÉ' : 
             'TIRAGE EFFECTUÉ'}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Section */}
          <div>
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="w-full h-96 object-cover rounded-2xl shadow-xl"
              />
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl shadow-xl flex items-center justify-center">
                <TrophyIcon className="w-32 h-32 text-indigo-300" />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{campaign.title}</h1>
            
            <div className="flex items-center space-x-6 mb-6">
              <div className="flex items-center space-x-2">
                <TrophyIcon className="w-6 h-6 text-yellow-500" />
                <span className="text-lg font-semibold text-gray-900">{campaign.main_prize}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <TicketIcon className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Prix du ticket</p>
                    <p className="text-xl font-bold text-gray-900">{campaign.ticket_price} $</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <UsersIcon className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Tickets achetés</p>
                    <p className="text-xl font-bold text-gray-900">{campaign.sold_tickets} / {campaign.total_tickets}</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progression de la Campagne</span>
                  <span>{campaign.sold_tickets} / {campaign.total_tickets} tickets</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${occupationRate}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {availableTickets} tickets disponibles
                </p>
              </div>
            </div>

            {/* CTA Button */}
            {(campaign.status === 'open' || campaign.status === 'active') && availableTickets > 0 && (
              <button
                onClick={handleBuyTickets}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
              >
                <TicketIcon className="inline-block w-6 h-6 mr-2" />
                Obtenir mes tickets
              </button>
            )}

            {campaign.status === 'closed' && (
              <div className="bg-gray-100 text-gray-700 py-4 px-6 rounded-xl text-center font-semibold">
                Cette campagne est fermée
              </div>
            )}

            {availableTickets === 0 && (
              <div className="bg-yellow-100 text-yellow-800 py-4 px-6 rounded-xl text-center font-semibold">
                Tous les tickets ont été achetés
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {campaign.description || 'Aucune description disponible.'}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CampaignDetailPage;
