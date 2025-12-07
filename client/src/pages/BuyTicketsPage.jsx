import React, { useState, useEffect, useMemo } from 'react';
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Selection mode
  const [selectionMode, setSelectionMode] = useState('automatic');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [numberSearchTerm, setNumberSearchTerm] = useState('');
  const [loadingNumbers, setLoadingNumbers] = useState(false);

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
    if (user?.phone) {
      const cleanPhone = user.phone.replace('+243', '').replace(/\D/g, '');
      setPhoneNumber(cleanPhone);
    }
  }, [user]);

  // Load available numbers when manual mode is selected
  useEffect(() => {
    if (selectionMode === 'manual' && campaign) {
      loadAvailableNumbers();
    }
  }, [selectionMode, campaign]);

  // Reset selected numbers when ticket count changes
  useEffect(() => {
    if (selectedNumbers.length > ticketCount) {
      setSelectedNumbers(prev => prev.slice(0, ticketCount));
    }
  }, [ticketCount, selectedNumbers.length]);

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

  const loadAvailableNumbers = async () => {
    if (!campaign) return;
    
    setLoadingNumbers(true);
    try {
      const response = await campaignsAPI.getAvailableNumbers(campaign.id);
      setAvailableNumbers(response.numbers || []);
    } catch (err) {
      console.error('Error loading available numbers:', err);
      // Generate sample numbers if API not available
      const sampleNumbers = [];
      const soldCount = campaign.sold_tickets || 0;
      for (let i = soldCount + 1; i <= Math.min(soldCount + 100, campaign.total_tickets); i++) {
        sampleNumbers.push({
          number: i,
          display: `KOLO-${String(i).padStart(6, '0')}`
        });
      }
      setAvailableNumbers(sampleNumbers);
    } finally {
      setLoadingNumbers(false);
    }
  };

  const toggleNumberSelection = (number) => {
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      }
      if (prev.length >= ticketCount) {
        // Replace the oldest selection
        return [...prev.slice(1), number];
      }
      return [...prev, number];
    });
  };

  const filteredNumbers = useMemo(() => {
    if (!numberSearchTerm) return availableNumbers.slice(0, 100);
    return availableNumbers.filter(n => 
      n.display?.toLowerCase().includes(numberSearchTerm.toLowerCase()) ||
      String(n.number).includes(numberSearchTerm)
    ).slice(0, 100);
  }, [availableNumbers, numberSearchTerm]);

  const handlePurchase = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!campaign) {
      setError('Aucune campagne active');
      return;
    }

    if (ticketCount < 1 || ticketCount > 5) {
      setError('Vous pouvez acheter entre 1 et 5 tickets à la fois');
      return;
    }

    if (phoneNumber.length !== 9) {
      setError('Le numéro de téléphone doit contenir 9 chiffres');
      return;
    }

    if (selectionMode === 'manual' && selectedNumbers.length !== ticketCount) {
      setError(`Veuillez sélectionner ${ticketCount} numéro(s) de ticket`);
      return;
    }

    try {
      setPurchasing(true);
      
      const purchaseData = {
        campaign_id: campaign.id,
        ticket_count: ticketCount,
        phone_number: `+243${phoneNumber}`,
        selection_mode: selectionMode
      };

      if (selectionMode === 'manual') {
        purchaseData.selected_numbers = selectedNumbers;
      }

      await ticketsAPI.purchase(purchaseData);

      setSuccess(true);
      alert('Achat initié ! Vous allez recevoir une notification de paiement sur votre téléphone.');
      
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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
          <p className="text-gray-600">{campaign.title}</p>
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
              <p className="text-blue-200 text-sm">Tickets disponibles</p>
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
            {/* Ticket Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de tickets (max 5)
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setTicketCount(prev => Math.max(1, prev - 1))}
                  className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-xl font-bold transition-colors"
                  disabled={ticketCount <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="5"
                  className="w-20 text-center px-4 py-3 border border-gray-300 rounded-lg text-2xl font-bold"
                />
                <button
                  type="button"
                  onClick={() => setTicketCount(prev => Math.min(5, prev + 1))}
                  className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-xl font-bold transition-colors"
                  disabled={ticketCount >= 5}
                >
                  +
                </button>
              </div>
            </div>

            {/* Selection Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Mode de sélection des numéros
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectionMode('automatic')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectionMode === 'automatic'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">🎲</div>
                  <div className="font-bold text-gray-900">Automatique</div>
                  <p className="text-xs text-gray-600 mt-1">
                    Numéros générés aléatoirement
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectionMode('manual')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectionMode === 'manual'
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">✋</div>
                  <div className="font-bold text-gray-900">Manuel</div>
                  <p className="text-xs text-gray-600 mt-1">
                    Choisissez vos numéros
                  </p>
                </button>
              </div>
            </div>

            {/* Manual Number Selection */}
            {selectionMode === 'manual' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Sélectionnez {ticketCount} numéro(s)
                  </label>
                  <span className={`text-sm font-bold ${
                    selectedNumbers.length === ticketCount ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {selectedNumbers.length} / {ticketCount} sélectionné(s)
                  </span>
                </div>
                
                {/* Search */}
                <input
                  type="text"
                  placeholder="🔍 Rechercher un numéro..."
                  value={numberSearchTerm}
                  onChange={(e) => setNumberSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                
                {/* Selected Numbers Display */}
                {selectedNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedNumbers.map((num, idx) => (
                      <span
                        key={idx}
                        className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center"
                      >
                        {typeof num === 'object' ? num.display : `KOLO-${String(num).padStart(6, '0')}`}
                        <button
                          type="button"
                          onClick={() => toggleNumberSelection(num)}
                          className="ml-2 hover:text-red-200"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Numbers Grid */}
                {loadingNumbers ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                    <p className="text-sm text-gray-600 mt-2">Chargement des numéros...</p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredNumbers.map((num) => {
                      const isSelected = selectedNumbers.some(
                        s => (typeof s === 'object' ? s.number : s) === (typeof num === 'object' ? num.number : num)
                      );
                      return (
                        <button
                          key={num.number || num}
                          type="button"
                          onClick={() => toggleNumberSelection(num)}
                          disabled={!isSelected && selectedNumbers.length >= ticketCount}
                          className={`p-2 rounded-lg border-2 text-xs font-mono font-bold transition-all ${
                            isSelected
                              ? 'border-green-500 bg-green-100 text-green-700'
                              : selectedNumbers.length >= ticketCount
                              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border-gray-200 bg-white hover:border-green-300 text-gray-700'
                          }`}
                        >
                          {num.display || `#${num}`}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {availableNumbers.length > 100 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Utilisez la recherche pour trouver un numéro spécifique
                  </p>
                )}
              </div>
            )}

            {/* Phone Number */}
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
              <div className="flex justify-between text-gray-700">
                <span>Mode de sélection</span>
                <span className="font-semibold">
                  {selectionMode === 'automatic' ? '🎲 Automatique' : '✋ Manuel'}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold text-gray-900">
                <span>Montant total :</span>
                <span className="text-blue-600">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={purchasing || availableTickets === 0 || (selectionMode === 'manual' && selectedNumbers.length !== ticketCount)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg disabled:cursor-not-allowed"
            >
              {purchasing ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⏳</span> Traitement...
                </span>
              ) : (
                `💳 Payer $${totalPrice.toFixed(2)}`
              )}
            </button>
          </form>

          {/* Payment Methods */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3 font-medium text-center">Méthodes de paiement acceptées :</p>
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

export default BuyTicketsPage;
