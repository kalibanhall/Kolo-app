import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { walletAPI } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { MoneyIcon, TicketIcon } from '../components/Icons';
import { LogoKolo } from '../components/LogoKolo';

const UserTransactionsPage = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, pagination.page, filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (filter !== 'all') {
        params.type = filter;
      }
      const response = await walletAPI.getTransactions(params);
      setTransactions(response.data.transactions || []);
      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    if (currency === 'USD') {
      return '$' + new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }
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
      case 'withdrawal':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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

  const getTransactionLabel = (type) => {
    const labels = {
      deposit: 'Rechargement',
      purchase: 'Achat de tickets',
      refund: 'Remboursement',
      bonus: 'Bonus',
      withdrawal: 'Retrait'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        bg: isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-100', 
        text: isDarkMode ? 'text-yellow-400' : 'text-yellow-700', 
        label: 'En attente' 
      },
      completed: { 
        bg: isDarkMode ? 'bg-green-900/30' : 'bg-green-100', 
        text: isDarkMode ? 'text-green-400' : 'text-green-700', 
        label: 'Effectué' 
      },
      failed: { 
        bg: isDarkMode ? 'bg-red-900/30' : 'bg-red-100', 
        text: isDarkMode ? 'text-red-400' : 'text-red-700', 
        label: 'Échoué' 
      },
      cancelled: { 
        bg: isDarkMode ? 'bg-gray-700' : 'bg-gray-100', 
        text: isDarkMode ? 'text-gray-400' : 'text-gray-600', 
        label: 'Annulé' 
      }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filterOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'deposit', label: 'Rechargements' },
    { value: 'purchase', label: 'Achats' },
    { value: 'refund', label: 'Remboursements' },
    { value: 'bonus', label: 'Bonus' }
  ];

  // Calculate stats
  const stats = {
    totalDeposits: transactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    totalPurchases: transactions
      .filter(t => t.type === 'purchase' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    totalRefunds: transactions
      .filter(t => t.type === 'refund' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  };

  if (loading && transactions.length === 0) {
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
            onClick={() => navigate(-1)}
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
              Mes Transactions
            </h1>
          </div>
          
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className={`rounded-2xl p-4 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-lg'
          }`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rechargements</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              +{formatCurrency(stats.totalDeposits)}
            </p>
          </div>
          <div className={`rounded-2xl p-4 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-lg'
          }`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Achats</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              -{formatCurrency(stats.totalPurchases)}
            </p>
          </div>
          <div className={`rounded-2xl p-4 ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-lg'
          }`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Remboursements</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
              +{formatCurrency(stats.totalRefunds)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={`flex flex-wrap gap-2 mb-6 p-1.5 rounded-xl ${
          isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
        }`}>
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => {
                setFilter(option.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                filter === option.value
                  ? isDarkMode
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'bg-white text-blue-600 shadow-md'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className={`rounded-2xl overflow-hidden ${
          isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white shadow-xl'
        }`}>
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Historique des transactions
              </h3>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {pagination.total} transaction{pagination.total > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <MoneyIcon className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Aucune transaction
              </p>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {filter === 'all' 
                  ? 'Vos transactions apparaîtront ici'
                  : `Aucune transaction de type "${filterOptions.find(o => o.value === filter)?.label}"`
                }
              </p>
              <Link
                to="/wallet"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Recharger mon portefeuille
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className={`p-4 flex items-center gap-4 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                  }`}
                >
                  {getTransactionIcon(transaction.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getTransactionLabel(transaction.type)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                    <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {transaction.description || transaction.reference}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${
                      ['deposit', 'refund', 'bonus'].includes(transaction.type)
                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {['deposit', 'refund', 'bonus'].includes(transaction.type) ? '+' : '-'}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    {transaction.balance_after != null && (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Solde: {formatCurrency(transaction.balance_after)}
                    </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    pagination.page === 1
                      ? 'opacity-50 cursor-not-allowed'
                      : isDarkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Précédent
                </button>
                
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Page {pagination.page} sur {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    pagination.page >= pagination.totalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : isDarkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            to="/wallet"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              isDarkMode 
                ? 'bg-gray-800 text-cyan-400 hover:bg-gray-700 border border-gray-700' 
                : 'bg-white text-blue-600 hover:bg-blue-50 shadow-md'
            }`}
          >
            <MoneyIcon className="w-5 h-5" />
            Mon Portefeuille
          </Link>
          <Link
            to="/profile"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              isDarkMode 
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mon Profil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserTransactionsPage;
