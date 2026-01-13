import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { ticketsAPI, campaignsAPI, walletAPI, paymentsAPI, promosAPI } from '../services/api';
import { TicketIcon, TrophyIcon, SearchIcon, WarningIcon, CheckIcon, TrashIcon, MoneyIcon } from '../components/Icons';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { LogoKolo } from '../components/LogoKolo';

// Storage key for cart
const CART_KEY = 'kolo_cart';

export const BuyTicketsPage = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerItems, setComposerItems] = useState([]);
  const [verifyingComposer, setVerifyingComposer] = useState(false);
  const [unavailableTickets, setUnavailableTickets] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' or 'mobile_money'
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Modal de confirmation
  
  // Code promo
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  
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

  // Charger le panier depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setComposerItems(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading cart:', e);
    }
  }, []);

  // Sauvegarder le panier dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(composerItems));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, [composerItems]);

  // Ajouter au compositeur
  const addToComposer = useCallback((ticketNumber) => {
    setComposerItems(prev => {
      if (prev.some(item => item.number === ticketNumber.number)) return prev;
      return [...prev, { ...ticketNumber, addedAt: Date.now() }];
    });
  }, []);

  // Retirer du compositeur
  const removeFromComposer = useCallback((ticketNumber) => {
    setComposerItems(prev => prev.filter(item => item.number !== ticketNumber));
    setUnavailableTickets(prev => prev.filter(n => n !== ticketNumber));
  }, []);

  // Vider le panier
  const clearComposer = useCallback(() => {
    setComposerItems([]);
    setUnavailableTickets([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  // Vérifier la disponibilité des tickets du compositeur
  const verifyComposerTickets = useCallback(async () => {
    if (composerItems.length === 0 || !campaign) return;
    
    setVerifyingComposer(true);
    setUnavailableTickets([]);
    
    try {
      const response = await campaignsAPI.getAvailableNumbers(campaign.id);
      const availableSet = new Set((response.numbers || []).map(n => n.number));
      
      const unavailable = composerItems.filter(item => !availableSet.has(item.number)).map(item => item.number);
      
      if (unavailable.length > 0) {
        setUnavailableTickets(unavailable);
        // Auto-remove unavailable tickets after showing message
        setTimeout(() => {
          setComposerItems(prev => prev.filter(item => !unavailable.includes(item.number)));
          setUnavailableTickets([]);
        }, 3000);
      }
    } catch (err) {
      console.error('Error verifying tickets:', err);
    } finally {
      setVerifyingComposer(false);
    }
  }, [composerItems, campaign]);

  // Check if ticket is in composer
  const isInComposer = useCallback((ticketNumber) => {
    return composerItems.some(item => item.number === ticketNumber);
  }, [composerItems]);

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
    loadWallet();
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

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getWallet();
      setWallet(response.data.wallet);
    } catch (err) {
      console.error('Failed to load wallet:', err);
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
      for (let i = soldCount + 1; i <= Math.min(soldCount + 500, campaign.total_tickets); i++) {
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
    // Afficher tous les numéros disponibles (pas de limite arbitraire)
    if (!numberSearchTerm) return availableNumbers;
    return availableNumbers.filter(n => 
      n.display?.toLowerCase().includes(numberSearchTerm.toLowerCase()) ||
      String(n.number).includes(numberSearchTerm)
    );
  }, [availableNumbers, numberSearchTerm]);

  // Valider le code promo
  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setPromoLoading(true);
    setPromoError('');
    
    try {
      const response = await promosAPI.validate(promoCode);
      if (response.success) {
        const promo = response.data;
        // Apply fixed discount of $0.30 per ticket
        const discountPerTicket = 0.30;
        const totalDiscount = discountPerTicket * ticketCount;
        const finalAmount = Math.max(0, totalPrice - totalDiscount);
        
        setPromoDiscount({
          ...promo,
          discount_per_ticket: discountPerTicket,
          discount_amount: totalDiscount,
          final_amount: finalAmount
        });
      }
    } catch (err) {
      setPromoError(err.message || 'Code promo invalide');
      setPromoDiscount(null);
    } finally {
      setPromoLoading(false);
    }
  };

  // Annuler le code promo
  const cancelPromoCode = () => {
    setPromoCode('');
    setPromoDiscount(null);
    setPromoError('');
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

    if (paymentMethod === 'mobile_money') {
      if (!phoneNumber || phoneNumber.length < 9) {
        setError('Veuillez entrer un numéro de téléphone valide (9 chiffres)');
        return;
      }
      
      // Validate phone number prefix (DRC operators)
      const prefix = phoneNumber.substring(0, 2);
      const validPrefixes = ['81', '82', '83', '84', '85', '89', '90', '97', '99', '91'];
      if (!validPrefixes.includes(prefix)) {
        setError(`Numéro invalide. Préfixes acceptés: 081-083 (Vodacom), 084-085/089 (Orange), 097/099 (Airtel), 091 (Afrimoney)`);
        return;
      }
    }

    // Afficher modal de confirmation
    setShowConfirmModal(true);
  };

  const confirmPurchase = async () => {
    setShowConfirmModal(false);
    
    try {
      setPurchasing(true);
      
      const purchasePayload = {
        campaign_id: campaign.id,
        ticket_count: ticketCount,
        selection_mode: selectionMode,
        selected_numbers: selectionMode === 'manual' ? selectedNumbers : [],
        amount: totalPrice,
        amount_cdf: finalPrice * 2500,
        currency: paymentMethod === 'wallet' ? 'CDF' : 'USD'
      };

      // Payment with wallet balance (always in CDF)
      if (paymentMethod === 'wallet') {
        if (!wallet || wallet.balance < finalPrice * 2500) {
          setError('Solde insuffisant. Veuillez recharger votre portefeuille.');
          setPurchasing(false);
          return;
        }

        const response = await walletAPI.purchase({
          ...purchasePayload,
          amount: finalPrice * 2500, // Send CDF amount for wallet
          promo_code_id: promoDiscount?.id || null,
          discount_amount: promoDiscount?.discount_amount || 0
        });
        
        if (response.success) {
          setSuccess(true);
          clearPurchaseData();
          setWallet(prev => ({ ...prev, balance: response.data.new_balance }));
          
          // Show success message with ticket numbers
          const ticketNumbers = response.data.tickets.map(t => t.ticket_number).join(', ');
          alert(`Achat réussi ! Vos tickets: ${ticketNumbers}`);
          
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      } else {
        // Payment via PayDRC (MOKO Afrika) Mobile Money
        console.log('Initiating PayDRC payment...', {
          campaign_id: campaign.id,
          ticket_count: ticketCount,
          phone_number: phoneNumber
        });
        
        const response = await paymentsAPI.initiatePayDRC({
          campaign_id: campaign.id,
          ticket_count: ticketCount,
          phone_number: phoneNumber
        });
        
        console.log('PayDRC response:', response);
        
        if (response.success) {
          setSuccess(true);
          clearPurchaseData();
          
          // Navigate to payment status page to track the payment
          navigate('/payment/pending', { 
            state: { 
              reference: response.data.reference,
              amount: response.data.amount,
              provider: response.data.provider,
              ticket_count: ticketCount
            } 
          });
        } else {
          const errorMessage = response.message || response.error || 'Échec de l\'initiation du paiement';
          console.error('PayDRC error:', errorMessage, response);
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('Purchase error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'initiation du paiement';
      setError(errorMessage);
      
      // Si c'est une erreur de configuration PayDRC, afficher un message plus détaillé
      if (errorMessage.includes('MERCHANT_ID') || errorMessage.includes('MERCHANT_SECRET')) {
        setError('Erreur de configuration du système de paiement. Veuillez contacter le support.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  // Format en USD (prix de la campagne)
  const formatCurrency = (amount) => {
    return '$' + new Intl.NumberFormat('en-US').format(amount);
  };

  // Format en CDF (portefeuille)
  const formatCurrencyCDF = (amount) => {
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
  // Code promo: $0.30 discount per ticket
  const promoDiscountAmount = promoDiscount ? (0.30 * ticketCount) : 0;
  const finalPrice = promoDiscount ? Math.max(0, totalPrice - promoDiscountAmount) : totalPrice;
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
          <button
            onClick={() => window.history.back()}
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
          </button>
          
          <div className="flex items-center gap-2">
            <LogoKolo size="small" />
            <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Acheter des tickets
            </h1>
          </div>
          
          {/* Compositeur Button */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowComposer(!showComposer);
                if (!showComposer && composerItems.length > 0) {
                  verifyComposerTickets();
                }
              }}
              className={`relative p-2 rounded-xl transition-all ${
                isDarkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-purple-400' 
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {composerItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {composerItems.length}
                </span>
              )}
            </button>
            
            {/* Composer Dropdown */}
            {showComposer && (
              <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className={`p-3 border-b flex items-center justify-between ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Mon Panier
                    </h4>
                    {verifyingComposer && (
                      <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  {composerItems.length > 0 && (
                    <button
                      onClick={clearComposer}
                      className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Vider
                    </button>
                  )}
                </div>
                
                {/* Message tickets non disponibles */}
                {unavailableTickets.length > 0 && (
                  <div className={`p-3 ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      ⚠️ {unavailableTickets.length} ticket(s) non disponible(s) - suppression automatique...
                    </p>
                  </div>
                )}
                
                {composerItems.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Votre compositeur est vide
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Sélectionnez des numéros pour les garder ici
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto p-3">
                      <div className="flex flex-wrap gap-2">
                        {composerItems.map(item => (
                          <span
                            key={item.number}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                              unavailableTickets.includes(item.number)
                                ? 'bg-red-100 text-red-700 line-through'
                                : isDarkMode 
                                  ? 'bg-purple-900/30 text-purple-400' 
                                  : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {item.display || `#${String(item.number).padStart(4, '0')}`}
                            <button
                              onClick={() => removeFromComposer(item.number)}
                              className={`hover:text-red-500 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`p-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Total ({composerItems.length} tickets)
                        </span>
                        <span className={`font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {formatCurrency(composerItems.length * (campaign?.ticket_price || 0))}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          // Charger les tickets du compositeur dans la sélection
                          setTicketCount(Math.min(10, composerItems.length));
                          setSelectionMode('manual');
                          setSelectedNumbers(composerItems.slice(0, 5));
                          setShowComposer(false);
                        }}
                        disabled={composerItems.length === 0 || unavailableTickets.length > 0}
                        className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
                          isDarkMode
                            ? 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                            : 'bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-200 disabled:text-gray-400'
                        }`}
                      >
                        Passer à l'achat
                      </button>
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
                  Nombre de tickets
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
                    onChange={(e) => setTicketCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="10"
                    className={`w-20 text-center px-4 py-3 rounded-xl text-2xl font-bold ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } border`}
                  />
                  <button
                    type="button"
                    onClick={() => setTicketCount(prev => Math.min(10, prev + 1))}
                    className={`w-12 h-12 rounded-xl text-xl font-bold transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                    disabled={ticketCount >= 10}
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[1, 2, 3, 5, 10].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTicketCount(num)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        ticketCount === num 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {num}
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
                {/* Code Promo - En haut */}
                <div className={`pb-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Avez-vous un code promo ?
                  </label>
                  {!promoDiscount ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Entrez votre code"
                        className={`flex-1 px-3 py-2 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={validatePromoCode}
                        disabled={promoLoading || !promoCode.trim()}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          isDarkMode
                            ? 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                            : 'bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-200 disabled:text-gray-400'
                        }`}
                      >
                        {promoLoading ? '...' : 'Appliquer'}
                      </button>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                            ✓ {promoDiscount.code}
                          </span>
                          <span className={`text-sm ml-2 ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                            (-$0.30 / ticket)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={cancelPromoCode}
                          className="text-red-500 hover:text-red-600 text-sm font-medium"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  )}
                  {promoError && (
                    <p className="text-red-500 text-sm mt-1">{promoError}</p>
                  )}
                </div>

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

                {/* Sous-total et remise */}
                {promoDiscount && (
                  <>
                    <div className={`flex justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span>Sous-total</span>
                      <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className={`flex justify-between text-green-500`}>
                      <span>Remise ({promoDiscount.code}: -$0.30 × {ticketCount})</span>
                      <span className="font-semibold">-{formatCurrency(promoDiscountAmount)}</span>
                    </div>
                  </>
                )}

                <div className={`border-t pt-3 flex justify-between text-lg font-bold ${
                  isDarkMode ? 'border-gray-700 text-white' : 'border-gray-300 text-gray-900'
                }`}>
                  <span>Montant total :</span>
                  <span className={isDarkMode ? 'text-cyan-400' : 'text-blue-600'}>
                    {formatCurrency(promoDiscount ? promoDiscount.final_amount : totalPrice)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mode de paiement
                </label>
                
                {/* Wallet Option */}
                <div 
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all mb-3 ${
                    paymentMethod === 'wallet'
                      ? isDarkMode
                        ? 'border-green-500 bg-green-900/30'
                        : 'border-green-500 bg-green-50'
                      : isDarkMode
                        ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-green-900/50' : 'bg-green-100'
                      }`}>
                        <MoneyIcon className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Portefeuille KOLO
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Paiement instantané
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        wallet && wallet.balance >= finalPrice * 2500
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {wallet ? formatCurrencyCDF(wallet.balance) : '0 FC'}
                      </p>
                      {wallet && wallet.balance < finalPrice * 2500 && (
                        <Link 
                          to="/wallet"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Recharger
                        </Link>
                      )}
                    </div>
                  </div>
                  {wallet && wallet.balance < finalPrice * 2500 && (
                    <p className="mt-2 text-sm text-red-500">
                      Solde insuffisant (manque {formatCurrencyCDF(finalPrice * 2500 - wallet.balance)})
                    </p>
                  )}
                </div>

                {/* Mobile Money Option */}
                <div 
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'mobile_money'
                      ? isDarkMode
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-blue-500 bg-blue-50'
                      : isDarkMode
                        ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Mobile Money
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Orange, M-Pesa, Airtel, Afrimoney
                      </p>
                    </div>
                  </div>
                  
                  {/* Phone Number Input for Mobile Money */}
                  {paymentMethod === 'mobile_money' && (
                    <div className="mt-4 pt-4 border-t border-gray-600/30" onClick={(e) => e.stopPropagation()}>
                      <label className={`text-sm font-medium mb-2 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Numéro Mobile Money
                      </label>
                      <div className="flex items-stretch">
                        <span className={`flex items-center px-3 py-2.5 rounded-l-lg font-medium border ${
                          isDarkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'
                        }`}>
                          +243
                        </span>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          placeholder="822156182"
                          className={`flex-1 min-w-0 px-3 py-2.5 rounded-r-lg border-t border-r border-b focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Ex: 097 (Airtel), 081 (Vodacom), 084 (Orange), 099 (Afrimoney)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bouton Ajouter au compositeur (seulement en mode manuel) */}
              {selectionMode === 'manual' && selectedNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    selectedNumbers.forEach(num => addToComposer(num));
                    setSelectedNumbers([]);
                  }}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-all border-2 border-dashed ${
                    isDarkMode
                      ? 'border-purple-600 text-purple-400 hover:bg-purple-900/30'
                      : 'border-purple-400 text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajouter au panier ({selectedNumbers.length} ticket{selectedNumbers.length > 1 ? 's' : ''})
                  </span>
                </button>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={
                  purchasing || 
                  availableTickets === 0 || 
                  (selectionMode === 'manual' && selectedNumbers.length !== ticketCount) ||
                  (paymentMethod === 'wallet' && (!wallet || wallet.balance < finalPrice * 2500))
                }
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all text-lg ${
                  (selectionMode === 'manual' && selectedNumbers.length !== ticketCount) ||
                  (paymentMethod === 'wallet' && (!wallet || wallet.balance < finalPrice * 2500))
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : paymentMethod === 'wallet'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                } text-white disabled:cursor-not-allowed`}
              >
                {purchasing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {paymentMethod === 'wallet' ? 'Achat en cours...' : 'Redirection...'}
                  </span>
                ) : paymentMethod === 'wallet' ? (
                  `Payer avec mon portefeuille`
                ) : (
                  `Payer ${formatCurrency(finalPrice)} via Mobile Money`
                )}
              </button>

              {/* Message d'erreur - sous le bouton pour plus de visibilité */}
              {error && (
                <div className={`mt-4 rounded-xl p-4 ${
                  isDarkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
                </div>
              )}
            </form>

            {/* Info Footer */}
            <div className={`mt-6 p-4 rounded-xl ${
              isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'
            }`}>
              <p className={`text-xs text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                En cliquant sur Payer, vous acceptez nos{' '}
                <Link to="/terms" className={`underline ${isDarkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'}`}>
                  conditions générales d'utilisation
                </Link>.
                <br />
                Paiement 100% sécurisé.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Confirmer votre achat
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Récapitulatif */}
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Campagne</span>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{campaign?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tickets</span>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{ticketCount}</span>
                  </div>
                  {selectionMode === 'manual' && selectedNumbers.length > 0 && (
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Numéros</span>
                      <span className={`font-mono text-sm ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                        {selectedNumbers.map(n => n.display || `#${n}`).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Mode de paiement</span>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {paymentMethod === 'wallet' ? 'Portefeuille KOLO' : 'Mobile Money'}
                    </span>
                  </div>
                  {paymentMethod === 'mobile_money' && (
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Numéro</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>+243{phoneNumber}</span>
                    </div>
                  )}
                  {promoDiscount && (
                    <div className="flex justify-between text-green-500">
                      <span>Remise ({promoDiscount.code})</span>
                      <span className="font-medium">-{formatCurrency(promoDiscount.discount_amount)}</span>
                    </div>
                  )}
                  <div className={`pt-3 border-t flex justify-between text-lg ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                    <span className={`font-bold ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                      {formatCurrency(finalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Avertissement */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  ⚠️ Veuillez vérifier ces informations avant de confirmer. Cette action est irréversible.
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmPurchase}
                  disabled={purchasing}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all text-white ${
                    paymentMethod === 'wallet'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                  } disabled:opacity-50`}
                >
                  {purchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Traitement...
                    </span>
                  ) : (
                    'Confirmer le paiement'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyTicketsPage;
