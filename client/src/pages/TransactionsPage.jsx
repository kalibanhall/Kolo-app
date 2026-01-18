import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { adminAPI } from '../services/api';

// Helper pour faire des requêtes HTTP directes
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('kolo_token');

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erreur serveur');
  return { data };
};

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null); // Modal de détails

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/admin/transactions');
      console.log('Transactions response:', response); // Debug log
      
      // apiRequest returns the parsed JSON directly, so check response.success
      if (response.success) {
        // Mapper les champs de l'API vers le format attendu par le frontend
        const rawTransactions = response.data?.transactions || response.transactions || [];
        console.log('Raw transactions:', rawTransactions); // Debug log
        
        const mappedTransactions = rawTransactions.map(t => ({
          id: t.transaction_id,
          transaction_id: t.external_transaction_id || `TXN-${t.transaction_id}`,
          user_id: t.user_id,
          user_name: t.user_name,
          user_email: t.user_email,
          user_phone: t.user_phone,
          payment_phone: t.payment_phone || t.user_phone, // Numéro utilisé pour le paiement
          campaign_id: t.campaign_id,
          campaign_name: t.campaign_title,
          ticket_count: t.ticket_count,
          quantity: t.ticket_count,
          amount: parseFloat(t.total_amount) || 0,
          amount_usd: parseFloat(t.amount_usd) || 0,
          currency: t.currency || 'USD',
          status: t.payment_status || 'pending',
          payment_method: t.payment_method,
          payment_provider: t.payment_provider,
          error_message: t.error_message, // Raison de l'échec
          tickets: t.tickets || [],
          created_at: t.created_at,
          updated_at: t.updated_at
        }));
        setTransactions(mappedTransactions);
      } else {
        console.error('Response not successful:', response);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionStatus = async (transactionId, newStatus) => {
    try {
      setProcessingId(transactionId);
      const response = await apiRequest(`/admin/transactions/${transactionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (response.success) {
        // Refresh transactions
        await fetchTransactions();
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Erreur lors de la mise à jour de la transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Effectué' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Échoué' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount, currency = 'USD') => {
    if (currency === 'CDF') {
      return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' FC';
    }
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = searchTerm === '' || 
      t.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone_number?.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  // Stats - use USD amount for totals
  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    totalAmount: transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount_usd || t.amount || 0), 0)
  };

  // Sync single transaction with PayDRC
  const syncTransaction = async (transactionId) => {
    try {
      setSyncingId(transactionId);
      const response = await apiRequest(`/admin/transactions/${transactionId}/sync`, {
        method: 'POST'
      });
      if (response.data.success) {
        await fetchTransactions();
        if (response.data.transaction?.status_changed) {
          alert(`Transaction synchronisée ! Statut mis à jour: ${response.data.transaction.new_status}`);
        } else {
          alert('Transaction synchronisée - aucun changement de statut');
        }
      }
    } catch (error) {
      console.error('Error syncing transaction:', error);
      alert('Erreur lors de la synchronisation');
    } finally {
      setSyncingId(null);
    }
  };

  // Sync all pending transactions with PayDRC
  const syncAllTransactions = async () => {
    if (!window.confirm('Synchroniser toutes les transactions en attente avec PayDRC ?')) return;
    
    try {
      setSyncingAll(true);
      const response = await apiRequest('/admin/transactions/sync-all', {
        method: 'POST'
      });
      if (response.data.success) {
        await fetchTransactions();
        alert(`Synchronisation terminée !\n${response.data.synced} synchronisées\n${response.data.updated} mises à jour\n${response.data.errors} erreurs`);
      }
    } catch (error) {
      console.error('Error syncing all transactions:', error);
      alert('Erreur lors de la synchronisation globale');
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Transactions</h1>
            <p className="text-gray-600">Gérez les paiements et validez les transactions</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={syncAllTransactions}
              disabled={syncingAll}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                syncingAll
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {syncingAll ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sync en cours...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync PayDRC
                </>
              )}
            </button>
            <button 
              onClick={fetchTransactions}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-200">
            <p className="text-sm text-yellow-600">En attente</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-200">
            <p className="text-sm text-green-600">Effectuées</p>
            <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
            <p className="text-sm text-red-600">Échouées</p>
            <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
            <p className="text-sm text-blue-600">Montant total</p>
            <p className="text-xl font-bold text-blue-700">{formatAmount(stats.totalAmount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher par ID, nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Toutes' },
              { value: 'pending', label: 'En attente' },
              { value: 'completed', label: 'Effectuées' },
              { value: 'failed', label: 'Échouées' }
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Chargement des transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">ID Transaction</th>
                    <th className="text-left p-4 font-medium text-gray-700">Utilisateur</th>
                    <th className="text-left p-4 font-medium text-gray-700">Campagne</th>
                    <th className="text-left p-4 font-medium text-gray-700">Tickets</th>
                    <th className="text-left p-4 font-medium text-gray-700">Montant</th>
                    <th className="text-left p-4 font-medium text-gray-700">Téléphone</th>
                    <th className="text-left p-4 font-medium text-gray-700">Date</th>
                    <th className="text-left p-4 font-medium text-gray-700">Statut</th>
                    <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {transaction.transaction_id || `TXN-${transaction.id}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{transaction.user_name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{transaction.user_email || ''}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-700">{transaction.campaign_name || 'N/A'}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">{transaction.ticket_count || transaction.quantity || 0}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="font-semibold text-gray-900">
                            {formatAmount(transaction.amount || 0, transaction.currency)}
                          </span>
                          {transaction.currency === 'CDF' && transaction.amount_usd > 0 && (
                            <p className="text-xs text-gray-400">≈ ${transaction.amount_usd.toFixed(2)}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="text-gray-600 font-medium">{transaction.payment_phone || 'N/A'}</span>
                          {transaction.payment_provider && (
                            <p className="text-xs text-gray-400">{transaction.payment_provider}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(transaction.created_at)}
                        </span>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap items-center">
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                          >
                            Détails
                          </button>
                          {transaction.status === 'pending' && (
                            <>
                              <button
                                onClick={() => syncTransaction(transaction.id)}
                                disabled={syncingId === transaction.id}
                                className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                title="Synchroniser avec PayDRC"
                              >
                                {syncingId === transaction.id ? '...' : 'Sync'}
                              </button>
                              <button
                                onClick={() => updateTransactionStatus(transaction.id, 'completed')}
                                disabled={processingId === transaction.id}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {processingId === transaction.id ? '...' : 'Valider'}
                              </button>
                              <button
                                onClick={() => updateTransactionStatus(transaction.id, 'failed')}
                                disabled={processingId === transaction.id}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {processingId === transaction.id ? '...' : 'Rejeter'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de détails */}
        {selectedTransaction && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedTransaction(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Détails de la transaction</h3>
                    <button
                      onClick={() => setSelectedTransaction(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ID Transaction</p>
                      <p className="font-mono text-sm">{selectedTransaction.transaction_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Statut</p>
                      {getStatusBadge(selectedTransaction.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Utilisateur</p>
                      <p className="font-medium">{selectedTransaction.user_name}</p>
                      <p className="text-sm text-gray-500">{selectedTransaction.user_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Téléphone compte</p>
                      <p className="font-medium">{selectedTransaction.user_phone || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Numéro de paiement</p>
                      <p className="text-lg font-bold text-blue-800">{selectedTransaction.payment_phone || 'N/A'}</p>
                      {selectedTransaction.payment_provider && (
                        <p className="text-sm text-blue-600">{selectedTransaction.payment_provider}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Campagne</p>
                      <p className="font-medium">{selectedTransaction.campaign_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Nombre de tickets</p>
                      <p className="font-medium">{selectedTransaction.ticket_count}</p>
                    </div>
                    <div className="col-span-2 bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-600">Montant total</p>
                      <p className="text-2xl font-bold text-green-800">
                        {formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                      </p>
                      {selectedTransaction.currency === 'CDF' && selectedTransaction.amount_usd > 0 && (
                        <p className="text-sm text-green-600">≈ ${selectedTransaction.amount_usd.toFixed(2)} USD</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date de création</p>
                      <p className="font-medium">{formatDate(selectedTransaction.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Dernière mise à jour</p>
                      <p className="font-medium">{formatDate(selectedTransaction.updated_at)}</p>
                    </div>
                    {selectedTransaction.status === 'failed' && selectedTransaction.error_message && (
                      <div className="col-span-2 bg-red-50 p-3 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Raison de l'échec</p>
                        <p className="text-red-800">{selectedTransaction.error_message}</p>
                      </div>
                    )}
                    {selectedTransaction.tickets && selectedTransaction.tickets.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500 mb-2">Tickets ({selectedTransaction.tickets.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTransaction.tickets.map((ticket, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {ticket.ticket_number}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default TransactionsPage;
