import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { adminAPI } from '../services/api';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [expandedTransaction, setExpandedTransaction] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, [pagination.page, statusFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await adminAPI.getTransactions(params);
      
      if (response.success) {
        setTransactions(response.data.transactions || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (transactionId, newStatus) => {
    if (!window.confirm(`Voulez-vous vraiment changer le statut en "${newStatus}" ?`)) {
      return;
    }

    try {
      await adminAPI.updateTransaction(transactionId, { status: newStatus });
      await loadTransactions();
    } catch (err) {
      console.error('Failed to update transaction:', err);
      alert('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      completed: 'Effectué',
      pending: 'En attente',
      failed: 'Échoué',
      cancelled: 'Annulé',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestion des Transactions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Total : {pagination.total} transaction{pagination.total > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Tous les statuts</option>
                <option value="completed">Effectué</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoué</option>
                <option value="cancelled">Annulé</option>
              </select>
              <button
                onClick={loadTransactions}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Transaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campagne</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-600">Chargement...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <React.Fragment key={transaction.transaction_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-sm text-indigo-600 font-medium">
                          #{transaction.transaction_id}
                        </div>
                        {transaction.external_transaction_id && (
                          <div className="text-xs text-gray-400">
                            Ext: {transaction.external_transaction_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{transaction.user_name}</div>
                        <div className="text-sm text-gray-500">{transaction.user_email}</div>
                        {transaction.user_phone && (
                          <div className="text-xs text-gray-400">{transaction.user_phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {transaction.campaign_title || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-green-600">
                          ${transaction.total_amount?.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setExpandedTransaction(
                            expandedTransaction === transaction.transaction_id ? null : transaction.transaction_id
                          )}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors"
                        >
                          {transaction.ticket_count || transaction.tickets?.length || 0} ticket(s)
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {transaction.payment_method || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(transaction.payment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={transaction.payment_status}
                          onChange={(e) => handleStatusUpdate(transaction.transaction_id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="completed">Effectué</option>
                          <option value="pending">En attente</option>
                          <option value="failed">Échoué</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </td>
                    </tr>
                    {/* Expanded row for tickets */}
                    {expandedTransaction === transaction.transaction_id && transaction.tickets && transaction.tickets.length > 0 && (
                      <tr>
                        <td colSpan="9" className="px-6 py-4 bg-gray-50">
                          <div className="ml-8">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Tickets de cette transaction :</h4>
                            <div className="flex flex-wrap gap-2">
                              {transaction.tickets.map((ticket) => (
                                <span
                                  key={ticket.id}
                                  className={`px-3 py-1 rounded text-xs font-mono ${
                                    ticket.status === 'winner' 
                                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                                      : 'bg-white text-gray-700 border border-gray-300'
                                  }`}
                                >
                                  {ticket.ticket_number}
                                  {ticket.status === 'winner' && ' 🏆'}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Page {pagination.page} sur {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TransactionsPage;
