import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ticketsAPI, campaignsAPI } from '../services/api';
import { TicketIcon, TrophyIcon } from '../components/Icons';

export const BuyTicketsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState(''); // Store only digits without +243
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { 
        state: { 
          message: 'Vous devez vous connecter pour acheter des tickets',
          from: '/buy' 
        } 
      });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadCampaign();
    // Extract phone number without +243 if user has one
    if (user?.phone) {
      const cleanPhone = user.phone.replace('+243', '').replace(/\D/g, '');
      setPhoneNumber(cleanPhone);
    }
  }, [user]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCurrent();
      setCampaign(response.data);
    } catch (err) {
      setError('Impossible de charger la campagne active');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!campaign) {
      setError('Aucune campagne active');
      return;
    }

    if (ticketCount < 1 || ticketCount > 10) {
      setError('Vous pouvez acheter entre 1 et 10 tickets à la fois');
      return;
    }

    if (phoneNumber.length !== 9) {
      setError('Le numéro de téléphone doit contenir 9 chiffres');
      return;
    }

    try {
      setPurchasing(true);
      const response = await ticketsAPI.purchase({
        campaign_id: campaign.id,
        ticket_count: ticketCount,
        phone_number: `+243${phoneNumber}`, // Add +243 prefix
      });

      setSuccess(true);
      alert('Achat initié ! Vous allez recevoir une notification de paiement sur votre téléphone.');
      
      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'achat');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!campaign || campaign.status !== 'open') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <span className="text-6xl mb-4 block">🚫</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Aucune campagne active
          </h2>
          <p className="text-gray-600 mb-6">
            Il n'y a pas de tombola ouverte pour le moment. Revenez plus tard !
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const totalPrice = ticketCount * campaign.ticket_price;
  const availableTickets = campaign.total_tickets - campaign.sold_tickets;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center space-x-2">
            <TicketIcon className="w-8 h-8" />
            <span>Acheter des tickets</span>
          </h1>
          <p className="text-gray-600">
            {campaign.title}
          </p>
        </div>

        {/* Campaign Info Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <TrophyIcon className="w-7 h-7" />
            <span>{campaign.main_prize}</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-200 text-sm">Prix du ticket</p>
              <p className="text-2xl font-bold">${campaign.ticket_price}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-blue-200 text-sm">Tickets restants</p>
              <p className="text-2xl font-bold">{availableTickets}</p>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">❌ {error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">✅ Achat initié avec succès ! Vérifiez votre téléphone.</p>
            </div>
          )}

          <form onSubmit={handlePurchase} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de tickets (max 10)
              </label>
              <input
                type="number"
                value={ticketCount}
                onChange={(e) => setTicketCount(parseInt(e.target.value))}
                min="1"
                max="10"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone (Mobile Money)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-medium">
                  +243
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  required
                  maxLength="9"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="812345678"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Vous recevrez une notification USSD pour confirmer le paiement
              </p>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Prix unitaire</span>
                <span className="font-semibold">${campaign.ticket_price}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Quantité</span>
                <span className="font-semibold">{ticketCount} ticket{ticketCount > 1 ? 's' : ''}</span>
              </div>
              <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold text-gray-900">
                <span>Total à payer</span>
                <span className="text-blue-600">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={purchasing || availableTickets === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              {purchasing ? 'Traitement...' : `💳 Payer $${totalPrice.toFixed(2)}`}
            </button>
          </form>

          {/* Payment Methods */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3 font-medium">Méthodes de paiement acceptées :</p>
            <div className="flex justify-center space-x-4">
              <div className="bg-orange-50 px-4 py-2 rounded-lg">
                <p className="text-sm font-semibold text-orange-700">🟠 Orange Money</p>
              </div>
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <p className="text-sm font-semibold text-green-700">📱 M-Pesa</p>
              </div>
              <div className="bg-red-50 px-4 py-2 rounded-lg">
                <p className="text-sm font-semibold text-red-700">📡 Airtel Money</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
