import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ticketsAPI, campaignsAPI, walletAPI, paymentsAPI, promosAPI } from '../services/api';
import { TicketIcon, TrophyIcon, SearchIcon, WarningIcon, CheckIcon, TrashIcon, MoneyIcon } from '../components/Icons';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { LogoKolo } from '../components/LogoKolo';

// Storage key for cart - now campaign-specific
const getCartKey = (campaignId) => `kolo_cart_${campaignId}`;

// Default exchange rate (fallback)
const DEFAULT_EXCHANGE_RATE = 2850;

const BuyTicketsPage = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { campaignId } = useParams(); // Get campaign ID from URL
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
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE); // Taux de conversion USD/CDF
  
  // Code promo
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  
  // Variables d'achat de tickets
  const [ticketCount, setTicketCount] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD'); // 'USD' or 'CDF'
  const [selectionMode, setSelectionMode] = useState('automatic'); // 'automatic' or 'manual'
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [numberSearchTerm, setNumberSearchTerm] = useState('');
  const [numbersPage, setNumbersPage] = useState(1);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [hasMoreNumbers, setHasMoreNumbers] = useState(true);
  
  // Persistance des données du formulaire d'achat
  const [purchaseData, setPurchaseData, clearPurchaseData] = useFormPersistence('buy_tickets', {
    ticketCount: 1,
  });
  
  // Ajuster ticketCount si le nombre de tickets disponibles est inférieur
  useEffect(() => {
    if (campaign) {
      const totalTickets = parseInt(campaign.total_tickets) || 0;
      const soldTickets = parseInt(campaign.sold_tickets) || 0;
      const availableTickets = Math.max(0, totalTickets - soldTickets);
      
      if (ticketCount > availableTickets && availableTickets > 0) {
        setTicketCount(availableTickets);
      }
    }
  }, [campaign, ticketCount]);
  
  // Ajuster selectedNumbers quand ticketCount change (si en mode manuel)
  useEffect(() => {
    if (selectionMode === 'manual' && selectedNumbers.length > ticketCount) {
      // Réduire les numéros sélectionnés pour correspondre au nouveau ticketCount
      setSelectedNumbers(prev => prev.slice(0, ticketCount));
    }
  }, [ticketCount, selectionMode]);
  
  // Recalculer / invalider le code promo quand le nombre de tickets change
  useEffect(() => {
    // En mode manuel, vérifier les tickets sélectionnés, sinon le compteur
    const actualTicketCount = selectionMode === 'manual' ? selectedNumbers.length : ticketCount;
    
    if (actualTicketCount < 1 && promoDiscount) {
      setPromoDiscount(null);
      setPromoCode('');
      setPromoError('Le code promo a été retiré car vous n\'avez aucun ticket');
    }
  }, [ticketCount, selectedNumbers.length, selectionMode]);

  // Recalculate promo discount when ticket count changes (separate to avoid infinite loop)
  useEffect(() => {
    if (!promoDiscount || !campaign) return;
    const actualTicketCount = selectionMode === 'manual' ? selectedNumbers.length : ticketCount;
    if (actualTicketCount < 1) return;

    const price = campaign.ticket_price || 0;
    let discountPerTicket;
    if (promoDiscount.discount_type === 'percentage') {
      discountPerTicket = (price * promoDiscount.discount_value) / 100;
    } else {
      discountPerTicket = promoDiscount.discount_value;
    }
    let totalDiscount = discountPerTicket * actualTicketCount;
    if (promoDiscount.max_discount && totalDiscount > promoDiscount.max_discount) {
      totalDiscount = promoDiscount.max_discount;
      discountPerTicket = totalDiscount / actualTicketCount;
    }
    const newTotal = price * actualTicketCount;
    const finalAmount = Math.max(0, newTotal - totalDiscount);

    // Only update if values actually changed
    if (promoDiscount.discount_amount !== totalDiscount || promoDiscount.final_amount !== finalAmount) {
      setPromoDiscount(prev => ({
        ...prev,
        discount_per_ticket: discountPerTicket,
        discount_amount: totalDiscount,
        final_amount: finalAmount
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketCount, selectedNumbers.length, selectionMode, campaign]);
  
  // Charger le panier sauvegardé quand la campagne est chargée
  useEffect(() => {
    if (!campaign?.id) return;
    try {
      const savedCart = localStorage.getItem(getCartKey(campaign.id));
      if (savedCart) {
        setComposerItems(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error('Error loading cart:', e);
    }
  }, [campaign?.id]);

  // Sauvegarder le panier dans localStorage quand il change
  useEffect(() => {
    if (!campaign?.id || composerItems.length === 0) return;
    try {
      localStorage.setItem(getCartKey(campaign.id), JSON.stringify(composerItems));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, [composerItems, campaign?.id]);

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
    if (campaign?.id) {
      localStorage.removeItem(getCartKey(campaign.id));
    }
  }, [campaign?.id]);

  // Vérifier la disponibilité des tickets du compositeur
  const verifyComposerTickets = useCallback(async () => {
    if (composerItems.length === 0 || !campaign) return;
    
    setVerifyingComposer(true);
    setUnavailableTickets([]);
    
    try {
      const numbers = composerItems.map(item => item.number);
      const response = await ticketsAPI.checkAvailability({
        campaign_id: campaign.id,
        ticket_numbers: numbers
      });
      
      if (response.unavailable && response.unavailable.length > 0) {
        setUnavailableTickets(response.unavailable);
      }
    } catch (err) {
      console.error('Error verifying tickets:', err);
    } finally {
      setVerifyingComposer(false);
    }
  }, [composerItems, campaign]);

  // Charger la campagne
  const loadCampaign = async () => {
    try {
      setLoading(true);
      setError('');
      
      let campaignData;
      
      if (campaignId) {
        // Si on a un ID de campagne dans l'URL, charger cette campagne spécifique
        const response = await campaignsAPI.getById(campaignId);
        campaignData = response.data || response.campaign || response;
      } else {
        // Sinon, charger la campagne active courante
        const response = await campaignsAPI.getCurrent();
        campaignData = response.data || response.campaign || response;
      }
      
      if (campaignData && campaignData.id) {
        setCampaign(campaignData);
        
        // Charger le panier sauvegardé pour cette campagne
        try {
          const savedCart = localStorage.getItem(getCartKey(campaignData.id));
          if (savedCart) {
            setComposerItems(JSON.parse(savedCart));
          }
        } catch (e) {
          console.error('Error loading saved cart:', e);
        }
      } else {
        setError('Aucune campagne trouvée');
      }
    } catch (err) {
      console.error('Error loading campaign:', err);
      setError(err.message || 'Erreur lors du chargement de la campagne');
    } finally {
      setLoading(false);
    }
  };

  // Charger le taux de conversion
  const loadExchangeRate = async () => {
    try {
      const response = await campaignsAPI.getExchangeRate();
      if (response.success && response.data?.rate) {
        setExchangeRate(response.data.rate);
      }
    } catch (err) {
      console.error('Error loading exchange rate:', err);
      // Keep default rate if error
    }
  };

  useEffect(() => {
    loadCampaign();
    loadWallet();
    loadExchangeRate();
    if (user?.phone) {
      const cleanPhone = user.phone.replace('+243', '').replace(/\D/g, '');
      setPhoneNumber(cleanPhone);
    }
  }, [user, campaignId]);

  // Load available numbers when campaign is loaded
  const fetchAvailableNumbers = async () => {
    if (!campaign) return;
    setLoadingNumbers(true);
    try {
      // Charger tous les numéros disponibles (jusqu'à 50000)
      const pageSize = 10000;
      const response = await campaignsAPI.getAvailableNumbers(campaign.id, { limit: pageSize, offset: (numbersPage - 1) * pageSize });
      if (numbersPage === 1) {
        setAvailableNumbers(response.numbers || []);
      } else {
        setAvailableNumbers(prev => [...prev, ...(response.numbers || [])]);
      }
      // Continuer à charger s'il y a plus de numéros
      setHasMoreNumbers((response.numbers || []).length === pageSize);
      
      // Mettre à jour le nombre de tickets disponibles depuis la réponse API
      if (response.total_available !== undefined) {
        setAvailableTickets(response.total_available);
      }
    } catch (err) {
      console.error('Error loading available numbers:', err);
    } finally {
      setLoadingNumbers(false);
    }
  };

  useEffect(() => {
    fetchAvailableNumbers();
  }, [campaign, numbersPage]);

  // Rafraîchir les numéros disponibles toutes les 10 secondes (pour synchronisation en temps réel)
  useEffect(() => {
    if (!campaign) return;
    const interval = setInterval(() => {
      fetchAvailableNumbers();
    }, 10000); // 10 secondes
    
    return () => clearInterval(interval);
  }, [campaign]);

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getWallet();
      if (response.success && response.data?.wallet) {
        setWallet(response.data.wallet);
      } else {
        // Initialiser avec un wallet vide si pas de données
        setWallet({ balance: 0, currency: 'CDF' });
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
      // En cas d'erreur, initialiser avec un wallet vide
      setWallet({ balance: 0, currency: 'CDF' });
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

  // Fonction pour obtenir des numéros aléatoires parmi les disponibles
  const getRandomAvailableNumbers = useCallback((count) => {
    // Filtrer les numéros déjà dans le panier
    const numbersInCart = composerItems.map(item => item.number);
    const availableForSelection = availableNumbers.filter(num => !numbersInCart.includes(num));
    
    if (availableForSelection.length === 0) return [];
    
    // Mélanger et prendre les premiers
    const shuffled = [...availableForSelection].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }, [availableNumbers, composerItems]);

  // Ajouter au panier en mode automatique
  const addAutoToComposer = useCallback(() => {
    const randomNumbers = getRandomAvailableNumbers(ticketCount);
    if (randomNumbers.length === 0) {
      setError('Aucun numéro disponible. Le panier est peut-être plein ou tous les numéros sont pris.');
      return;
    }
    if (randomNumbers.length < ticketCount) {
      setError(`Seulement ${randomNumbers.length} numéro(s) disponible(s) sur ${ticketCount} demandé(s).`);
    }
    randomNumbers.forEach(num => {
      addToComposer({ number: num, display: `#${String(num).padStart(4, '0')}` });
    });
  }, [ticketCount, getRandomAvailableNumbers, addToComposer]);

  const filteredNumbers = useMemo(() => {
    // Afficher tous les numéros disponibles (pas de limite arbitraire)
    if (!numberSearchTerm) return availableNumbers;
    return availableNumbers.filter(n => 
      n.display?.toLowerCase().includes(numberSearchTerm.toLowerCase()) ||
      String(n.number).includes(numberSearchTerm)
    );
  }, [availableNumbers, numberSearchTerm]);

  // Valider le code promo (minimum 1 ticket requis)
  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    // En mode manuel, vérifier le nombre de tickets réellement sélectionnés
    // En mode auto, vérifier le compteur
    const actualTicketCount = selectionMode === 'manual' ? selectedNumbers.length : ticketCount;
    
    // Vérifier le minimum de 1 ticket
    if (actualTicketCount < 1) {
      setPromoError(selectionMode === 'manual' 
        ? 'Sélectionnez au moins 1 ticket pour utiliser un code promo' 
        : 'Sélectionnez au moins 1 ticket');
      return;
    }
    
    setPromoLoading(true);
    setPromoError('');
    
    try {
      const response = await promosAPI.validate(promoCode);
      if (response.success) {
        const promo = response.data;
        // Calculate discount based on promo type (percentage or fixed)
        let discountPerTicket;
        if (promo.discount_type === 'percentage') {
          discountPerTicket = (campaign.ticket_price * promo.discount_value) / 100;
        } else {
          discountPerTicket = promo.discount_value;
        }
        // Apply max_discount cap if set
        let totalDiscount = discountPerTicket * ticketCount;
        if (promo.max_discount && totalDiscount > promo.max_discount) {
          totalDiscount = promo.max_discount;
          discountPerTicket = totalDiscount / ticketCount;
        }
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
      setError('Vous pouvez sélectionner entre 1 et 10 tickets à la fois par campagne');
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

    // Validation du numéro de téléphone uniquement pour Mobile Money
    if (paymentMethod === 'mobile_money') {
      if (!phoneNumber || phoneNumber.length < 9) {
        setError('Veuillez entrer un numéro de téléphone valide (9 chiffres)');
        return;
      }
      
      // Validate phone number prefix (DRC operators)
      const prefix = phoneNumber.substring(0, 2);
      const validPrefixes = ['81', '82', '83', '84', '85', '89', '97', '98', '99', '90', '91'];
      if (!validPrefixes.includes(prefix)) {
        setError(`Numéro invalide. Préfixes acceptés: 081-083 (Vodacom), 084-085/089 (Orange), 097/098/099 (Airtel), 090/091 (Africell)`);
        return;
      }
    }
    // Note: Le paiement par portefeuille ne nécessite pas de numéro de téléphone

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
        amount: finalPrice,
        amount_cdf: Math.ceil(finalPrice * exchangeRate),
        currency: 'USD'
      };

      // Payment with wallet balance (always in CDF)
      if (paymentMethod === 'wallet') {
        const requiredAmountCDF = Math.ceil(finalPrice * exchangeRate);
        if (!wallet || wallet.balance < requiredAmountCDF) {
          setError(`Solde insuffisant. Vous avez ${formatCurrencyCDF(wallet?.balance || 0)} mais il faut ${formatCurrencyCDF(requiredAmountCDF)}. Veuillez recharger votre portefeuille.`);
          setPurchasing(false);
          return;
        }

        const response = await walletAPI.purchase({
          ...purchasePayload,
          amount: requiredAmountCDF, // Send CDF amount for wallet
          promo_code_id: promoDiscount?.id || null,
          discount_amount: promoDiscount?.discount_amount || 0
        });
        
        if (response.success) {
          setSuccess(true);
          clearPurchaseData();
          setWallet(prev => ({ ...prev, balance: response.data.new_balance }));
          
          // Recharger la campagne pour mettre à jour les tickets disponibles
          await loadCampaign();
          
          // Réinitialiser le formulaire
          setTicketCount(1);
          setSelectedNumbers([]);
          setNumbersPage(1);
          
          // Show success message with ticket numbers
          const ticketNumbers = response.data.tickets.map(t => t.ticket_number).join(', ');
          alert(`Achat réussi ! Vos tickets: ${ticketNumbers}`);
          
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      } else {
        // Payment via PayDRC (MOKO Afrika) Mobile Money
        const amountToCharge = selectedCurrency === 'CDF' ? finalPrice * exchangeRate : finalPrice;
        
        console.log('Initiating PayDRC payment...', {
          campaign_id: campaign.id,
          ticket_count: ticketCount,
          phone_number: phoneNumber,
          currency: selectedCurrency,
          amount: amountToCharge
        });
        
        const response = await paymentsAPI.initiatePayDRC({
          campaign_id: campaign.id,
          ticket_count: ticketCount,
          phone_number: phoneNumber,
          currency: selectedCurrency,
          amount: amountToCharge,
          promo_code_id: promoDiscount?.id || null,
          discount_amount: promoDiscount?.discount_amount || 0,
          selection_mode: selectionMode,
          selected_numbers: selectionMode === 'manual' ? selectedNumbers : []
        });
        
        console.log('PayDRC response:', response);
        
        if (response.success) {
          setSuccess(true);
          clearPurchaseData();
          
          // Navigate to payment status page to track the payment (replace to avoid back button issues)
          navigate('/payment/pending', { 
            replace: true,
            state: { 
              reference: response.data.reference,
              amount: amountToCharge,
              amountUSD: finalPrice,
              currency: selectedCurrency,
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

  if (error && !campaign) {
    navigate('/');
    return null;
  }

  if (!campaign || !['open', 'active'].includes(campaign.status)) {
    navigate('/');
    return null;
  }

  const totalPrice = ticketCount * (campaign.ticket_price || 0);
  // Code promo: dynamic discount based on promo type
  const promoDiscountAmount = promoDiscount ? promoDiscount.discount_amount : 0;
  const finalPrice = promoDiscount ? Math.max(0, totalPrice - promoDiscountAmount) : totalPrice;
  // Calculer les tickets disponibles avec valeurs par défaut
  const totalTickets = parseInt(campaign.total_tickets) || 0;
  const soldTickets = parseInt(campaign.sold_tickets) || 0;
  const availableTickets = Math.max(0, totalTickets - soldTickets);

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
            <span className="font-medium hidden sm:inline">Accueil</span>
          </Link>
          
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
                  <div>
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
                      <div className={`mb-3 p-2 rounded-lg flex items-center gap-2 ${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs">Panier valide 24h - Finalisez avant qu'il n'expire</span>
                      </div>
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Purchase Form */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Campaign Card - Affichage de la campagne */}
        <div className={`rounded-2xl overflow-hidden mb-6 ${
          isDarkMode 
            ? 'bg-gray-800/50 border border-gray-700' 
            : 'bg-white shadow-xl'
        }`}>
          {/* Image de la campagne */}
          <div className="relative h-48 sm:h-64 overflow-hidden">
            {campaign.image_url ? (
              <img 
                src={campaign.image_url} 
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-indigo-900 to-purple-900' 
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              }`}>
                <TicketIcon className="w-20 h-20 text-white/30" />
              </div>
            )}
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            {/* Campaign info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {campaign.title}
                  </h2>
                  <p className="text-white/80 text-sm sm:text-base line-clamp-2">
                    {campaign.description}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2">
                    <p className="text-white/70 text-xs">Prix du ticket</p>
                    <p className="text-white font-bold text-lg">
                      ${parseFloat(campaign.ticket_price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prix à gagner */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {/* Prix principal */}
              <div className="flex items-center gap-2">
                <span className="text-xl">🥇</span>
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>1er Prix</p>
                  <p className={`font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {campaign.main_prize || 'À définir'}
                  </p>
                </div>
              </div>
              
              {/* 2ème prix */}
              {campaign.second_prize && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>2ème Prix</p>
                    <p className={`font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {campaign.second_prize}
                    </p>
                  </div>
                </div>
              )}
              
              {/* 3ème prix */}
              {campaign.third_prize && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥉</span>
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>3ème Prix</p>
                    <p className={`font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {campaign.third_prize}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Date de fin */}
            {campaign.end_date && (
              <div className={`mt-3 pt-3 border-t text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  ⏰ Tirage prévu le{' '}
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(campaign.end_date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

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
                
                {/* Warning: Derniers tickets */}
                {availableTickets <= 10 && availableTickets > 0 && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${
                    isDarkMode 
                      ? 'bg-amber-900/40 border border-amber-700' 
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <span className="text-2xl">🔥</span>
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                        {availableTickets === 1 
                          ? 'Dernier ticket disponible !' 
                          : `Plus que ${availableTickets} tickets restants !`}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-amber-400/80' : 'text-amber-600'}`}>
                        D'autres utilisateurs sont peut-être en train d'acheter. Finalisez votre achat rapidement !
                      </p>
                    </div>
                  </div>
                )}
                
                {availableTickets === 0 && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${
                    isDarkMode 
                      ? 'bg-red-900/40 border border-red-700' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <span className="text-2xl">❌</span>
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        Tous les tickets sont vendus !
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-red-400/80' : 'text-red-600'}`}>
                        Cette campagne est complète. Consultez nos autres campagnes actives.
                      </p>
                    </div>
                  </div>
                )}
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
                    onChange={(e) => setTicketCount(Math.min(Math.min(10, availableTickets), Math.max(1, parseInt(e.target.value) || 1)))}
                    min="1"
                    max={Math.min(10, availableTickets)}
                    className={`w-20 text-center px-4 py-3 rounded-xl text-2xl font-bold ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } border`}
                  />
                  <button
                    type="button"
                    onClick={() => setTicketCount(prev => Math.min(Math.min(10, availableTickets), prev + 1))}
                    className={`w-12 h-12 rounded-xl text-xl font-bold transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                    disabled={ticketCount >= Math.min(10, availableTickets)}
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[1, 2, 3, 4, 5, 10].filter(num => num <= availableTickets).map(num => (
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
                  {availableTickets < 10 && availableTickets > 0 && ![1, 2, 3, 4, 5, 10].includes(availableTickets) && (
                    <button
                      type="button"
                      onClick={() => setTicketCount(availableTickets)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        ticketCount === availableTickets 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {availableTickets} (max)
                    </button>
                  )}
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
                  {/* Fermeture correcte du bloc */}
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
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Avez-vous un code promo ?
                    <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      (valable dès 1 ticket)
                    </span>
                  </label>
                  {!promoDiscount ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder={(selectionMode === 'manual' ? selectedNumbers.length < 1 : ticketCount < 1) 
                          ? 'Sélectionnez au moins 1 ticket' 
                          : 'Entrez votre code'}
                        disabled={(selectionMode === 'manual' ? selectedNumbers.length < 1 : ticketCount < 1)}
                        className={`flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 disabled:bg-gray-900 disabled:text-gray-600' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={validatePromoCode}
                        disabled={promoLoading || !promoCode.trim() || (selectionMode === 'manual' ? selectedNumbers.length < 1 : ticketCount < 1)}
                        className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap flex-shrink-0 transition-all ${
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
                            ({promoDiscount.discount_type === 'percentage' 
                              ? `-${promoDiscount.discount_value}%` 
                              : `-$${promoDiscount.discount_per_ticket.toFixed(2)}`} / ticket)
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
                      <span>Remise ({promoDiscount.code}: {promoDiscount.discount_type === 'percentage' ? `-${promoDiscount.discount_value}%` : `-$${promoDiscount.discount_per_ticket.toFixed(2)}`} × {ticketCount})</span>
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

                {/* Avertissement si sélection manuelle incomplète */}
                {selectionMode === 'manual' && selectedNumbers.length < ticketCount && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">
                      ⚠️ Il vous reste {ticketCount - selectedNumbers.length} ticket{ticketCount - selectedNumbers.length > 1 ? 's' : ''} à sélectionner
                    </p>
                  </div>
                )}
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
                        wallet && wallet.balance >= finalPrice * exchangeRate
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {wallet ? formatCurrencyCDF(wallet.balance) : '0 FC'}
                      </p>
                      {wallet && wallet.balance < finalPrice * exchangeRate && (
                        <Link 
                          to="/wallet"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Recharger
                        </Link>
                      )}
                    </div>
                  </div>
                  {wallet && wallet.balance < finalPrice * exchangeRate && (
                    <p className="mt-2 text-sm text-red-500">
                      Solde insuffisant (manque {formatCurrencyCDF(finalPrice * exchangeRate - wallet.balance)})
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
                        Ex: 097/098/099 (Airtel), 081/082/083 (Vodacom), 084/085/089 (Orange), 090/091 (Africell)
                      </p>
                      
                      {/* Currency Selection */}
                      <label className={`text-sm font-medium mb-2 mt-4 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Devise de paiement
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCurrency('USD')}
                          className={`py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                            selectedCurrency === 'USD'
                              ? isDarkMode
                                ? 'bg-green-600 text-white border-2 border-green-500'
                                : 'bg-green-500 text-white border-2 border-green-600'
                              : isDarkMode
                                ? 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
                                : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <span className="text-lg">$</span>
                          <span>USD</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCurrency('CDF')}
                          className={`py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                            selectedCurrency === 'CDF'
                              ? isDarkMode
                                ? 'bg-blue-600 text-white border-2 border-blue-500'
                                : 'bg-blue-500 text-white border-2 border-blue-600'
                              : isDarkMode
                                ? 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
                                : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <span className="text-lg">FC</span>
                          <span>Francs</span>
                        </button>
                      </div>
                      <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Montant: {selectedCurrency === 'USD' 
                          ? `$${finalPrice.toLocaleString('en-US')}`
                          : `${(finalPrice * exchangeRate).toLocaleString('fr-FR')} FC`
                        }
                      </p>
                    </div>
                  )}
              </div>
              </div>

              {/* Bouton Ajouter au panier - Mode Manuel */}
              {selectionMode === 'manual' && selectedNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    selectedNumbers.forEach(num => addToComposer({ number: num, display: `#${String(num).padStart(4, '0')}` }));
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

              {/* Bouton Ajouter au panier - Mode Automatique */}
              {selectionMode === 'automatic' && ticketCount > 0 && (
                <button
                  type="button"
                  onClick={addAutoToComposer}
                  disabled={availableNumbers.length === 0 || loadingNumbers}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-all border-2 border-dashed ${
                    isDarkMode
                      ? 'border-purple-600 text-purple-400 hover:bg-purple-900/30 disabled:border-gray-700 disabled:text-gray-600'
                      : 'border-purple-400 text-purple-600 hover:bg-purple-50 disabled:border-gray-300 disabled:text-gray-400'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {loadingNumbers ? (
                      <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    Ajouter {ticketCount} ticket{ticketCount > 1 ? 's' : ''} au panier (auto)
                  </span>
                </button>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={
                  purchasing || 
                  availableTickets === 0 ||
                  ticketCount < 1 ||
                  (selectionMode === 'manual' && selectedNumbers.length !== ticketCount) ||
                  (paymentMethod === 'wallet' && (!wallet || wallet.balance < finalPrice * exchangeRate)) ||
                  (paymentMethod === 'mobile_money' && (!phoneNumber || phoneNumber.length < 9))
                }
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all text-lg ${
                  purchasing || 
                  availableTickets === 0 ||
                  ticketCount < 1 ||
                  (selectionMode === 'manual' && selectedNumbers.length !== ticketCount) ||
                  (paymentMethod === 'wallet' && (!wallet || wallet.balance < finalPrice * exchangeRate)) ||
                  (paymentMethod === 'mobile_money' && (!phoneNumber || phoneNumber.length < 9))
                    ? 'bg-gray-500 cursor-not-allowed opacity-60' 
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
                  selectedCurrency === 'CDF'
                    ? `Payer ${(finalPrice * exchangeRate).toLocaleString('fr-FR')} FC via Mobile Money`
                    : `Payer $${finalPrice.toLocaleString('en-US')} via Mobile Money`
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
                      {campaign?.currency === 'CDF'
                        ? formatCurrencyCDF(finalPrice)
                        : formatCurrency(finalPrice)}
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

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
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
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                >
                  {purchasing ? 'Traitement...' : 'Confirmer'}
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

