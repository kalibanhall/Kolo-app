import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { paymentsAPI } from '../services/api';
import { LogoKolo } from '../components/LogoKolo';

export const PaymentPendingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [status, setStatus] = useState('pending');
  const [statusMessage, setStatusMessage] = useState('En attente de confirmation...');
  const [checking, setChecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes countdown
  
  // Safely extract state with defaults
  const { 
    reference = null, 
    amount = 0, 
    amountUSD = 0,
    provider = 'mobile_money', 
    ticket_count = 0,
    currency = 'CDF'
  } = location.state || {};

  // Countdown timer
  useEffect(() => {
    if (status === 'pending' && timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [status, timeRemaining]);

  // Check payment status function
  const checkPaymentStatus = useCallback(async () => {
    if (!reference) return;
    
    try {
      setChecking(true);
      setError(null);
      const response = await paymentsAPI.checkPayDRCStatus(reference);
      
      if (response && response.success && response.data) {
        const newStatus = response.data.status;
        setStatus(newStatus);
        
        if (newStatus === 'completed') {
          setStatusMessage('Paiement confirmé ! Vos tickets ont été générés.');
        } else if (newStatus === 'failed') {
          setStatusMessage('Le paiement a échoué. Veuillez réessayer.');
        }
        return newStatus;
      }
    } catch (err) {
      console.error('Status check error:', err);
      setError('Erreur lors de la vérification. Nouvelle tentative...');
    } finally {
      setChecking(false);
    }
    return null;
  }, [reference]);

  useEffect(() => {
    if (!reference) {
      navigate('/buy');
      return;
    }

    // Poll for status every 5 seconds for 2 minutes (24 attempts)
    const maxAttempts = 24;
    let attempts = 0;
    let intervalId = null;

    const startPolling = () => {
      intervalId = setInterval(async () => {
        attempts++;
        setPollCount(attempts);
        
        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          setStatusMessage('Délai d\'attente dépassé. Vérifiez votre historique de transactions.');
          return;
        }

        const newStatus = await checkPaymentStatus();
        
        if (newStatus === 'completed' || newStatus === 'failed') {
          clearInterval(intervalId);
          if (newStatus === 'completed') {
            setTimeout(() => navigate('/dashboard'), 3000);
          }
        }
      }, 5000);
    };

    // Initial check after 2 seconds
    const initialTimeout = setTimeout(async () => {
      const newStatus = await checkPaymentStatus();
      if (newStatus !== 'completed' && newStatus !== 'failed') {
        startPolling();
      } else if (newStatus === 'completed') {
        setTimeout(() => navigate('/dashboard'), 3000);
      }
    }, 2000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [reference, navigate, checkPaymentStatus]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="relative w-20 h-20 mx-auto mb-6">
            {/* Background circle */}
            <div className="absolute inset-0 rounded-full bg-yellow-500/20"></div>
            {/* Spinning border */}
            <div className="absolute inset-0 rounded-full border-4 border-yellow-500/30 border-t-yellow-500 animate-spin"></div>
            {/* Inner circle with icon */}
            <div className="absolute inset-2 rounded-full bg-yellow-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        );
    }
  };

  const getProviderLabel = (prov) => {
    const providers = {
      'mpesa': 'M-Pesa (Vodacom)',
      'vodacom': 'M-Pesa (Vodacom)',
      'airtel': 'Airtel Money',
      'orange': 'Orange Money',
      'africell': 'Africell Money'
    };
    return providers[prov?.toLowerCase()] || prov || 'Mobile Money';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If no reference data, show error state
  if (!reference) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 text-center ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <LogoKolo size="small" className="mx-auto mb-6" />
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Données de transaction manquantes
          </h2>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Les informations de paiement sont introuvables.
          </p>
          <Link
            to="/buy"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            Retourner aux achats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 text-center ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
        <LogoKolo size="small" className="mx-auto mb-6" />
        
        {getStatusIcon()}
        
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {status === 'completed' ? 'Paiement Réussi !' : 
           status === 'failed' ? 'Paiement Échoué' : 
           'Paiement en cours...'}
        </h2>
        
        <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {statusMessage}
        </p>

        {/* Error message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            isDarkMode ? 'bg-red-900/30 border border-red-700 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {error}
          </div>
        )}

        {/* Countdown timer for pending */}
        {status === 'pending' && timeRemaining > 0 && (
          <div className={`mb-4 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Temps restant: <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
        )}

        {status === 'pending' && (
          <div className={`p-4 rounded-xl mb-6 ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">📱</span>
              <p className={`font-medium ${isDarkMode ? 'text-cyan-400' : 'text-blue-700'}`}>
                Action requise
              </p>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Validez le paiement sur votre téléphone via <strong>{getProviderLabel(provider)}</strong>
            </p>
            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Un message USSD a été envoyé à votre téléphone
            </p>
          </div>
        )}

        {/* Success message */}
        {status === 'completed' && (
          <div className={`p-4 rounded-xl mb-6 ${isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
              🎉 Vos tickets ont été générés ! Vous allez être redirigé vers votre tableau de bord...
            </p>
          </div>
        )}

        {/* Failed message */}
        {status === 'failed' && (
          <div className={`p-4 rounded-xl mb-6 ${isDarkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
              Le paiement n'a pas abouti. Vérifiez votre solde Mobile Money et réessayez.
            </p>
          </div>
        )}

        <div className={`space-y-3 text-left p-4 rounded-xl mb-6 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-center">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Référence</span>
            <span className={`font-mono text-xs ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
              {reference ? `${reference.slice(0, 20)}...` : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Montant</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {amountUSD ? `$${amountUSD.toLocaleString('en-US')}` : (amount ? `${amount.toLocaleString('fr-FR')} FC` : '$0')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tickets</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{ticket_count || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Opérateur</span>
            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{getProviderLabel(provider)}</span>
          </div>
        </div>

        {checking && (
          <p className={`text-sm mb-4 flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            Vérification du statut...
          </p>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => navigate('/buy', { replace: true })}
            className={`w-full max-w-xs px-6 py-3 rounded-xl font-medium transition-all ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Retour à l'achat
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPendingPage;
