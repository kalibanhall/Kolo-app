import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { walletAPI } from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { MoneyIcon, TicketIcon } from '../components/Icons';
import { LogoKolo } from '../components/LogoKolo';

const WalletPage = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [searchParams] = useSearchParams();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [pendingDeposit, setPendingDeposit] = useState(null);

  // Check URL params for status messages
  useEffect(() => {
    const status = searchParams.get('status');
    const ref = searchParams.get('ref');
    
    if (status === 'success') {
      setMessage({ type: 'success', text: 'Rechargement en cours de traitement...' });
      // Reload wallet after a short delay
      setTimeout(loadWallet, 2000);
    } else if (status === 'cancelled') {
      setMessage({ type: 'error', text: 'Rechargement annulé' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      loadWallet();
      // Pre-fill phone number from user profile
      if (user.phone) {
        const cleanPhone = user.phone.replace('+243', '').replace(/\D/g, '');
        setPhoneNumber(cleanPhone);
      }
    }
  }, [user]);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const response = await walletAPI.getWallet();
      setWallet(response.data.wallet);
      setTransactions(response.data.recent_transactions || []);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1000) {
      setMessage({ type: 'error', text: 'Montant minimum: 1 000 FC' });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 9) {
      setMessage({ type: 'error', text: 'Veuillez entrer un numéro de téléphone valide' });
      return;
    }

    try {
      setProcessing(true);
      const response = await walletAPI.initiateDeposit({
        amount,
        phone_number: phoneNumber
      });
      
      if (response.success) {
        setPendingDeposit(response.data);
        setMessage({ 
          type: 'success', 
          text: `Rechargement initié ! Validez le paiement sur votre téléphone (${response.data.provider}).` 
        });
        setShowDepositModal(false);
        
        // Start polling for status
        pollDepositStatus(response.data.reference);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors du rechargement' });
    } finally {
      setProcessing(false);
    }
  };

  // Poll for deposit status
  const pollDepositStatus = async (reference) => {
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setPendingDeposit(null);
        return;
      }

      try {
        const response = await walletAPI.checkDepositStatus(reference);
        if (response.data.status === 'completed') {
          setMessage({ type: 'success', text: 'Rechargement réussi ! Votre solde a été mis à jour.' });
          setPendingDeposit(null);
          loadWallet();
          return;
        } else if (response.data.status === 'failed') {
          setMessage({ type: 'error', text: 'Le rechargement a échoué. Veuillez réessayer.' });
          setPendingDeposit(null);
          return;
        }
      } catch (error) {
        console.error('Status check error:', error);
      }

      attempts++;
      setTimeout(checkStatus, 5000);
    };

    setTimeout(checkStatus, 5000);
  };

  // DEV: Simulate deposit
  const handleSimulateDeposit = async (reference) => {
    try {
      await walletAPI.simulateDeposit(reference);
      setMessage({ type: 'success', text: 'Dépôt simulé avec succès!' });
      loadWallet();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Cancel pending transaction
  const handleCancelTransaction = async (reference) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette transaction ?')) {
      return;
    }
    
    try {
      const response = await walletAPI.cancelTransaction(reference);
      if (response.success) {
        setMessage({ type: 'success', text: 'Transaction annulée avec succès' });
        loadWallet();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de l\'annulation' });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      case 'purchase':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TicketIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case 'refund':
        return (
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        );
      case 'bonus':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <MoneyIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
        );
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chargement...</p>
        </div>
      </div>
    );
  }

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
            onClick={() => window.history.back()}
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
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Mon Portefeuille
            </h1>
          </div>
          
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success'
              ? isDarkMode ? 'bg-green-900/30 border border-green-700 text-green-400' : 'bg-green-50 border border-green-200 text-green-700'
              : isDarkMode ? 'bg-red-900/30 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Balance Card */}
        <div className={`relative rounded-3xl overflow-hidden mb-8 ${
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
          
          <div className="relative p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MoneyIcon className="w-8 h-8 text-white/80" />
              <p className="text-white/80 text-lg">Solde disponible</p>
            </div>
            <p className="text-5xl sm:text-6xl font-bold text-white mb-6">
              {formatCurrency(wallet?.balance || 0)}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowDepositModal(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Recharger
              </button>
              <Link
                to="/buy"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition-all backdrop-blur-sm"
              >
                <TicketIcon className="w-5 h-5" />
                Acheter des tickets
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`rounded-2xl p-5 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-lg'
          }`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total rechargé</p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {formatCurrency(
                transactions
                  .filter(t => t.type === 'deposit' && t.status === 'completed')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
              )}
            </p>
          </div>
          <div className={`rounded-2xl p-5 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-lg'
          }`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total dépensé</p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {formatCurrency(
                transactions
                  .filter(t => t.type === 'purchase' && t.status === 'completed')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
              )}
            </p>
          </div>
        </div>

        {/* Transactions History */}
        <div className={`rounded-2xl overflow-hidden ${
          isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-xl'
        }`}>
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Historique des transactions
            </h3>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <MoneyIcon className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                Aucune transaction pour le moment
              </p>
              <button
                onClick={() => setShowDepositModal(true)}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Faire mon premier rechargement
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-4 flex items-center gap-4 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                  }`}
                >
                  {getTransactionIcon(tx.type)}
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {tx.description || tx.type}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(tx.created_at)}
                    </p>
                    {tx.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          En attente
                        </span>
                        <button
                          onClick={() => handleCancelTransaction(tx.reference)}
                          className="text-xs text-red-500 hover:text-red-700 underline"
                        >
                          Annuler
                        </button>
                        {/* DEV: Simulate button */}
                        {process.env.NODE_ENV !== 'production' && (
                          <button
                            onClick={() => handleSimulateDeposit(tx.reference)}
                            className="text-xs text-blue-600 underline"
                          >
                            Simuler
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.type === 'purchase' || tx.type === 'withdrawal'
                        ? 'text-red-500'
                        : 'text-green-500'
                    }`}>
                      {tx.type === 'purchase' || tx.type === 'withdrawal' ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Solde: {formatCurrency(tx.balance_after)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Recharger mon portefeuille
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Quick amounts */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Montants rapides
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setDepositAmount(amount.toString())}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        depositAmount === amount.toString()
                          ? 'bg-blue-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Ou entrez un montant
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="1000"
                    min="1000"
                    className={`w-full px-4 py-3 pr-16 rounded-xl border text-lg font-bold ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    FC
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Minimum: 1 000 FC
                </p>
              </div>

              {/* Phone number for Mobile Money */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Numéro Mobile Money
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    +243
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="972148867"
                    className={`w-full pl-16 pr-4 py-3 rounded-xl border text-lg ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Ex: 097xxxxxxx (Airtel), 081xxxxxxx (Vodacom), 084xxxxxxx (Orange)
                </p>
              </div>

              {/* Payment methods */}
              <div className="mb-6">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                  Opérateurs supportés:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['M-Pesa (Vodacom)', 'Airtel Money', 'Orange Money', 'Africell'].map(method => (
                    <span
                      key={method}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={processing || !depositAmount || parseFloat(depositAmount) < 1000 || !phoneNumber || phoneNumber.length < 9}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Traitement...
                    </span>
                  ) : (
                    `Recharger`
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

export default WalletPage;
