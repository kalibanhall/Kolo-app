import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { ticketsAPI, campaignsAPI } from '../services/api';
import { TicketIcon, TrophyIcon, SearchIcon, WarningIcon, CheckIcon, CartIcon, TrashIcon } from '../components/Icons';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { LogoKolo } from '../components/LogoKolo';

export const BuyTicketsPage = () => {
  const { user } = useAuth();
  const { cart, addToCart, removeFromCart, clearCart, isInCart } = useCart();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  
  // Persistance des données du formulaire d'achat
  const [purchaseData, setPurchaseData, clearPurchaseData] = useFormPersistence('buy_tickets', {
    ticketCount: 1,
    phoneNumber: '',
    selectedNumbers: [],
    selectionMode: 'manual'
  });
  
  // États dérivés de purchaseData
  const ticketCount = purchaseData.ticketCount;
  const phoneNumber = purchaseData.phoneNumber;
  const selectedNumbers = purchaseData.selectedNumbers;
  const selectionMode = purchaseData.selectionMode || 'manual';
  
  // Fonctions pour mettre à jour les états
  const setTicketCount = (value) => setPurchaseData(prev => ({ ...prev, ticketCount: typeof value === 'function' ? value(prev.ticketCount) : value }));
  const setPhoneNumber = (value) => setPurchaseData(prev => ({ ...prev, phoneNumber: value }));
  const setSelectedNumbers = (value) => setPurchaseData(prev => ({ ...prev, selectedNumbers: typeof value === 'function' ? value(prev.selectedNumbers) : value }));
  const setSelectionMode = (value) => setPurchaseData(prev => ({ ...prev, selectionMode: value, selectedNumbers: [] }));
  
  // Sélection manuelle des numéros uniquement
  const [availableNumbers, setAvailableNumbers] = useState([]);
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

  // Load available numbers when campaign is loaded
  useEffect(() => {
    if (campaign) {
      loadAvailableNumbers();
    }
  }, [campaign]);

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
      setError('Vous pouvez sélectionner entre 1 et 5 tickets à la fois par campagne');
      return;
    }

    const availableCount = (campaign.total_tickets || 0) - (campaign.sold_tickets || 0);
    if (ticketCount > availableCount) {
      setError(`Il ne reste que ${availableCount.toLocaleString('fr-FR')} tickets disponibles`);
      return;
    }

    if (selectionMode === 'manual' && selectedNumbers.length !== ticketCount) {
      setError(`Veuillez sélectionner ${ticketCount} numéro(s) de ticket`);
      return;
    }

    try {
      setPurchasing(true);
      
      const purchasePayload = {
        campaign_id: campaign.id,
        ticket_count: ticketCount,
        selection_mode: selectionMode,
        selected_numbers: selectionMode === 'manual' ? selectedNumbers : [],
        amount: totalPrice
      };

      // Créer la commande et obtenir l'URL de paiement de l'agrégateur
      const response = await ticketsAPI.initiatePurchase(purchasePayload);
      
      if (response.data?.payment_url) {
        // Redirection vers le portail de paiement de l'agrégateur
        window.location.href = response.data.payment_url;
      } else {
        // Fallback: si pas d'URL, utiliser l'ancien comportement
        await ticketsAPI.purchase(purchasePayload);
        setSuccess(true);
        clearPurchaseData();
        alert('Achat initié ! Vous serez redirigé vers le paiement.');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'initiation du paiement');
    } finally {
      setPurchasing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
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

  if (!campaign || campaign.status !== 'open') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 text-center ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Aucune campagne active
          </h2>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Il n'y a pas de tombola ouverte pour le moment. Revenez plus tard !
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all"
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
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-20 backdrop-blur-lg border-b ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:scale-105 ${
              isDarkMode 
                ? 'text-cyan-400 hover:bg-gray-800' 
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium hidden sm:inline">Retour</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <LogoKolo size="small" />
            <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Acheter des tickets
            </h1>
          </div>
          
          {/* Cart Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setShowCartDropdown(true)}
            onMouseLeave={() => setShowCartDropdown(false)}
          >
            <button className={`relative p-2 rounded-xl transition-all ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-cyan-400' 
                : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
            }`}>
              <CartIcon className="w-6 h-6" />
              {cart.items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.items.length}
                </span>
              )}
            </button>
            
            {/* Cart Dropdown Menu */}
            {showCartDropdown && (
              <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-2xl overflow-hidden z-50 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className={`p-3 border-b flex items-center justify-between ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Mon Panier
                  </h4>
                  {cart.items.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Vider
                    </button>
                  )}
                </div>
                
                {cart.items.length === 0 ? (
                  <div className="p-6 text-center">
                    <CartIcon className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Votre panier est vide
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto p-3">
                      <div className="flex flex-wrap gap-2">
                        {cart.items.map(num => (
                          <span
                            key={num}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                              isDarkMode 
                                ? 'bg-cyan-900/30 text-cyan-400' 
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            #{String(num).padStart(4, '0')}
                            <button
                              onClick={() => removeFromCart(num)}
                              className={`hover:text-red-500 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`p-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Total ({cart.items.length} tickets)
                        </span>
                        <span className={`font-bold ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                          {formatCurrency(cart.items.length * (campaign?.ticket_price || 0))}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Campaign Info Card */}
        <div className={`relative rounded-2xl overflow-hidden mb-6 ${
          isDarkMode 
            ? 'bg-gradient-to-r from-cyan-900/50 via-blue-900/50 to-indigo-900/50 border border-gray-700' 
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
        }`}>
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
          
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrophyIcon className="w-8 h-8 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">{campaign.main_prize}</h2>
            </div>
            <p className="text-white/80 text-sm mb-4">{campaign.title}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 ${isDarkMode ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-sm`}>
                <p className="text-blue-200 text-sm">Prix du ticket</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(campaign.ticket_price)}</p>
              </div>
              <div className={`rounded-xl p-4 ${isDarkMode ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-sm`}>
                <p className="text-blue-200 text-sm">Tickets disponibles</p>
                <p className="text-2xl font-bold text-white">{availableTickets.toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className={`rounded-2xl overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800/50 border border-gray-700 backdrop-blur-sm' 
            : 'bg-white shadow-xl'
        }`}>
          <div className="p-6">
            {error && (
              <div className={`mb-6 rounded-xl p-4 ${
                isDarkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={isDarkMode ? 'text-red-400' : 'text-red-700'}>{error}</p>
              </div>
            )}

            {success && (
              <div className={`mb-6 rounded-xl p-4 ${
                isDarkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'
              }`}>
                <p className={isDarkMode ? 'text-green-400' : 'text-green-700'}>
                  Achat initié avec succès ! Vérifiez votre téléphone.
                </p>
              </div>
            )}

            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Tickets Disponibles */}
              <div className={`rounded-xl p-6 text-center ${
                isDarkMode ? 'bg-gray-900/50' : 'bg-gradient-to-r from-blue-50 to-indigo-50'
              }`}>
                <div className="flex flex-col items-center">
                  <TicketIcon className={`w-10 h-10 mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
                  <p className={`text-sm uppercase font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tickets Disponibles</p>
                  <p className="text-4xl font-bold text-green-500 mt-1">
                    {availableTickets.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Ticket Count */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nombre de tickets (max 5 par sélection)
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setTicketCount(prev => Math.max(1, prev - 1))}
                    className={`w-12 h-12 rounded-xl text-xl font-bold transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
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
                    className={`w-20 text-center px-4 py-3 rounded-xl text-2xl font-bold ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } border`}
                  />
                  <button
                    type="button"
                    onClick={() => setTicketCount(prev => Math.min(5, prev + 1))}
                    className={`w-12 h-12 rounded-xl text-xl font-bold transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                    disabled={ticketCount >= 5}
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTicketCount(num)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        ticketCount === num 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {num} ticket{num > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode de sélection */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mode de sélection des numéros
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectionMode('automatic')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectionMode === 'automatic'
                        ? isDarkMode
                          ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400'
                          : 'border-blue-500 bg-blue-50 text-blue-700'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-2xl mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div className="font-semibold">Automatique</div>
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Numéros attribués aléatoirement
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectionMode('manual')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectionMode === 'manual'
                        ? isDarkMode
                          ? 'border-green-500 bg-green-900/30 text-green-400'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-2xl mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                      </svg>
                    </div>
                    <div className="font-semibold">Manuel</div>
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Choisissez vos numéros
                    </div>
                  </button>
                </div>
              </div>

              {/* Sélection manuelle des numéros */}
              {selectionMode === 'manual' && (
                <div className={`rounded-xl p-4 ${
                  isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Sélectionnez {ticketCount} numéro(s)
                    </label>
                    <span className={`text-sm font-bold ${
                      selectedNumbers.length === ticketCount 
                        ? 'text-green-500' 
                        : isDarkMode ? 'text-orange-400' : 'text-orange-600'
                    }`}>
                      {selectedNumbers.length} / {ticketCount}
                    </span>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Rechercher un numéro..."
                    value={numberSearchTerm}
                    onChange={(e) => setNumberSearchTerm(e.target.value)}
                    className={`w-full px-4 py-2 rounded-xl mb-3 ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } border focus:ring-2 focus:ring-green-500`}
                  />
                  
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
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {loadingNumbers ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
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
                                ? isDarkMode
                                  ? 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                : isDarkMode
                                  ? 'border-gray-700 bg-gray-800 hover:border-green-600 text-gray-300'
                                  : 'border-gray-200 bg-white hover:border-green-300 text-gray-700'
                            }`}
                          >
                            {num.display || `#${num}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Info pour mode automatique */}
              {selectionMode === 'automatic' && (
                <div className={`rounded-xl p-4 ${
                  isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <svg className={`w-6 h-6 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                        Mode automatique sélectionné
                      </h4>
                      <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                        Vos {ticketCount} numéro(s) seront attribués automatiquement après validation du paiement.
                      </p>
                    </div>
                  </div>
                </div>
              )}



              {/* Price Summary */}
              <div className={`rounded-xl p-6 space-y-3 ${
                isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span>Prix unitaire</span>
                  <span className="font-semibold">{formatCurrency(campaign.ticket_price)}</span>
                </div>
                <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span>Quantité</span>
                  <span className="font-semibold">{ticketCount} ticket{ticketCount > 1 ? 's' : ''}</span>
                </div>
                {selectionMode === 'manual' && (
                  <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span>Numéros choisis</span>
                    <span className={`font-semibold ${selectedNumbers.length === ticketCount ? 'text-green-500' : 'text-orange-500'}`}>
                      {selectedNumbers.length} / {ticketCount}
                    </span>
                  </div>
                )}
                <div className={`border-t pt-3 flex justify-between text-lg font-bold ${
                  isDarkMode ? 'border-gray-700 text-white' : 'border-gray-300 text-gray-900'
                }`}>
                  <span>Montant total :</span>
                  <span className={isDarkMode ? 'text-cyan-400' : 'text-blue-600'}>
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedNumbers.length > 0 && campaign) {
                      addToCart(campaign.id, campaign, selectedNumbers);
                      setSelectedNumbers([]);
                    }
                  }}
                  disabled={selectedNumbers.length === 0}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white disabled:cursor-not-allowed"
                >
                  <CartIcon className="w-5 h-5" />
                  Ajouter au panier ({selectedNumbers.length})
                </button>

                <button
                  type="submit"
                  disabled={purchasing || availableTickets === 0 || (selectionMode === 'manual' && selectedNumbers.length !== ticketCount)}
                  className={`w-full font-bold py-4 px-6 rounded-xl transition-all text-lg ${
                    (selectionMode === 'manual' && selectedNumbers.length !== ticketCount) 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  } text-white disabled:cursor-not-allowed`}
                >
                  {purchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Redirection vers le paiement...
                    </span>
                  ) : (
                    `Payer ${formatCurrency(totalPrice)}`
                  )}
                </button>
              </div>
            </form>

            {/* Payment Methods */}
            <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-sm mb-3 font-medium text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Méthodes de paiement acceptées :
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-orange-900/30 text-orange-400 border border-orange-800' 
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}>
                  Orange Money
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-green-900/30 text-green-400 border border-green-800' 
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  M-Pesa
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-red-900/30 text-red-400 border border-red-800' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  Airtel Money
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-blue-900/30 text-blue-400 border border-blue-800' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  Afrimoney
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyTicketsPage;
