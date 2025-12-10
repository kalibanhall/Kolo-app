import { useState, useEffect } from 'react';
import { adminAPI, paymentsAPI } from '../services/api';
import { AdminLayout } from '../components/AdminLayout';

const PendingPaymentsPage = () => {
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulatingId, setSimulatingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPendingPurchases();
  }, []);

  const fetchPendingPurchases = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Récupérer toutes les participations en attente
      const data = await adminAPI.getParticipants({ status: 'pending' });
      
      setPendingPurchases(data.participants || []);
    } catch (err) {
      console.error('Error fetching pending purchases:', err);
      setError(err.message || 'Erreur lors du chargement des achats en attente');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (purchaseId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir valider ce paiement ?')) {
      return;
    }

    try {
      setSimulatingId(purchaseId);
      setError('');
      setSuccess('');

      const result = await paymentsAPI.simulate(purchaseId);
      
      setSuccess(`Paiement validé avec succès ! ${result.tickets.length} ticket(s) généré(s).`);
      
      // Retirer l'achat de la liste
      setPendingPurchases(prev => prev.filter(p => p.purchase_id !== purchaseId));
      
      // Rafraîchir après 2 secondes
      setTimeout(() => {
        setSuccess('');
        fetchPendingPurchases();
      }, 2000);
      
    } catch (err) {
      console.error('Error simulating payment:', err);
      setError(err.message || 'Erreur lors de la validation du paiement');
    } finally {
      setSimulatingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Paiements en Attente
              </h1>
              <p className="text-gray-600 mt-2">
                Validez les paiements en attente pour générer les tickets
              </p>
            </div>
            <button
              onClick={fetchPendingPurchases}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <div>
                <strong className="font-semibold">Erreur:</strong>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
              <p>{success}</p>
            </div>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-yellow-600 text-sm font-semibold">En Attente</div>
              <div className="text-3xl font-bold text-yellow-700 mt-1">
                {pendingPurchases.length}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-600 text-sm font-semibold">Total Tickets</div>
              <div className="text-3xl font-bold text-blue-700 mt-1">
                {pendingPurchases.reduce((sum, p) => sum + p.ticket_count, 0)}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-600 text-sm font-semibold">Montant Total</div>
              <div className="text-3xl font-bold text-green-700 mt-1">
                ${pendingPurchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Liste des achats en attente */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement des achats en attente...</p>
            </div>
          ) : pendingPurchases.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Aucun achat en attente
              </h3>
              <p className="text-gray-600">
                Tous les paiements ont été traités.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campagne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tickets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPurchases.map((purchase) => (
                    <tr key={purchase.purchase_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {purchase.user_name}
                        </div>
                        <div className="text-sm text-gray-500">{purchase.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{purchase.campaign_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {purchase.ticket_count} ticket(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ${parseFloat(purchase.total_amount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{purchase.phone_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(purchase.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleSimulatePayment(purchase.purchase_id)}
                          disabled={simulatingId === purchase.purchase_id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {simulatingId === purchase.purchase_id ? (
                            <>
                              <span className="inline-block animate-spin mr-2">...</span>
                              Validation...
                            </>
                          ) : (
                            <>Valider Paiement</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default PendingPaymentsPage;
