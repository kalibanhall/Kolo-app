import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import api from '../services/api';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/transactions');
      if (response.data.success) {
        setTransactions(response.data.transactions || []);
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
      const response = await api.patch(`/admin/transactions/${transactionId}`, {
        status: newStatus
      });
      if (response.data.success) {
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

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FC';
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

  // Stats
  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    totalAmount: transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0)
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
          <button 
            onClick={fetchTransactions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Actualiser
          </button>
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
              <p className="text-4xl mb-4">📭</p>
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
                        <span className="font-semibold text-gray-900">
                          {formatAmount(transaction.amount || 0)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-600">{transaction.phone_number || 'N/A'}</span>
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
                        {transaction.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateTransactionStatus(transaction.id, 'completed')}
                              disabled={processingId === transaction.id}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {processingId === transaction.id ? '...' : '✓ Valider'}
                            </button>
                            <button
                              onClick={() => updateTransactionStatus(transaction.id, 'failed')}
                              disabled={processingId === transaction.id}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {processingId === transaction.id ? '...' : '✗ Rejeter'}
                            </button>
                          </div>
                        )}
                        {transaction.status === 'completed' && (
                          <span className="text-green-600 text-sm">✓ Validée</span>
                        )}
                        {transaction.status === 'failed' && (
                          <span className="text-red-600 text-sm">✗ Rejetée</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-medium text-blue-800 mb-2">📋 Flux des transactions</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>1. <strong>En attente</strong> : L'utilisateur a initié un achat, en attente de confirmation du paiement</p>
            <p>2. <strong>Effectué</strong> : Paiement confirmé par l'agrégateur Mobile Money → Les tickets sont générés automatiquement</p>
            <p>3. <strong>Échoué</strong> : Le paiement n'a pas abouti ou a été rejeté</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TransactionsPage;
