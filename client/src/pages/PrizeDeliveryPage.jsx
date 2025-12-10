import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ClockIcon, PhoneIcon, ShippingIcon, CheckIcon, GiftIcon } from '../components/Icons';
import api from '../services/api';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente', color: 'gray', Icon: ClockIcon },
  { value: 'contacted', label: 'Contacté', color: 'blue', Icon: PhoneIcon },
  { value: 'shipped', label: 'Expédié', color: 'yellow', Icon: ShippingIcon },
  { value: 'delivered', label: 'Livré', color: 'green', Icon: CheckIcon },
  { value: 'claimed', label: 'Réclamé', color: 'purple', Icon: GiftIcon },
];

export const PrizeDeliveryPage = () => {
  const [winners, setWinners] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [selectedWinners, setSelectedWinners] = useState([]);
  const [filters, setFilters] = useState({
    delivery_status: '',
    campaign_id: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [editingWinner, setEditingWinner] = useState(null);
  const [formData, setFormData] = useState({
    delivery_status: '',
    delivery_address: '',
    delivery_notes: '',
    tracking_number: '',
  });

  useEffect(() => {
    loadWinners();
    loadStats();
  }, [filters, pagination.page]);

  const loadWinners = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await api.get('/admin/winners', { params });
      setWinners(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading winners:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/winners/stats');
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      setUpdating({ ...updating, [ticketId]: true });

      await api.patch(`/admin/winners/${ticketId}/delivery`, {
        delivery_status: status,
      });

      await loadWinners();
      await loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating({ ...updating, [ticketId]: false });
    }
  };

  const handleEditWinner = (winner) => {
    setEditingWinner(winner);
    setFormData({
      delivery_status: winner.delivery_status || 'pending',
      delivery_address: winner.delivery_address || winner.address || '',
      delivery_notes: winner.delivery_notes || '',
      tracking_number: winner.tracking_number || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      setUpdating({ ...updating, [editingWinner.id]: true });

      await api.patch(`/admin/winners/${editingWinner.id}/delivery`, formData);

      setEditingWinner(null);
      await loadWinners();
      await loadStats();
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setUpdating({ ...updating, [editingWinner.id]: false });
    }
  };

  const handleBulkUpdate = async (status) => {
    if (selectedWinners.length === 0) {
      alert('Aucun gagnant sélectionné');
      return;
    }

    const notes = prompt(`Notes pour les ${selectedWinners.length} gagnants sélectionnés ?`);
    if (notes === null) return;

    try {
      await api.post('/admin/winners/bulk-update', {
        ticket_ids: selectedWinners,
        delivery_status: status,
        delivery_notes: notes || undefined,
      });

      setSelectedWinners([]);
      await loadWinners();
      await loadStats();
      alert('Mise à jour effectuée avec succès !');
    } catch (error) {
      console.error('Error bulk updating:', error);
      alert('Erreur lors de la mise à jour groupée');
    }
  };

  const toggleSelectWinner = (ticketId) => {
    setSelectedWinners((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedWinners.length === winners.length) {
      setSelectedWinners([]);
    } else {
      setSelectedWinners(winners.map((w) => w.id));
    }
  };

  const getStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find((opt) => opt.value === status) || STATUS_OPTIONS[0];
    const colors = {
      gray: 'bg-gray-100 text-gray-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
    };
    const IconComponent = option.Icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${colors[option.color]}`}>
        {IconComponent && <IconComponent className="w-3 h-3 mr-1" />} {option.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Livraisons</h1>
            <p className="text-gray-600 mt-1">Suivi des prix gagnants</p>
          </div>
          {selectedWinners.length > 0 && (
            <div className="flex gap-2">
              <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                {selectedWinners.length} sélectionné{selectedWinners.length > 1 ? 's' : ''}
              </span>
              <div className="flex gap-1">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleBulkUpdate(status.value)}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    title={`Marquer comme ${status.label}`}
                  >
                    {status.icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Total Gagnants</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_winners}</p>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">⏳ En attente</p>
              <p className="text-3xl font-bold text-gray-700">{stats.pending}</p>
            </div>
            <div className="bg-blue-50 rounded-lg shadow-md p-6">
              <p className="text-sm text-blue-600">Contactés</p>
              <p className="text-3xl font-bold text-blue-700">{stats.contacted}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow-md p-6">
              <p className="text-sm text-yellow-600">Expédiés</p>
              <p className="text-3xl font-bold text-yellow-700">{stats.shipped}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow-md p-6">
              <p className="text-sm text-green-600">Livrés</p>
              <p className="text-3xl font-bold text-green-700">{stats.delivered + stats.claimed}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
              <input
                type="text"
                placeholder="Nom, téléphone, ticket..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.delivery_status}
                onChange={(e) => setFilters({ ...filters, delivery_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tous les statuts</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ delivery_status: '', campaign_id: '', search: '' })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Winners Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : winners.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xl text-gray-600">Aucun gagnant trouvé</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedWinners.length === winners.length}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Gagnant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ticket / Campagne
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Suivi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date livraison
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {winners.map((winner) => (
                      <tr key={winner.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedWinners.includes(winner.id)}
                            onChange={() => toggleSelectWinner(winner.id)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{winner.full_name}</div>
                          <div className="text-xs text-gray-500">{winner.phone}</div>
                          <div className="text-xs text-gray-500">{winner.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">#{winner.ticket_number}</div>
                          <div className="text-xs text-gray-500">{winner.campaign_title}</div>
                          {winner.prize_category && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              {winner.prize_category === 'main' ? 'Principal' : 'Bonus'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(winner.delivery_status)}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{winner.tracking_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(winner.delivery_date)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditWinner(winner)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Modifier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Affichage {(pagination.page - 1) * pagination.limit + 1} à{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingWinner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Modifier la livraison - {editingWinner.full_name}
                </h2>
                <button
                  onClick={() => setEditingWinner(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut de livraison
                  </label>
                  <select
                    value={formData.delivery_status}
                    onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse de livraison
                  </label>
                  <textarea
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Entrez l'adresse complète..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de suivi
                  </label>
                  <input
                    type="text"
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: DHL123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.delivery_notes}
                    onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Notes internes sur la livraison..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveEdit}
                    disabled={updating[editingWinner.id]}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {updating[editingWinner.id] ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setEditingWinner(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PrizeDeliveryPage;
