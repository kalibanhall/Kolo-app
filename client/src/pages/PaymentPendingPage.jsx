import React, { useState, useEffect } from 'react';
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
  
  const { reference, amount, provider, ticket_count } = location.state || {};

  useEffect(() => {
    if (!reference) {
      navigate('/buy');
      return;
    }

    // Poll for status every 5 seconds for 2 minutes
    const interval = setInterval(async () => {
      if (pollCount >= 24) { // 2 minutes
        clearInterval(interval);
        return;
      }

      try {
        setChecking(true);
        const response = await paymentsAPI.checkPayDRCStatus(reference);
        
        if (response.success) {
          const newStatus = response.data.status;
          setStatus(newStatus);
          
          if (newStatus === 'completed') {
            setStatusMessage('Paiement confirmé ! Vos tickets ont été générés.');
            clearInterval(interval);
            setTimeout(() => navigate('/dashboard'), 3000);
          } else if (newStatus === 'failed') {
            setStatusMessage('Le paiement a échoué. Veuillez réessayer.');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Status check error:', err);
      } finally {
        setChecking(false);
        setPollCount(prev => prev + 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [reference, navigate, pollCount]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
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
          <div className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getProviderLabel = (prov) => {
    const providers = {
      'vodacom': 'M-Pesa (Vodacom)',
      'airtel': 'Airtel Money',
      'orange': 'Orange Money',
      'africell': 'Africell Money'
    };
    return providers[prov] || prov;
  };

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
        
        <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {statusMessage}
        </p>

        {status === 'pending' && (
          <div className={`p-4 rounded-xl mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              📱 Validez le paiement sur votre téléphone via <strong>{getProviderLabel(provider)}</strong>
            </p>
          </div>
        )}

        <div className={`space-y-3 text-left p-4 rounded-xl mb-6 ${
          isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
        }`}>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Référence</span>
            <span className={`font-mono text-sm ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
              {reference?.slice(0, 20)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Montant</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {amount?.toLocaleString('fr-FR')} FC
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tickets</span>
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {ticket_count}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Opérateur</span>
            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {getProviderLabel(provider)}
            </span>
          </div>
        </div>

        {checking && (
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Vérification du statut...
          </p>
        )}

        <div className="flex gap-3">
          {status === 'pending' && (
            <button
              onClick={() => window.history.back()}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Retour
            </button>
          )}
          {status === 'failed' && (
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all"
            >
              Réessayer
            </button>
          )}
          
          <Link
            to="/dashboard"
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
              status === 'failed' || status === 'pending'
                ? isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
            }`}
          >
            {status === 'completed' ? 'Voir mes tickets' : 'Tableau de bord'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentPendingPage;
